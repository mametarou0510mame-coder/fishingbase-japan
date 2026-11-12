# 書き出し済みの 3DCG 長尺動画の冒頭（オープニングの章）を Blender の映像に差しかえ、サムネイルも Blender の絵で作る。
# 音声（ナレーション）はそのまま。冒頭のあとは元の映像のまま。
#   python scripts/cg/blender/apply_opening.py <slug> --long in.mp4 --clip open.mp4 --thumb thumb.png \
#          --chapters chapters.txt --out-mp4 out.mp4 --out-jpg out.jpg
# 文字は content/cg/<slug>.json の blender_open（title・sub）と thumb_shot（tag・l1・l2）から。
import argparse, json, os, re, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
FONTS = ["/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc", "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"]
YELLOW = (255, 210, 77)
RED = (224, 69, 43)


def font(size, black=True):
    for f in (FONTS if black else FONTS[::-1]):
        if os.path.exists(f):
            return ImageFont.truetype(f, size, index=0)
    raise SystemExit("Noto Sans CJK がありません")


def shadow_text(img, xy, text, fnt, fill, blur=10, off=(0, 4), alpha=170, anchor="la"):
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(sh)
    d.text((xy[0] + off[0], xy[1] + off[1]), text, font=fnt, fill=(0, 0, 0, alpha), anchor=anchor)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    img.alpha_composite(sh)
    ImageDraw.Draw(img).text(xy, text, font=fnt, fill=fill, anchor=anchor)


def logo(img, right, top, scale=1.0):
    """右上の「ツレドキ 関西」"""
    d = ImageDraw.Draw(img)
    f1 = font(int(34 * scale), black=False)
    f2 = font(int(17 * scale), black=False)
    w2 = d.textlength("関西", font=f2) + 10 * scale
    w1 = d.textlength("ツレドキ", font=f1)
    x2 = right - w2
    x1 = x2 - 8 * scale - w1
    shadow_text(img, (x1, top), "ツレドキ", f1, (255, 255, 255, 255), blur=4, off=(0, 2), alpha=120)
    d = ImageDraw.Draw(img)
    bh = 24 * scale
    by = top + 12 * scale
    d.rectangle([x2, by, x2 + w2, by + bh], outline=(255, 255, 255, 255), width=max(int(2 * scale), 1))
    d.text((x2 + w2 / 2, by + bh / 2), "関西", font=f2, fill=(255, 255, 255, 255), anchor="mm")


def title_png(path, lines, sub):
    """冒頭に重ねる題（1920x1080、透明）。上に暗いぼかしの帯を敷いて読みやすく"""
    W, H = 1920, 1080
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    band = Image.new("L", (W, H), 0)
    bd = ImageDraw.Draw(band)
    for y in range(0, 520):
        bd.line([(0, y), (W, y)], fill=int(120 * (1 - y / 520) ** 1.6))
    img.alpha_composite(Image.merge("RGBA", (Image.new("L", (W, H), 4), Image.new("L", (W, H), 18), Image.new("L", (W, H), 30), band)))
    f = font(108)
    y = 92
    for ln in lines:
        shadow_text(img, (W / 2, y), ln, f, (255, 255, 255, 255), blur=12, off=(0, 5), anchor="ma")
        y += 132
    if sub:
        shadow_text(img, (W / 2, y + 14), sub, font(54, black=False), YELLOW + (255,), blur=8, off=(0, 3), anchor="ma")
    logo(img, W - 48, 36, 1.5)
    img.save(path)


def thumb_jpg(src_png, out, tag, l1, l2):
    """サムネイル 1280x720：左に文字、右に魚（Blender の絵は魚を右寄せで書き出してある）"""
    W, H = 1280, 720
    img = Image.open(src_png).convert("RGBA").resize((W, H), Image.LANCZOS)
    g = Image.new("L", (W, H), 0)
    gd = ImageDraw.Draw(g)
    for x in range(0, 760):
        gd.line([(x, 0), (x, H)], fill=int(150 * (1 - x / 760) ** 1.4))
    img.alpha_composite(Image.merge("RGBA", (Image.new("L", (W, H), 2), Image.new("L", (W, H), 12), Image.new("L", (W, H), 24), g)))
    d = ImageDraw.Draw(img)
    ft = font(40)
    tw = d.textlength(tag, font=ft)
    d.rounded_rectangle([48, 150, 48 + tw + 40, 150 + 62], radius=31, fill=RED + (255,))
    d.text((48 + 20 + tw / 2, 150 + 31), tag, font=ft, fill=(255, 255, 255, 255), anchor="mm")
    size = 128
    while size > 70 and max(d.textlength(l1, font=font(size)), d.textlength(l2, font=font(size))) > 700:
        size -= 4
    shadow_text(img, (44, 236), l1, font(size), (255, 255, 255, 255), blur=12, off=(0, 6), alpha=200)
    shadow_text(img, (44, 236 + size + 26), l2, font(size), YELLOW + (255,), blur=12, off=(0, 6), alpha=200)
    logo(img, W - 32, 26, 1.0)
    img.convert("RGB").save(out, quality=93)


def scene_cut(mp4, near):
    """章の時刻の近くで、映像が切りかわる時刻（場面の境目）を探す"""
    a = max(near - 0.6, 0)
    r = subprocess.run(["ffmpeg", "-hide_banner", "-ss", f"{a:.2f}", "-t", "2.4", "-i", mp4, "-vf", "select='gt(scene,0.25)',showinfo", "-an", "-f", "null", "-"],
                       capture_output=True, text=True)
    ts = [float(m) + a for m in re.findall(r"pts_time:([\d.]+)", r.stderr)]
    return ts[0] if ts else near


LEAD, GAP, TAIL = 0.6, 0.45, 0.9   # render_cg.py と同じ


def open_end(path):
    """render_cg.build と同じ計算で、最初のシーン（オープニング）が終わる時刻"""
    s = json.load(open(path, encoding="utf-8"))["scenes"][0]
    c = LEAD
    for ln in s["lines"]:
        c += ln["dur"] + GAP
    return max(c - GAP + TAIL, s.get("min", 0))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--long", required=True)
    ap.add_argument("--clip", required=True)
    ap.add_argument("--thumb", required=True)
    ap.add_argument("--chapters", required=True)
    ap.add_argument("--out-mp4", required=True)
    ap.add_argument("--out-jpg", required=True)
    ap.add_argument("--timeline", help="cg-video の narration にある timeline.json（冒頭の章の正確な長さを出す）")
    a = ap.parse_args()
    src = json.load(open(f"{ROOT}/content/cg/{a.slug}.json", encoding="utf-8"))
    bo = src["blender_open"]
    th = src.get("thumb_shot", {})
    chap = [l for l in open(a.chapters, encoding="utf-8").read().splitlines() if l.strip()]
    m, s_ = chap[1].split()[0].split(":")
    near = int(m) * 60 + int(s_)
    cut = open_end(a.timeline) if a.timeline else scene_cut(a.long, near)
    clip_len = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.clip], capture_output=True, text=True).stdout)
    if clip_len + 0.02 < cut:
        sys.exit(f"Blender の映像（{clip_len:.2f}秒）が冒頭の章（{cut:.2f}秒）より短い")
    print(f"opening: chapter {near}s, cut {cut:.3f}s, clip {clip_len:.2f}s")
    tmp = os.path.dirname(os.path.abspath(a.out_mp4))
    tp = os.path.join(tmp, "title.png")
    title_png(tp, bo["title"], bo.get("sub", ""))
    fo = max(min(cut * 0.62, cut - 1.5), 2.0)   # 後半（魚が食う所）は文字なしで見せる
    if bo.get("title_until"):
        fo = float(bo["title_until"])   # 場面ごとに、題を消す時刻（食う瞬間より前に）
    fc = (f"[1:v]fps=24,scale=1920:1080:flags=lanczos,trim=0:{cut:.3f},setpts=PTS-STARTPTS,format=yuv420p[c];"
          f"[2:v]format=rgba,fade=in:st=0.3:d=0.5:alpha=1,fade=out:st={fo:.2f}:d=0.6:alpha=1[tt];"
          f"[c][tt]overlay=0:0:shortest=1,format=yuv420p[op];"
          f"[0:v]trim=start={cut:.3f},setpts=PTS-STARTPTS,format=yuv420p[rest];"
          f"[op][rest]concat=n=2:v=1:a=0[v]")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", a.long, "-i", a.clip, "-loop", "1", "-t", f"{cut:.3f}", "-i", tp,
                    "-filter_complex", fc, "-map", "[v]", "-map", "0:a", "-c:a", "copy", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                    "-r", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", a.out_mp4], check=True)
    thumb_jpg(a.thumb, a.out_jpg, th.get("tag", "見える化"), th.get("l1", ""), th.get("l2", ""))
    d0 = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.long], capture_output=True, text=True).stdout.strip()
    d1 = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.out_mp4], capture_output=True, text=True).stdout.strip()
    print(f"duration before {d0} after {d1}")


if __name__ == "__main__":
    main()
