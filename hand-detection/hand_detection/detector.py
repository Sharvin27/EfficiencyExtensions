"""Hand detection with MediaPipe Tasks HandLandmarker (VIDEO / stream mode).

Optimisations carried over from the guitar tracker this module was extracted from:

* VIDEO running mode, so MediaPipe tracks hands between frames and skips the palm detector
  while tracking holds.
* Frames are downscaled to ``max_side`` before inference. Landmarks come back normalised, so
  they are mapped straight to the original frame's pixels.
* Mirror retry: when the tracker finds no hand, a horizontally flipped copy of the frame is
  tried with a stateless IMAGE-mode landmarker. The palm detector often misses a hand seen
  from the back or edge-on, and the mirrored copy often succeeds.
* Strictly increasing timestamps, generated from a monotonic clock if none are given.
* Optional One-Euro smoothing of landmarks, with hands matched across frames.
"""
from __future__ import annotations

import math
import time
from dataclasses import dataclass, field
from typing import Dict, Iterator, List, Optional, Sequence, Tuple

import cv2
import numpy as np

from .model import ensure_model

# ---------------------------------------------------------------- landmark indices
WRIST = 0
THUMB_CMC, THUMB_MCP, THUMB_IP, THUMB_TIP = 1, 2, 3, 4
INDEX_MCP, INDEX_PIP, INDEX_DIP, INDEX_TIP = 5, 6, 7, 8
MIDDLE_MCP, MIDDLE_PIP, MIDDLE_DIP, MIDDLE_TIP = 9, 10, 11, 12
RING_MCP, RING_PIP, RING_DIP, RING_TIP = 13, 14, 15, 16
PINKY_MCP, PINKY_PIP, PINKY_DIP, PINKY_TIP = 17, 18, 19, 20

FINGER_NAMES = ("thumb", "index", "middle", "ring", "pinky")
#: joint indices of each finger, from base to tip
FINGERS: Dict[str, Tuple[int, int, int, int]] = {
    "thumb": (1, 2, 3, 4),
    "index": (5, 6, 7, 8),
    "middle": (9, 10, 11, 12),
    "ring": (13, 14, 15, 16),
    "pinky": (17, 18, 19, 20),
}
TIP_IDS: Dict[str, int] = {name: j[3] for name, j in FINGERS.items()}

HAND_CONNECTIONS = [(0, 1), (1, 2), (2, 3), (3, 4), (0, 5), (5, 6), (6, 7), (7, 8), (5, 9), (9, 10),
                    (10, 11), (11, 12), (9, 13), (13, 14), (14, 15), (15, 16), (13, 17), (17, 18),
                    (18, 19), (19, 20), (0, 17)]


# ---------------------------------------------------------------- data classes
@dataclass(frozen=True)
class BoundingBox:
    x0: float
    y0: float
    x1: float
    y1: float

    @property
    def width(self) -> float:
        return self.x1 - self.x0

    @property
    def height(self) -> float:
        return self.y1 - self.y0

    @property
    def center(self) -> Tuple[float, float]:
        return (0.5 * (self.x0 + self.x1), 0.5 * (self.y0 + self.y1))

    @property
    def area(self) -> float:
        return max(0.0, self.width) * max(0.0, self.height)

    def as_int(self) -> Tuple[int, int, int, int]:
        return (int(math.floor(self.x0)), int(math.floor(self.y0)), int(math.ceil(self.x1)), int(math.ceil(self.y1)))


@dataclass
class Hand:
    """One detected hand.

    Attributes:
        handedness: ``"Left"`` or ``"Right"``, the person's own hand (see ``mirrored_input``).
        score: handedness classification confidence (0..1).
        landmarks_px: (21, 2) pixel coordinates in the frame passed to ``detect``.
        landmarks_norm: (21, 3) x, y normalised to [0, 1] by frame width/height; z is depth
            relative to the wrist (smaller = closer to the camera), roughly on the x scale.
        landmarks_world: (21, 3) metric 3-D coordinates in metres, origin near the hand centre.
        image_size: (width, height) of the frame.
        mirror_retry: True if the hand was found by the mirrored-frame retry.
    """
    handedness: str
    score: float
    landmarks_px: np.ndarray
    landmarks_norm: np.ndarray
    landmarks_world: np.ndarray
    image_size: Tuple[int, int]
    mirror_retry: bool = False

    # ---- geometry helpers
    def bbox(self, pad: float = 0.0, clip: bool = True) -> BoundingBox:
        """Bounding box of the landmarks. ``pad`` is a fraction of the box size added on each side."""
        p = self.landmarks_px
        x0, y0 = p.min(axis=0)
        x1, y1 = p.max(axis=0)
        dx, dy = pad * (x1 - x0), pad * (y1 - y0)
        x0, y0, x1, y1 = x0 - dx, y0 - dy, x1 + dx, y1 + dy
        if clip:
            w, h = self.image_size
            x0, y0 = max(0.0, x0), max(0.0, y0)
            x1, y1 = min(float(w), x1), min(float(h), y1)
        return BoundingBox(float(x0), float(y0), float(x1), float(y1))

    def palm_size(self) -> float:
        """Wrist to middle-finger MCP distance in pixels (a scale reference for the hand)."""
        return float(np.linalg.norm(self.landmarks_px[WRIST] - self.landmarks_px[MIDDLE_MCP]))

    def tips(self, space: str = "px") -> Dict[str, np.ndarray]:
        """Fingertip coordinates by finger name. ``space``: "px", "norm" or "world"."""
        arr = self._space(space)
        return {name: arr[i] for name, i in TIP_IDS.items()}

    def tip(self, finger: str, space: str = "px") -> np.ndarray:
        return self._space(space)[TIP_IDS[finger]]

    def finger_extended(self, finger: str, straightness: float = 0.8) -> bool:
        """True if the finger is straight, measured in 3-D world coordinates (independent of
        hand rotation and distance to the camera). ``straightness`` is the minimum cosine of
        the bend angle of the finger."""
        w = self.landmarks_world
        a, b, c, d = FINGERS[finger]
        if finger == "thumb":
            v1, v2 = w[c] - w[b], w[d] - w[c]
            # a thumb tucked across the palm points at the pinky base
            away = np.linalg.norm(w[d] - w[PINKY_MCP]) > np.linalg.norm(w[c] - w[PINKY_MCP])
        else:
            v1, v2 = w[b] - w[a], w[d] - w[b]
            away = np.linalg.norm(w[d] - w[WRIST]) > np.linalg.norm(w[b] - w[WRIST])
        n = np.linalg.norm(v1) * np.linalg.norm(v2)
        if n < 1e-9:
            return False
        return bool(away and float(np.dot(v1, v2)) / n >= straightness)

    def fingers_extended(self, straightness: float = 0.8) -> Dict[str, bool]:
        return {f: self.finger_extended(f, straightness) for f in FINGER_NAMES}

    def count_extended(self, straightness: float = 0.8) -> int:
        return sum(self.fingers_extended(straightness).values())

    def pinch_distance(self, finger: str = "index", space: str = "relative") -> float:
        """Distance between the thumb tip and another fingertip.

        ``space``: "relative" (pixels divided by :meth:`palm_size`; scale invariant),
        "px" (pixels) or "world" (metres).
        """
        if space == "relative":
            d = float(np.linalg.norm(self.landmarks_px[THUMB_TIP] - self.landmarks_px[TIP_IDS[finger]]))
            return d / max(self.palm_size(), 1e-6)
        arr = self._space(space)
        return float(np.linalg.norm(arr[THUMB_TIP] - arr[TIP_IDS[finger]]))

    def is_pinching(self, finger: str = "index", threshold: float = 0.3) -> bool:
        return self.pinch_distance(finger, "relative") < threshold

    def _space(self, space: str) -> np.ndarray:
        if space == "px":
            return self.landmarks_px
        if space == "norm":
            return self.landmarks_norm
        if space == "world":
            return self.landmarks_world
        raise ValueError(f"unknown space {space!r} (use 'px', 'norm' or 'world')")

    def to_dict(self, decimals: int = 4) -> dict:
        b = self.bbox()
        return {
            "handedness": self.handedness,
            "score": round(float(self.score), 4),
            "mirror_retry": self.mirror_retry,
            "bbox": [round(b.x0, 1), round(b.y0, 1), round(b.x1, 1), round(b.y1, 1)],
            "landmarks_px": np.round(self.landmarks_px, 1).tolist(),
            "landmarks_norm": np.round(self.landmarks_norm, decimals).tolist(),
            "landmarks_world": np.round(self.landmarks_world, decimals).tolist(),
        }


@dataclass
class DetectionResult:
    hands: List[Hand]
    image_size: Tuple[int, int]
    timestamp_ms: int
    inference_ms: float
    mirror_retry: bool = False   # True if the mirrored retry ran on this frame (found a hand or not)

    def __len__(self) -> int:
        return len(self.hands)

    def __iter__(self) -> Iterator[Hand]:
        return iter(self.hands)

    def get(self, handedness: str) -> Optional[Hand]:
        """First hand with the given label ("Left"/"Right"), or None."""
        for h in self.hands:
            if h.handedness == handedness:
                return h
        return None

    def to_dict(self, decimals: int = 4) -> dict:
        return {"timestamp_ms": self.timestamp_ms, "inference_ms": round(self.inference_ms, 2),
                "hands": [h.to_dict(decimals) for h in self.hands]}


# ---------------------------------------------------------------- smoothing
class OneEuroFilter:
    """One-Euro filter (Casiez et al., 2012) for jittery signals; works on arrays of any shape."""

    def __init__(self, min_cutoff: float = 3.0, beta: float = 0.05, d_cutoff: float = 1.0):
        self.min_cutoff, self.beta, self.d_cutoff = min_cutoff, beta, d_cutoff
        self.reset()

    def reset(self) -> None:
        self.x = None
        self.dx = None
        self.t = None

    @staticmethod
    def _alpha(cutoff, dt):
        r = 2 * math.pi * cutoff * dt
        return r / (r + 1)

    def __call__(self, x: np.ndarray, t: float) -> np.ndarray:
        x = np.asarray(x, dtype=np.float64)
        if self.x is None or x.shape != self.x.shape:
            self.x, self.dx, self.t = x.copy(), np.zeros_like(x), t
            return x
        dt = max(t - self.t, 1e-3)
        ad = self._alpha(self.d_cutoff, dt)
        self.dx = ad * (x - self.x) / dt + (1 - ad) * self.dx
        a = self._alpha(self.min_cutoff + self.beta * np.abs(self.dx), dt)
        self.x = a * x + (1 - a) * self.x
        self.t = t
        return self.x.copy()


class _Track:
    __slots__ = ("filt", "center", "label")

    def __init__(self, filt, center, label):
        self.filt, self.center, self.label = filt, center, label


# ---------------------------------------------------------------- detector
class HandDetector:
    """MediaPipe HandLandmarker wrapper for video streams (webcam or file).

    Args:
        max_hands: maximum number of hands to detect.
        min_detection_confidence: palm detector threshold.
        min_presence_confidence: landmark model hand-presence threshold.
        min_tracking_confidence: threshold for keeping a track between frames (VIDEO mode).
        model_path: path to ``hand_landmarker.task``; None downloads the official model once.
        max_side: downscale frames so their longer side is at most this many pixels before
            inference (None or 0 disables). Results are always in the input frame's pixels.
        mirror_retry: when nothing is found, retry on a horizontally flipped copy.
        retry_confidence: detection/presence threshold for the mirrored retry (the tracker
            used a lower value than the main pass; None = same as the main pass).
        mirrored_input: True if frames are mirrored (selfie view, e.g. a webcam image flipped
            for display). Used so ``Hand.handedness`` names the person's actual hand.
        smooth: apply One-Euro smoothing to landmarks across frames.
        smooth_min_cutoff, smooth_beta: One-Euro parameters (units: normalised coords x 1000).

    Call :meth:`detect` once per frame, in order. Use one detector per stream.
    """

    def __init__(self, max_hands: int = 2, min_detection_confidence: float = 0.5,
                 min_presence_confidence: float = 0.5, min_tracking_confidence: float = 0.5,
                 model_path: Optional[str] = None, max_side: Optional[int] = 640,
                 mirror_retry: bool = True, retry_confidence: Optional[float] = 0.3,
                 mirrored_input: bool = False, smooth: bool = False,
                 smooth_min_cutoff: float = 3.0, smooth_beta: float = 0.05):
        import mediapipe as mp
        from mediapipe.tasks import python as mp_tasks
        from mediapipe.tasks.python import vision

        self._mp = mp
        self._vision = vision
        self._model_path = ensure_model(model_path)
        self.max_hands = max_hands
        self.min_detection_confidence = min_detection_confidence
        self.min_presence_confidence = min_presence_confidence
        self.max_side = max_side or None
        self.mirror_retry = mirror_retry
        self.retry_confidence = retry_confidence
        self.mirrored_input = mirrored_input
        self.smooth = smooth
        self._smooth_params = (smooth_min_cutoff, smooth_beta)

        opts = vision.HandLandmarkerOptions(
            base_options=mp_tasks.BaseOptions(model_asset_path=self._model_path),
            running_mode=vision.RunningMode.VIDEO,
            num_hands=max_hands,
            min_hand_detection_confidence=min_detection_confidence,
            min_hand_presence_confidence=min_presence_confidence,
            min_tracking_confidence=min_tracking_confidence)
        self._video = vision.HandLandmarker.create_from_options(opts)
        self._image = None          # created lazily for the mirror retry
        self._last_ts = -1
        self._t0 = None
        self._tracks: List[_Track] = []
        self.frames = 0
        self.frames_with_hands = 0
        self.retry_hits = 0
        self.total_ms = 0.0

    # ---- lifecycle
    def close(self) -> None:
        for lm in (self._video, self._image):
            if lm is not None:
                lm.close()
        self._video = self._image = None

    def __enter__(self) -> "HandDetector":
        return self

    def __exit__(self, *exc) -> None:
        self.close()

    def reset_smoothing(self) -> None:
        self._tracks = []

    def stats(self) -> dict:
        n = max(self.frames, 1)
        return {"frames": self.frames, "frames_with_hands": self.frames_with_hands,
                "detection_rate": self.frames_with_hands / n, "mirror_retry_hits": self.retry_hits,
                "ms_per_frame": self.total_ms / n}

    # ---- main entry point
    def detect(self, frame: np.ndarray, timestamp_ms: Optional[float] = None, rgb: bool = False) -> DetectionResult:
        """Detect hands in one frame.

        Args:
            frame: HxWx3 uint8 image, BGR (OpenCV) unless ``rgb`` is True.
            timestamp_ms: frame time in milliseconds (e.g. ``frame_index * 1000 / fps`` for a
                file). None uses a monotonic clock, suitable for live cameras. Timestamps are
                forced to be strictly increasing, as MediaPipe requires.
        """
        if self._video is None:
            raise RuntimeError("detector is closed")
        h, w = frame.shape[:2]
        tic = time.perf_counter()
        ts = self._next_ts(timestamp_ms)

        img = frame
        if self.max_side and max(h, w) > self.max_side:
            s = self.max_side / float(max(h, w))
            img = cv2.resize(frame, (max(1, int(round(w * s))), max(1, int(round(h * s)))),
                             interpolation=cv2.INTER_AREA)
        if not rgb:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = np.ascontiguousarray(img)

        mp = self._mp
        res = self._video.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=img), ts)
        flipped = False
        if self.mirror_retry and not res.hand_landmarks:
            if self._image is None:
                self._image = self._create_image_landmarker()
            flipped_img = np.ascontiguousarray(img[:, ::-1])
            res = self._image.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=flipped_img))
            flipped = True

        hands = self._convert(res, flipped, (w, h))
        if self.smooth:
            hands = self._apply_smoothing(hands, ts / 1000.0)

        ms = 1000.0 * (time.perf_counter() - tic)
        self.frames += 1
        self.total_ms += ms
        if hands:
            self.frames_with_hands += 1
            if flipped:
                self.retry_hits += 1
        return DetectionResult(hands, (w, h), ts, ms, flipped)

    __call__ = detect

    # ---- internals
    def _next_ts(self, timestamp_ms: Optional[float]) -> int:
        if timestamp_ms is None:
            now = time.monotonic()
            if self._t0 is None:
                self._t0 = now
            ts = int((now - self._t0) * 1000)
        else:
            ts = int(round(timestamp_ms))
        if ts <= self._last_ts:
            ts = self._last_ts + 1
        self._last_ts = ts
        return ts

    def _create_image_landmarker(self):
        from mediapipe.tasks import python as mp_tasks
        vision = self._vision
        opts = vision.HandLandmarkerOptions(
            base_options=mp_tasks.BaseOptions(model_asset_path=self._model_path),
            running_mode=vision.RunningMode.IMAGE,
            num_hands=self.max_hands,
            min_hand_detection_confidence=self.retry_confidence or self.min_detection_confidence,
            min_hand_presence_confidence=self.retry_confidence or self.min_presence_confidence)
        return vision.HandLandmarker.create_from_options(opts)

    def _convert(self, res, flipped: bool, size: Tuple[int, int]) -> List[Hand]:
        w, h = size
        hands = []
        world_all = getattr(res, "hand_world_landmarks", None) or []
        # MediaPipe labels handedness as if the image were mirrored (selfie view).
        swap = (not self.mirrored_input) != flipped
        for i, lms in enumerate(res.hand_landmarks):
            norm = np.array([[l.x, l.y, l.z] for l in lms], dtype=np.float64)
            world = (np.array([[l.x, l.y, l.z] for l in world_all[i]], dtype=np.float64)
                     if i < len(world_all) else np.zeros((21, 3)))
            if flipped:
                norm[:, 0] = 1.0 - norm[:, 0]
                world[:, 0] = -world[:, 0]
            label, score = "Unknown", 0.0
            if res.handedness and i < len(res.handedness) and res.handedness[i]:
                c = res.handedness[i][0]
                label, score = c.category_name, float(c.score)
                if swap and label in ("Left", "Right"):
                    label = "Right" if label == "Left" else "Left"
            px = norm[:, :2] * (w, h)
            hands.append(Hand(label, score, px, norm, world, (w, h), flipped))
        return hands

    def _apply_smoothing(self, hands: Sequence[Hand], t: float) -> List[Hand]:
        if not hands:
            self._tracks = []
            return list(hands)
        unused = list(self._tracks)
        new_tracks = []
        out = []
        for hd in hands:
            c = hd.landmarks_norm[[WRIST, INDEX_MCP, PINKY_MCP], :2].mean(axis=0)
            best, best_d = None, 0.15            # max centre jump between frames (normalised)
            for tr in unused:
                d = float(np.linalg.norm(tr.center - c))
                if d < best_d and (tr.label == hd.handedness or d < 0.05):
                    best, best_d = tr, d
            if best is None:
                best = _Track(OneEuroFilter(*self._smooth_params), c, hd.handedness)
            else:
                unused.remove(best)
            x = np.hstack([hd.landmarks_norm, hd.landmarks_world]) * 1000.0
            y = best.filt(x, t) / 1000.0
            norm, world = y[:, :3], y[:, 3:]
            best.center, best.label = norm[[WRIST, INDEX_MCP, PINKY_MCP], :2].mean(axis=0), hd.handedness
            new_tracks.append(best)
            out.append(Hand(hd.handedness, hd.score, norm[:, :2] * hd.image_size, norm, world,
                            hd.image_size, hd.mirror_retry))
        self._tracks = new_tracks
        return out
