"""Live hand tracking from a webcam. Press q or Esc to quit.

    python examples/webcam.py [--camera 0] [--max-hands 2] [--smooth]
"""
import argparse
import os
import sys
import time

import cv2

try:
    import hand_detection as hd
except ImportError:  # running from a checkout without `pip install -e`
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
    import hand_detection as hd


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--camera", type=int, default=0, help="camera index (default 0)")
    ap.add_argument("--max-hands", type=int, default=2)
    ap.add_argument("--max-side", type=int, default=640, help="processing resolution, long side (0 = full)")
    ap.add_argument("--smooth", action="store_true", help="One-Euro smoothing of landmarks")
    ap.add_argument("--no-mirror-retry", action="store_true")
    ap.add_argument("--no-flip", action="store_true", help="show the raw camera image instead of a mirror view")
    ap.add_argument("--model", default=None, help="path to hand_landmarker.task (default: auto-download)")
    a = ap.parse_args()

    cap = cv2.VideoCapture(a.camera)
    if not cap.isOpened():
        raise SystemExit(f"cannot open camera {a.camera}")

    det = hd.HandDetector(max_hands=a.max_hands, model_path=a.model, max_side=a.max_side,
                          mirror_retry=not a.no_mirror_retry, mirrored_input=not a.no_flip, smooth=a.smooth)
    fps, last = 0.0, time.perf_counter()
    win = "hand-detection (q to quit)"
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if not a.no_flip:
                frame = cv2.flip(frame, 1)          # selfie view; detector told via mirrored_input
            res = det.detect(frame)                 # live: timestamps from a monotonic clock
            hd.draw_hands(frame, res)
            for i, hand in enumerate(res):
                up = [f[0].upper() for f, v in hand.fingers_extended().items() if v]
                info = f"{hand.handedness}: fingers {''.join(up) or '-'}  pinch {hand.pinch_distance():.2f}"
                hd.draw_text(frame, info, (10, 50 + 22 * i))
            now = time.perf_counter()
            fps = 0.9 * fps + 0.1 / max(now - last, 1e-6) if fps else 1.0 / max(now - last, 1e-6)
            last = now
            hd.draw_fps(frame, fps, res.inference_ms)
            cv2.imshow(win, frame)
            if cv2.waitKey(1) & 0xFF in (ord("q"), 27):
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()
        det.close()
    s = det.stats()
    print(f"frames {s['frames']}, hands in {100 * s['detection_rate']:.1f} %, {s['ms_per_frame']:.1f} ms/frame")


if __name__ == "__main__":
    main()
