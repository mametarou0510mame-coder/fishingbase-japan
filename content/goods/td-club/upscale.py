# オーナーのデザイン画像（約1000px）を印刷用に大きくする。
#   python3 content/goods/td-club/upscale.py <入力.jpg> <出力の名前>
# 1) 4倍に拡大してノイズをならす  2) 黒（ロゴ・文字・輪郭）は形を取り直してくっきりさせる
# 3) 外側の白い背景だけ透明に（魚のまわりの白いふちは残す）  4) 濃い服用に黒→白の版も作る
import os, sys
import cv2
import numpy as np

src, name = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "owner")
os.makedirs(OUT, exist_ok=True)
S = 4
img = cv2.imread(src)
h, w = img.shape[:2]
big = cv2.resize(img, (w * S, h * S), interpolation=cv2.INTER_LANCZOS4)
big = cv2.bilateralFilter(big, 9, 30, 7)
big = cv2.bilateralFilter(big, 9, 30, 7)
# 少しだけ輪郭を立てる
blur = cv2.GaussianBlur(big, (0, 0), 3)
big = cv2.addWeighted(big, 1.35, blur, -0.35, 0)

gray = cv2.cvtColor(big, cv2.COLOR_BGR2GRAY)
# 黒の部分：ぼかしてからしきい値で取り直すと、ギザギザが消えてなめらかになる
g2 = cv2.GaussianBlur(gray, (0, 0), 2.2)
ink = (g2 < 70).astype(np.uint8)
ink_s = cv2.GaussianBlur(ink.astype(np.float32), (0, 0), 1.6)
ink_a = np.clip((ink_s - 0.5) * 3 + 0.5, 0, 1)  # なめらかな縁
# 外側の背景：白で、画像のふちにつながっている所。中身から少し離れた所だけ
white = (g2 > 232).astype(np.uint8)
content = (1 - white).astype(np.uint8)
near = cv2.dilate(content, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * 9 * S + 1, 2 * 9 * S + 1)))
ff = white.copy()
mask = np.zeros((h * S + 2, w * S + 2), np.uint8)
for x, y in [(0, 0), (w * S - 1, 0), (0, h * S - 1), (w * S - 1, h * S - 1)]:
    if ff[y, x] == 1:
        cv2.floodFill(ff, mask, (x, y), 2)
outside = (ff == 2)
bg = outside & (near == 0)
# 白いふちは「中身のまわり 9px」だけ残す：外側の白のうち near の中は白いふち
alpha = np.where(bg, 0, 255).astype(np.float32)
alpha = cv2.GaussianBlur(alpha, (0, 0), 1.2)


def save(bgr, a, fn):
    rgba = np.dstack([bgr, np.clip(a, 0, 255).astype(np.uint8)])
    cv2.imwrite(os.path.join(OUT, fn), rgba)


# 明るい服用（黒いロゴ）
light = big.astype(np.float32)
light = light * (1 - ink_a[..., None]) + 17 * ink_a[..., None]
# ふちの外側の白は消す（ふちの白は残すが、白いふちはロゴのまわりでは要らない → 魚のまわり以外の白も透明に）
LIGHT = light
# 濃い服用：黒→白にして、白い背景（ふち以外）を透明に
# 濃い服では、ロゴ・文字のまわりの白は不要：外側の白（ふち含む）を透明にし、魚のふちは残す
outside_all = outside.astype(np.float32)
# 魚の範囲：白くない部分のつながり（白いふちでロゴと分かれている）のうち、中間の色をいちばん多く含むもの
# 純粋な黒（ロゴ・糸・輪郭）は除いて、色のある部分だけでつながりを見る
nonwhite = ((g2 <= 232) & (cv2.GaussianBlur(gray, (0, 0), 3) > int(os.environ.get("FISHMIN", "42")))).astype(np.uint8)
nonwhite = cv2.morphologyEx(nonwhite, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
n_, lab_ = cv2.connectedComponents(nonwhite, connectivity=4)
mid = ((gray > 60) & (gray < 220)).astype(np.int64)
cnt = np.bincount(lab_.ravel(), weights=mid.ravel(), minlength=n_)
cnt[0] = 0
fid = int(cnt.argmax())
fm = (lab_ == fid).astype(np.uint8)
# 穴埋め：魚の中の白（頬・腹の光）は残す
fm = cv2.morphologyEx(fm, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))
cs, _ = cv2.findContours(fm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
fm = np.zeros_like(fm)
cv2.drawContours(fm, cs, -1, 1, -1)
fishnear = cv2.dilate(fm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * 9 * S + 1, 2 * 9 * S + 1)))
a2 = np.where(outside & (fishnear == 0), 0, 255).astype(np.float32)
# ロゴの「内側の白」（Dの穴・文字の穴）も背景と同じ扱い：魚の近く以外の白は透明
a2 = np.where((g2 > 232) & (fishnear == 0), 0, a2)
a2 = cv2.GaussianBlur(a2, (0, 0), 1.2)
# 濃い服用：ロゴ・文字の黒だけ白に（魚の黒い輪郭・暗い色はそのまま。チヌなど暗い魚が白く抜けないように）
fishcore = cv2.dilate(fm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * 5 * S + 1, 2 * 5 * S + 1)))
inkL = ink_a * (fishcore == 0)
dark = big.astype(np.float32) * (1 - inkL[..., None]) + 244 * inkL[..., None]
# 日本語の魚の名前を足す（元の画像に無いもの）
JA = os.environ.get("JA", "")
if JA:
    from PIL import Image, ImageDraw, ImageFont
    def addname(arr, a, col):
        H, W = arr.shape[:2]
        ext = int(H * 0.115)
        rgba = np.dstack([arr.astype(np.uint8)[..., ::-1], np.clip(a, 0, 255).astype(np.uint8)])
        im = Image.new("RGBA", (W, H + ext), (0, 0, 0, 0))
        im.paste(Image.fromarray(rgba, "RGBA"), (0, 0))
        f = ImageFont.truetype("/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc", int(H * 0.092), index=0)
        ImageDraw.Draw(im).text((W // 2, H + ext // 2 - int(H * 0.01)), JA, font=f, fill=col, anchor="mm")
        return im
    addname(LIGHT, a2, (17, 17, 17, 255)).save(os.path.join(OUT, f"{name}-light.png"))
    addname(dark, a2, (244, 244, 244, 255)).save(os.path.join(OUT, f"{name}-dark.png"))
    print("ok", name, "with", JA)
    raise SystemExit
save(LIGHT.astype(np.uint8), a2, f"{name}-light.png")
save(dark.astype(np.uint8), a2, f"{name}-dark.png")
print("ok", name, big.shape[1], "x", big.shape[0])
