# 動画ごとの音声合成のクレジット（2026-11-03 から 四国めたん。それより前に作った動画は ずんだもん）
import json, os

_L = None


def credit(slug=None):
    global _L
    if _L is None:
        try:
            _L = set(json.load(open(os.path.join(os.path.dirname(__file__), "..", "..", "data", "voice-legacy.json"), encoding="utf-8"))["slugs"])
        except Exception:
            _L = set()
    name = "ずんだもん" if slug and slug in _L else "四国めたん"
    return f"音声合成：VOICEVOX:{name}"
