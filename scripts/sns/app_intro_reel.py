# サイト紹介のカルーセル画像から、縦のリール（1080x1920、約22秒）を作る
#   python scripts/sns/app_intro_reel.py <画像のフォルダ> <出力mp4>
import os, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "video"))
from draw import FONT_BLACK, FONT_BOLD, GLOW, NAVY, WHITE, font  # noqa: E402

src, out = sys.argv[1], sys.argv[2]
FPS, SEC = 30, [3.2, 2.8, 3.0, 2.8, 3.4, 2.6, 2.8, 3.0]
files = [f"{i:02d}.jpg" for i in range(1, 9)]
tmp = out + ".frames"
os.makedirs(tmp, exist_ok=True)
fb, fs = font(FONT_BLACK, 64), font(FONT_BOLD, 44)
n = 0
for f, sec in zip(files, SEC):
    sl = Image.open(f"{src}/{f}").convert("RGB")
    for i in range(int(sec * FPS)):
        k = i / (sec * FPS)
        z = 1.0 + 0.035 * k
        w, h = int(1080 * z), int(1350 * z)
        im = Image.new("RGB", (1080, 1920), NAVY)
        d = ImageDraw.Draw(im)
        # 上の題名（どのコマでも何の投稿かわかるように）
        d.rounded_rectangle((40, 70, 1040, 230), radius=30, fill=(10, 34, 62), outline=GLOW, width=5)
        d.text((540, 150), "無料の釣りサイト「ツレドキ」", font=fb, fill=WHITE, anchor="mm")
        im.paste(sl.resize((w, h)).crop(((w - 1080) // 2, (h - 1350) // 2, (w - 1080) // 2 + 1080, (h - 1350) // 2 + 1350)), (0, 285))
        d.text((540, 1745), "プロフィールのリンクから使えます", font=fs, fill=GLOW, anchor="mm")
        im.save(f"{tmp}/{n:05d}.jpg", quality=90)
        n += 1
# 音：小さな波の音
sr = 24000
ln = int(n / FPS * sr)
wav = out + ".wav"
with wave.open(wav, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(np.zeros(ln, dtype=np.int16).tobytes())
import render_long  # noqa: E402
render_long.add_ambient(wav)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", f"{tmp}/%05d.jpg", "-i", wav, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "21", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", out], check=True)
subprocess.run(["rm", "-rf", tmp, wav])
print(out, n / FPS)
