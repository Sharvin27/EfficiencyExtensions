# hand-detection

A small, reusable Python package for real-time hand landmark detection in video streams (webcam or file). It wraps the [MediaPipe Tasks](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) `HandLandmarker` and adds the optimisations from a guitar-tracking project it was extracted from. There is no guitar-specific logic in it.

- **Stream (VIDEO) mode**: MediaPipe tracks hands between frames and skips the palm detector while tracking holds. It uses the current Tasks API, not the deprecated `mp.solutions`.
- **Downscaled processing**: frames are shrunk to `max_side` (default 640 px) before inference. Results are always returned in the original frame's pixels.
- **Mirror retry**: when no hand is found, a horizontally flipped copy is tried with a stateless detector at a lower threshold. This recovers hands the palm detector misses, such as hands seen from the back or edge-on.
- **Timestamps** are kept strictly increasing, and come from a monotonic clock when you don't pass any.
- **Optional One-Euro smoothing** of landmarks, with hands matched across frames.
- **Model download**: the official `hand_landmarker.task` (Apache-2.0) is downloaded on first use and checked against a pinned SHA-256.
- **Typed results**: dataclasses with handedness, score, 21 landmarks (pixels, normalised and metric world coordinates), a bounding box, fingertips, finger-extended tests and pinch distance.

## Install

```
pip install -e hand-detection
```

This needs Python 3.9 or newer. The dependencies are `mediapipe`, `opencv-python` and `numpy`.

The model is cached in `%LOCALAPPDATA%\hand_detection` on Windows and `~/.cache/hand_detection` elsewhere. Set `HAND_DETECTION_CACHE` to override the location, or pass `model_path=` to use a local file.

## Usage

```python
import cv2
from hand_detection import HandDetector, draw_hands

cap = cv2.VideoCapture(0)
with HandDetector(max_hands=2, smooth=True) as detector:
    ok, frame = cap.read()
    while ok:
        result = detector.detect(frame)            # pass timestamp_ms=... for video files
        for hand in result:
            print(hand.handedness, hand.tip("index"), hand.fingers_extended(), hand.pinch_distance())
        cv2.imshow("hands", draw_hands(frame, result))
        if cv2.waitKey(1) == ord("q"):
            break
        ok, frame = cap.read()
```

### API summary

`HandDetector(max_hands=2, min_detection_confidence=0.5, min_presence_confidence=0.5, min_tracking_confidence=0.5, model_path=None, max_side=640, mirror_retry=True, retry_confidence=0.3, mirrored_input=False, smooth=False)`

- `detect(frame, timestamp_ms=None, rgb=False) -> DetectionResult`: call once per frame, in order. For files, pass `frame_index * 1000 / fps`. Use one detector per stream.
- `stats()` returns the frames processed, detection rate, mirror-retry hits and mean ms per frame.
- Set `mirrored_input=True` if you flip webcam frames into a selfie view before detection. Handedness then still names the person's real hand.

`DetectionResult` has the fields `hands`, `image_size`, `timestamp_ms`, `inference_ms` and `mirror_retry`. It also supports `len()`, iteration, `get("Left")` and `to_dict()`.

`Hand` has these fields:
- `handedness` (`"Left"` or `"Right"`) and `score`
- `landmarks_px` (21×2)
- `landmarks_norm` (21×3; x and y in 0..1, z relative depth)
- `landmarks_world` (21×3, metres)
- `mirror_retry`

It has these methods:
- `bbox(pad=0)`
- `tips(space="px"|"norm"|"world")` and `tip("index")`
- `finger_extended("thumb"|"index"|"middle"|"ring"|"pinky")`, `fingers_extended()` and `count_extended()`. These are measured in 3-D world coordinates, so they don't depend on hand rotation or distance.
- `pinch_distance(finger="index", space="relative"|"px"|"world")` and `is_pinching()`
- `palm_size()` and `to_dict()`

Landmark indices follow MediaPipe: 0 is the wrist, 4/8/12/16/20 are the fingertips. They are exported as `FINGERS`, `TIP_IDS` and `HAND_CONNECTIONS`.

`hand_detection.draw` provides `draw_hands`, `draw_hand`, `draw_text` and `draw_fps`, which draw the skeleton coloured per finger, plus the box and label.

## Examples

```
python hand-detection/examples/webcam.py --camera 0 [--smooth] [--max-hands 1]
python hand-detection/examples/video.py clip.mp4 --duration 10 [--out clip_hands.mp4] [--json clip_hands.json]
```

`video.py` writes an annotated MP4 and a JSON file with per-frame landmarks. It also prints a summary with the detection rate and ms/frame (mean, p50, p95).

## Performance

Test setup:
- Machine: Intel i5-11300H laptop (4 cores), Windows 11, CPU only, Python 3.10, mediapipe 1.2.3.
- Clip: a 480×848 portrait guitar video at 30 fps; the first 10 s (300 frames).
- The fretting hand is mostly seen from behind, which is a hard case for the palm detector.
- Times are per `detect()` call, including resizing and colour conversion.
- The machine had other background load (about 40% CPU), so expect some noise. Ranges are the spread over repeated runs.

| Settings | Frames with a hand | Median ms/frame |
|---|---|---|
| defaults (confidence 0.5, `max_side=640`, mirror retry at 0.3) | 73.7 % | 25–38 |
| defaults, mirror retry off | 71.3 % | 27–33 |
| all confidences 0.3 (the guitar tracker's setting) | **100 %** | **23–26** |
| all confidences 0.3 + `smooth=True` | 100 % | 23–27 |

| 1080×1920 input (upscaled copy of the clip, 150 frames) | Median ms/frame |
|---|---|
| `max_side=0` (full resolution) | 52–66 |
| `max_side=640` (default) | 32–51 |

Takeaways:
- Frames where MediaPipe is tracking are the cheapest. When tracking is lost, every frame runs the palm detector, plus the mirror retry if it is enabled. This is why the 0.3 setting, which keeps the track, is both more complete and faster on this clip.
- For difficult views (back of the hand, edge-on, hands holding objects), use `min_detection_confidence=min_presence_confidence=min_tracking_confidence=0.3`. The default stays at MediaPipe's 0.5, which gives fewer false positives in general scenes.
- The mirror retry recovered 7 extra frames at 0.5 and 2 at 0.3. It only costs time on frames where no hand was found.
- Downscaling to 640 px saves about 15–20 ms per frame on 1080p input. Below about 480 px, landmark quality and detection start to drop: `max_side=320` gave 71.7 %.
- The cost of smoothing is below the measurement noise.

## Notes and limitations

- The handedness label comes from MediaPipe's classifier, which assumes palm-side views. A hand seen from the back (for example a guitar fretting hand) is often reported as the opposite hand. For anything important, choose hands by position or geometry.
- `score` is the handedness confidence. The Tasks API does not expose a separate presence score.
- Runs on CPU (XNNPACK). MediaPipe's GPU delegate is not available on Windows.

## Credits

- Hand landmark model and inference: [Google MediaPipe](https://github.com/google-ai-edge/mediapipe), Apache License 2.0. The `hand_landmarker.task` model is downloaded from Google's official model storage and is not redistributed here.
- One-Euro filter: Casiez, Roussel and Vogel, "1€ Filter", CHI 2012.
