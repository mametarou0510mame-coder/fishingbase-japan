# 仕上がりイメージ（簡易モック）。python3 content/goods/td-club/mock.py <魚種> <出力>
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

D = "content/goods/td-club/png"
key = sys.argv[1]
out = sys.argv[2]
F = ImageFont.truetype("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc", 34, index=0)


def art(name, w):
    im = Image.open(f"{D}/{name}.png").convert("RGBA")
    return im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)


def shade(dr, poly, col):
    dr.polygon(poly, fill=col)


def tee(col, long=False):
    im = Image.new("RGBA", (800, 900), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    if long:
        shade(dr, [(250, 40), (40, 160), (10, 760), (110, 770), (170, 300), (170, 880), (630, 880), (630, 300), (690, 770), (790, 760), (760, 160), (550, 40)], col)
    else:
        shade(dr, [(250, 40), (20, 150), (90, 330), (170, 290), (170, 880), (630, 880), (630, 290), (710, 330), (780, 150), (550, 40)], col)
    dr.ellipse((300, 0, 500, 110), fill=(0, 0, 0, 0))
    dr.arc((300, 0, 500, 110), 0, 180, fill=(0, 0, 0, 60), width=8)
    return im


def hoodie(col):
    im = Image.new("RGBA", (800, 900), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    shade(dr, [(240, 90), (40, 200), (10, 800), (110, 810), (170, 330), (170, 890), (630, 890), (630, 330), (690, 810), (790, 800), (760, 200), (560, 90)], col)
    dr.ellipse((250, 10, 550, 230), fill=col)
    dr.arc((250, 10, 550, 230), 20, 160, fill=(0, 0, 0, 50), width=6)
    return im


def put(base, a, cx, cy):
    base.alpha_composite(a, (int(cx - a.width / 2), int(cy - a.height / 2)))


def cap(col, mark):
    im = Image.new("RGBA", (800, 600), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    dr.pieslice((100, 60, 700, 660), 180, 360, fill=col)
    dr.rectangle((100, 355, 700, 380), fill=col)
    dr.ellipse((60, 340, 740, 560), fill=tuple(max(0, c - 25) for c in col[:3]) + (255,))
    put(im, mark, 400, 250)
    return im


def sticker(a):
    al = a.split()[3].filter(ImageFilter.MaxFilter(41))
    bg = Image.new("RGBA", a.size, (255, 255, 255, 0))
    bg.putalpha(al)
    sh = Image.new("RGBA", a.size, (0, 0, 0, 0))
    sh.putalpha(al.point(lambda v: v * 0.25).filter(ImageFilter.GaussianBlur(10)))
    im = Image.new("RGBA", (a.width + 40, a.height + 40), (0, 0, 0, 0))
    im.alpha_composite(sh, (26, 30))
    im.alpha_composite(bg, (20, 20))
    im.alpha_composite(a, (20, 20))
    return im


W, H = 3400, 1200
sheet = Image.new("RGBA", (W, H), (236, 235, 231, 255))
dr = ImageDraw.Draw(sheet)
items = []
h = hoodie((242, 240, 234, 255)); put(h, art(f"{key}-color-light", 400), 400, 470); items.append((h, "パーカー（背中）"))
hd = hoodie((30, 36, 46, 255)); put(hd, art(f"{key}-mono-dark", 400), 400, 470); items.append((hd, "パーカー 濃い色・モノクロ"))
t = tee((250, 250, 250, 255)); put(t, art(f"{key}-color-light", 330), 400, 450); items.append((t, "ドライTシャツ（前）"))
lt = tee((200, 204, 208, 255), long=True); put(lt, art(f"{key}-mono-light", 330), 400, 450); items.append((lt, "ロングTシャツ・モノクロ"))
c = cap((246, 244, 238, 255), art(f"{key}-color-light-mark", 300)); items.append((c, "キャップ（前）"))
s = sticker(art(f"{key}-color-light", 330)); items.append((s, "ステッカー"))
x = 40
for im, lab in items:
    k = min(520 / im.width, 900 / im.height)
    im2 = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
    sheet.alpha_composite(im2, (x + (540 - im2.width) // 2, 80 + (950 - im2.height) // 2))
    dr.text((x + 270, 1100), lab, font=F, fill=(30, 30, 30), anchor="mm")
    x += 560
sheet.convert("RGB").save(out, quality=90)
print("ok", out)
