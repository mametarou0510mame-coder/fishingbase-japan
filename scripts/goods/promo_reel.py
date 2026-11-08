"""グッズ告知のリール（1080x1920）を、場面の画像とナレーションから作る。
  python scripts/goods/promo_reel.py <出力mp4> [--voice]
場面は content/goods/promo/reel-1..5.png、セリフは LINES。"""
import os, subprocess, sys, wave
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "scripts/video"))
out = sys.argv[1]
FPS = 30
LINES = [
    "ツレドキのTシャツが、できました。釣り場で着られて、2,816円です。",
    "デザインは、朝日の水平線と、ぶち曲がる竿、そして跳ねるブリ。",
    "生地は、汗をかいてもさらっと乾く、ドライ素材です。",
    "カラーは、ホワイト、アイスグレー、ブラックの3色。",
    "プロフィールのリンクから、SUZURIで買えます。",
]
SEC = [3.0] * len(LINES)
voice = []
if "--voice" in sys.argv:
    import narrate  # noqa: E402
    for i, ln in enumerate(LINES):
        wp = f"{out}.v{i}.wav"
        SEC[i] = narrate.synth(ln, wp) + 0.6
        voice.append(wp)
tmp = out + ".frames"
os.makedirs(tmp, exist_ok=True)
n = 0
for i, sec in enumerate(SEC):
    sl = Image.open(os.path.join(ROOT, f"content/goods/promo/reel-{i+1}.png")).convert("RGB")
    frames = int(sec * FPS)
    for k in range(frames):
        z = 1.0 + 0.04 * k / frames
        w, h = int(1080 * z), int(1920 * z)
        im = sl.resize((w, h)).crop(((w - 1080) // 2, (h - 1920) // 2, (w - 1080) // 2 + 1080, (h - 1920) // 2 + 1920))
        im.save(f"{tmp}/{n:05d}.jpg", quality=90)
        n += 1
sr = 24000
buf = np.zeros(int(n / FPS * sr), dtype=np.float32)
t0 = 0.0
for i, sec in enumerate(SEC):
    if i < len(voice):
        with wave.open(voice[i]) as w:
            a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)
        st = int((t0 + 0.2) * sr)
        buf[st:st + len(a)] += a[: max(0, len(buf) - st)]
    t0 += int(sec * FPS) / FPS
wav = out + ".wav"
with wave.open(wav, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(np.clip(buf, -32768, 32767).astype(np.int16).tobytes())
try:
    import render_long  # noqa: E402
    render_long.add_ambient(wav)
except Exception as e:  # 波の音がなくても作る
    print("ambient skipped:", e)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", f"{tmp}/%05d.jpg", "-i", wav, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "21", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", out], check=True)
subprocess.run(["rm", "-rf", tmp, wav] + voice)
print(out, n / FPS)
