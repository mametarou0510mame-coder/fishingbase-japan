# 魚種の名前を消し、TSUREDOKI / ANGLER'S CLUB の文字をサワラの版の文字にそろえる（2026-11-16 オーナー）
#   python3 content/goods/td-club/textswap.py   … owner/<魚>-light.png / -dark.png を書き換え
import os
import numpy as np
from PIL import Image

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "owner")
FISH = ["sawara", "buri", "madai", "aori", "seabass", "chinu"]


def bands(a):
    rows = (a > 40).sum(1) > 0
    out, y = [], len(rows) - 1
    while y >= 0:
        while y >= 0 and not rows[y]:
            y -= 1
        if y < 0:
            break
        b = y
        while y >= 0 and rows[y]:
            y -= 1
        out.append((y + 1, b))
    return out  # 下から順に (上, 下)


def text_bands(a):
    bs = bands(a)
    # 文字の行は高さが画像の 12% 未満。上に大きな絵の帯が来たら止まる
    H = a.shape[0]
    t = []
    for top, bot in bs:
        if bot - top > H * 0.12:
            break
        t.append((top, bot))
    return t  # 下から


def xspan(a, top, bot):
    cols = (a[top:bot + 1] > 40).sum(0) > 0
    xs = np.where(cols)[0]
    return xs[0], xs[-1]


for var in ("light", "dark"):
    src = np.array(Image.open(f"{D}/sawara-{var}.png").convert("RGBA"))
    tb = text_bands(src[..., 3])
    # サワラ：下から ANGLER'S CLUB, TSUREDOKI（魚名があれば、その上の2本）
    tb_sorted = sorted(tb)  # 上から
    ts, ang = tb_sorted[0], tb_sorted[1]
    x0, x1 = xspan(src[..., 3], ts[0], ts[1])
    ax0, ax1 = xspan(src[..., 3], ang[0], ang[1])
    blk = Image.fromarray(src[ts[0]:ang[1] + 1, min(x0, ax0):max(x1, ax1) + 1])
    tsw = x1 - x0  # TSUREDOKI の幅（拡大率の基準）
    tsx0 = x0 - min(x0, ax0)
    for f in FISH:
        im = np.array(Image.open(f"{D}/{f}-{var}.png").convert("RGBA"))
        t = sorted(text_bands(im[..., 3]))  # 上から：TSUREDOKI, ANGLER'S CLUB, (魚名)
        top = t[0][0]
        X0, X1 = xspan(im[..., 3], t[0][0], t[0][1])
        k = (X1 - X0) / tsw
        b2 = blk.resize((int(blk.width * k), int(blk.height * k)), Image.LANCZOS)
        im[top:, :, 3] = 0
        out = Image.fromarray(im)
        H = top + b2.height + int(0.03 * im.shape[0])
        canvas = Image.new("RGBA", (out.width, max(H, top + b2.height + 4)), (0, 0, 0, 0))
        canvas.paste(out.crop((0, 0, out.width, min(out.height, canvas.height))), (0, 0))
        canvas.alpha_composite(b2, (int(X0 - tsx0 * k), top))
        canvas.save(f"{D}/{f}-{var}.png")
        print("ok", f, var, canvas.size, f"k={k:.2f}")
