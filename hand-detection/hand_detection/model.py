"""Locate or download the MediaPipe hand landmarker model (Apache-2.0)."""
from __future__ import annotations

import hashlib
import os
import sys
import tempfile
import urllib.request
from typing import Optional

MODEL_URL = ("https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
             "hand_landmarker/float16/1/hand_landmarker.task")
MODEL_SHA256 = "fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1"
MODEL_NAME = "hand_landmarker.task"


def cache_dir() -> str:
    """Model cache directory. Override with the HAND_DETECTION_CACHE environment variable."""
    env = os.environ.get("HAND_DETECTION_CACHE")
    if env:
        return env
    if sys.platform == "win32":
        base = os.environ.get("LOCALAPPDATA") or os.path.expanduser("~")
        return os.path.join(base, "hand_detection")
    base = os.environ.get("XDG_CACHE_HOME") or os.path.join(os.path.expanduser("~"), ".cache")
    return os.path.join(base, "hand_detection")


def _sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def ensure_model(path: Optional[str] = None, verbose: bool = True) -> str:
    """Return a path to hand_landmarker.task.

    If ``path`` is given it must exist. Otherwise the official model is downloaded once into
    :func:`cache_dir` and verified against a pinned SHA-256.
    """
    if path is not None:
        if not os.path.isfile(path):
            raise FileNotFoundError(f"model not found: {path}")
        return path
    d = cache_dir()
    target = os.path.join(d, MODEL_NAME)
    if os.path.isfile(target):
        return target
    os.makedirs(d, exist_ok=True)
    if verbose:
        print(f"[hand_detection] downloading {MODEL_URL} -> {target}", file=sys.stderr)
    fd, tmp = tempfile.mkstemp(dir=d, suffix=".part")
    try:
        with os.fdopen(fd, "wb") as out, urllib.request.urlopen(MODEL_URL, timeout=60) as r:
            while True:
                chunk = r.read(1 << 16)
                if not chunk:
                    break
                out.write(chunk)
        digest = _sha256(tmp)
        if digest != MODEL_SHA256:
            raise RuntimeError(f"model checksum mismatch ({digest}); refusing to use it")
        os.replace(tmp, target)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)
    return target
