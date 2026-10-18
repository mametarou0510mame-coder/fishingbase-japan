# サイト共有用の画像（1200x630）を public/og.png に作る
import sys
from PIL import Image, ImageDraw
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from draw import *

W, H = 1200, 630
img = Image.new("RGB", (W, H), NAVY)
d = ImageDraw.Draw(img)
wave_fill(d, W, H, H - 78, 14, NAVY2, period=420, phase=0.0)
wave_fill(d, W, H, H - 44, 10, (40, 96, 150), period=360, phase=1.3)
logo(d, 70, 60, 120)
d.text((80, 260), "今日はどこで、", font=font(FONT_BLACK, 78), fill=WHITE)
d.text((80, 350), "何時に釣る？", font=font(FONT_BLACK, 78), fill=WHITE)
d.text((84, 470), "関西の釣果・潮のねらい目時間・天気・釣り場ルール", font=font(FONT_BOLD, 34), fill=MUTED)
d.ellipse([W - 150, 70, W - 90, 130], fill=GLOW)
img.save(sys.argv[1] if len(sys.argv) > 1 else "public/og.png", optimize=True)
