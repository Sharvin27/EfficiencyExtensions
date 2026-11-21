"""Run hand detection on a video file; write an annotated MP4 and a JSON file of landmarks.

    python examples/video.py input.mp4 [--out out.mp4] [--json out.json] [--start 0] [--duration 10]
"""
import argparse
import json
import os
import sys

import cv2
import numpy as np

try:
    import hand_detection as hd
except ImportError:  # running from a checkout without `pip install -e`
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
    import hand_detection as hd


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("--out", help="annotated video (default: <input>_hands.mp4)")
    ap.add_argument("--json", help="landmarks JSON (default: <input>_hands.json)")
    ap.add_argument("--start", type=float, default=0.0, help="start time in seconds")
    ap.add_argument("--duration", type=float, default=None, help="seconds to process (default: all)")
    ap.add_argument("--max-hands", type=int, default=2)
    ap.add_argument("--max-side", type=int, default=640, help="processing resolution, long side (0 = full)")
    ap.add_argument("--min-conf", type=float, default=0.5, help="detection/presence/tracking confidence")
    ap.add_argument("--smooth", action="store_true", help="One-Euro smoothing of landmarks")
    ap.add_argument("--no-mirror-retry", action="store_true")
    ap.add_argument("--retry-conf", type=float, default=0.3, help="confidence for the mirrored retry")
    ap.add_argument("--mirrored-input", action="store_true", help="the video is a mirrored (selfie) recording")
    ap.add_argument("--model", default=None, help="path to hand_landmarker.task (default: auto-download)")
    a = ap.parse_args()

    stem = os.path.splitext(a.video)[0]
    out_path = a.out or stem + "_hands.mp4"
    json_path = a.json or stem + "_hands.json"

    cap = cv2.VideoCapture(a.video)
    if not cap.isOpened():
        raise SystemExit(f"cannot open {a.video}")
    fps = cap.get(cv2.CAP_PROP_FPS)
    if not fps or fps <= 1 or fps > 240:
        fps = 30.0
    if a.start > 0:
        cap.set(cv2.CAP_PROP_POS_MSEC, a.start * 1000)
    w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    for p in (out_path, json_path):
        os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
    writer = cv2.VideoWriter(out_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
    max_frames = None if a.duration is None else int(round(a.duration * fps))

    det = hd.HandDetector(max_hands=a.max_hands, min_detection_confidence=a.min_conf,
                          min_presence_confidence=a.min_conf, min_tracking_confidence=a.min_conf,
                          model_path=a.model, max_side=a.max_side, mirror_retry=not a.no_mirror_retry,
                          retry_confidence=a.retry_conf,
                          mirrored_input=a.mirrored_input, smooth=a.smooth)
    frames, times = [], []
    i = 0
    with det:
        while max_frames is None or i < max_frames:
            ok, frame = cap.read()
            if not ok:
                break
            t = a.start + i / fps
            res = det.detect(frame, timestamp_ms=t * 1000.0)
            times.append(res.inference_ms)
            frames.append({"frame": i, "t": round(t, 4), **res.to_dict()})
            hd.draw_hands(frame, res)
            hd.draw_text(frame, f"t={t:5.2f}s  hands={len(res)}  {res.inference_ms:4.1f} ms", (10, 24), 0.6)
            writer.write(frame)
            i += 1
        stats = det.stats()
    cap.release()
    writer.release()

    ms = np.array(times) if times else np.zeros(1)
    summary = {
        "video": os.path.abspath(a.video), "fps": fps, "size": [w, h], "start": a.start,
        "frames": stats["frames"], "frames_with_hands": stats["frames_with_hands"],
        "detection_rate": round(stats["detection_rate"], 4),
        "mirror_retry_hits": stats["mirror_retry_hits"],
        "ms_per_frame": {"mean": round(float(ms.mean()), 2), "p50": round(float(np.percentile(ms, 50)), 2),
                         "p95": round(float(np.percentile(ms, 95)), 2)},
        "settings": {"max_hands": a.max_hands, "max_side": a.max_side, "min_conf": a.min_conf,
                     "smooth": a.smooth, "mirror_retry": not a.no_mirror_retry, "retry_conf": a.retry_conf,
                     "mirrored_input": a.mirrored_input},
    }
    with open(json_path, "w") as f:
        json.dump({"summary": summary, "frames": frames}, f)
    print(json.dumps(summary, indent=2))
    print(f"wrote {out_path}\nwrote {json_path}")


if __name__ == "__main__":
    main()
