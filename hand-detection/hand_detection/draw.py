"""OpenCV drawing helpers for detected hands."""
from __future__ import annotations

from typing import Iterable, Optional, Tuple, Union

import cv2
import numpy as np

from .detector import FINGERS, HAND_CONNECTIONS, DetectionResult, Hand

# BGR colour per finger; palm edges are white
FINGER_COLORS = {
    "thumb": (60, 180, 255),
    "index": (60, 220, 60),
    "middle": (255, 200, 40),
    "ring": (255, 80, 200),
    "pinky": (80, 80, 255),
}
_PALM = (230, 230, 230)


def _edge_color(a: int, b: int) -> Tuple[int, int, int]:
    for name, joints in FINGERS.items():
        if b in joints and (a in joints or a == 0):
            return FINGER_COLORS[name]
    return _PALM


def _point_color(i: int) -> Tuple[int, int, int]:
    for name, joints in FINGERS.items():
        if i in joints:
            return FINGER_COLORS[name]
    return _PALM


def draw_hand(frame: np.ndarray, hand: Hand, thickness: Optional[int] = None, draw_bbox: bool = True,
              draw_label: bool = True) -> np.ndarray:
    """Draw one hand's skeleton, landmarks, box and label onto ``frame`` (in place)."""
    p = hand.landmarks_px
    if thickness is None:
        thickness = max(1, int(round(hand.palm_size() / 40)))
    pts = [tuple(int(round(v)) for v in q) for q in p]
    for a, b in HAND_CONNECTIONS:
        cv2.line(frame, pts[a], pts[b], _edge_color(a, b), thickness, cv2.LINE_AA)
    r = thickness + 1
    for i, q in enumerate(pts):
        cv2.circle(frame, q, r + (1 if i in (4, 8, 12, 16, 20) else 0), _point_color(i), -1, cv2.LINE_AA)
        cv2.circle(frame, q, r + (1 if i in (4, 8, 12, 16, 20) else 0), (20, 20, 20), 1, cv2.LINE_AA)
    if draw_bbox or draw_label:
        x0, y0, x1, y1 = hand.bbox(pad=0.08).as_int()
        if draw_bbox:
            cv2.rectangle(frame, (x0, y0), (x1, y1), (200, 200, 200), 1, cv2.LINE_AA)
        if draw_label:
            text = f"{hand.handedness} {hand.score:.2f}" + (" (m)" if hand.mirror_retry else "")
            draw_text(frame, text, (x0, max(14, y0 - 6)))
    return frame


def draw_hands(frame: np.ndarray, hands: Union[DetectionResult, Iterable[Hand]], **kwargs) -> np.ndarray:
    """Draw all hands of a :class:`DetectionResult` (or a list of :class:`Hand`) in place."""
    for hand in hands:
        draw_hand(frame, hand, **kwargs)
    return frame


def draw_text(frame: np.ndarray, text: str, org: Tuple[int, int], scale: float = 0.5,
              color: Tuple[int, int, int] = (255, 255, 255)) -> np.ndarray:
    """Text with a dark outline so it stays readable on any background."""
    cv2.putText(frame, text, org, cv2.FONT_HERSHEY_SIMPLEX, scale, (0, 0, 0), 3, cv2.LINE_AA)
    cv2.putText(frame, text, org, cv2.FONT_HERSHEY_SIMPLEX, scale, color, 1, cv2.LINE_AA)
    return frame


def draw_fps(frame: np.ndarray, fps: float, ms: Optional[float] = None) -> np.ndarray:
    text = f"{fps:5.1f} FPS" + (f"  {ms:4.1f} ms" if ms is not None else "")
    return draw_text(frame, text, (10, 24), 0.6, (0, 255, 255))
