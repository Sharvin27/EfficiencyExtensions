"""Reusable hand detection built on MediaPipe Tasks HandLandmarker."""
from .detector import (
    FINGER_NAMES,
    FINGERS,
    HAND_CONNECTIONS,
    TIP_IDS,
    BoundingBox,
    DetectionResult,
    Hand,
    HandDetector,
    OneEuroFilter,
)
from .draw import draw_fps, draw_hand, draw_hands, draw_text
from .model import cache_dir, ensure_model

__version__ = "0.1.0"

__all__ = [
    "HandDetector", "Hand", "DetectionResult", "BoundingBox", "OneEuroFilter",
    "FINGER_NAMES", "FINGERS", "TIP_IDS", "HAND_CONNECTIONS",
    "draw_hand", "draw_hands", "draw_text", "draw_fps",
    "ensure_model", "cache_dir", "__version__",
]
