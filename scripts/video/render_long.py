# YouTube 用の長尺（横 1920x1080）動画を作る。図は render.py のシーンをそのまま使い、
# 左に図、右に字幕と章の一覧を置く。
#   python3 scripts/video/render_long.py <slug> [--stills] [--outdir DIR]
#   入力: build/video/<slug>/timeline.json（narrate.py が作る。台本は content/long/<slug>.json）
#   出力: <outdir>/<slug>.mp4、<slug>.jpg（サムネイル）、<slug>-chapters.txt（YouTube の章の目次）
import json
import math
import os
import subprocess
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
import render as R  # noqa: E402
from render import F, FONT_BLACK, FONT_BOLD, FONT_REG, GLOW, INK, MUTED, NAVY, NAVY2, PANEL, RED, WHITE, alpha, center_text, ease, fit_font, label, logo, wrap  # noqa: E402

W, H, FPS = 1920, 1080, 24
SC = 0.92
PX, PY = 46, (H - int(R.PH * SC)) // 2
RX = PX + int(R.PW * SC) + 50  # 右側の文字エリア
RW = W - RX - 50


def active_line(s, t):
    """シーンの中で、いま読み上げている行の番号"""
    c = R.LEAD
    k = 0
    for i, ln in enumerate(s["lines"]):
        if t >= c - 0.1:
            k = i
        c += ln["dur"] + R.GAP
    return k


# ---------- 長尺用のシーン ----------
def scene_chapter(d, t, dur, s, meta):
    d.rounded_rectangle([0, 0, R.PW, R.PH], radius=36, fill=NAVY2)
    for k in range(3):
        y = 800 + k * 50
        pts = [(x, y + 14 * math.sin(x / 130 + t * 1.5 + k)) for x in range(0, R.PW + 1, 8)]
        d.polygon(pts + [(R.PW, R.PH), (0, R.PH)], fill=(20 + k * 6, 60 + k * 12, 104 + k * 16))
    a = ease(t / 0.6)
    fb = F(FONT_BOLD, 44)
    center_text(d, R.PW / 2, 120, f"第{s['no']}章", fb, alpha(GLOW, a))
    ft = fit_font(d, s["title"], FONT_BLACK, [84, 76, 68, 60, 52], R.PW - 100)
    lines = wrap(d, s["title"], ft, R.PW - 100)
    for i, ln in enumerate(lines[:2]):
        center_text(d, R.PW / 2, 200 + i * (ft.size + 18), ln, ft, alpha(WHITE, a))
    fi = F(FONT_BOLD, 38)
    y = 470
    for i, it in enumerate(s.get("items", [])[:5]):
        b = ease((t - 0.6 - i * 0.35) / 0.4)
        if b <= 0:
            continue
        d.ellipse([110, y + 10, 130, y + 30], fill=alpha(GLOW, b))
        fi2 = fit_font(d, it, FONT_BOLD, [38, 34, 30, 26], R.PW - 190)
        d.text((150, y), it, font=fi2, fill=alpha(WHITE, b))
        y += 62


def scene_steps(d, t, dur, s, meta):
    R.heading(d, s.get("heading", "手順"))
    steps = s["steps"]
    off = s.get("sync_offset", 0)
    k = active_line(s, t) - off
    fs = F(FONT_BOLD, 40)
    fn = F(FONT_BLACK, 40)
    y = 160
    rh = min(150, (R.PH - 190) / max(len(steps), 1))
    for i, st in enumerate(steps):
        on = i == k
        done = i < k
        fill = (255, 244, 214) if on else (WHITE if not done else (232, 238, 244))
        d.rounded_rectangle([30, y, R.PW - 30, y + rh - 18], radius=20, fill=fill, outline=GLOW if on else (205, 216, 228), width=5 if on else 2)
        d.ellipse([52, y + (rh - 18) / 2 - 30, 112, y + (rh - 18) / 2 + 30], fill=RED if on else (NAVY if not done else MUTED))
        center_text(d, 82, y + (rh - 18) / 2 - 24, str(i + 1), fn, WHITE)
        f2, ls = R.fit_lines(d, st, FONT_BOLD, [40, 36, 32], R.PW - 200)
        ty = y + (rh - 18) / 2 - len(ls) * (f2.size + 8) / 2
        for j, ln in enumerate(ls):
            d.text((140, ty + j * (f2.size + 8)), ln, font=f2, fill=INK if not done else (110, 120, 130))
        y += rh


R.SCENES["chapter"] = scene_chapter
R.SCENES["steps"] = scene_steps


# ---------- 画面の組み立て ----------
def build_timeline(tl):
    timeline, total = R.build_timeline(tl)
    for item in timeline:
        s = item["scene"]
        if s.get("sync"):
            off = s.get("sync_offset", 0)
            s["appear"] = [c0 - item["start"] for c0, _, _ in item["cues"]][off:]
        if s["type"] == "chapter":
            item["end"] = max(item["end"], item["start"] + 4.0)
    # 章の目印をそろえ直す（シーンの長さが変わった分）
    t = 0.0
    for item in timeline:
        d = item["end"] - item["start"]
        shift = t - item["start"]
        item["start"] += shift
        item["end"] += shift
        item["cues"] = [(a + shift, b + shift, ln) for a, b, ln in item["cues"]]
        t = item["end"]
    return timeline, t


def base_frame(meta):
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    for i in range(3):
        y = H - 60 + i * 22
        pts = [(x, y + 8 * math.sin(x / 200 + i)) for x in range(0, W + 1, 10)]
        d.line(pts, fill=(30, 76, 122), width=4)
    logo(d, RX, 40, 60)
    fb = F(FONT_BOLD, 28)
    tag = meta.get("tag") or "釣り方ガイド 完全版"
    tw = d.textlength(tag, font=fb)
    d.rounded_rectangle([W - 50 - tw - 28, 56, W - 50, 104], radius=24, outline=WHITE, width=3)
    d.text((W - 50 - tw - 14, 62), tag, font=fb, fill=WHITE)
    ft = fit_font(d, meta["title"], FONT_BLACK, [46, 42, 38, 34], RW)
    d.text((RX, 130), meta["title"], font=ft, fill=WHITE)
    if meta.get("voice"):
        d.text((RX, H - 52), f"音声合成：{meta['voice']}", font=F(FONT_REG, 22), fill=MUTED)
    return img


def render_frame(meta, timeline, idx, tg, base):
    item = timeline[idx]
    s = item["scene"]
    t = tg - item["start"]
    dur = item["end"] - item["start"]
    img = base.copy()
    layer = Image.new("RGB", (R.PW, R.PH), PANEL)
    ld = ImageDraw.Draw(layer, "RGBA")
    R.SCENES[s["type"]](ld, t, dur, s, meta)
    pw, ph = int(R.PW * SC), int(R.PH * SC)
    layer = layer.resize((pw, ph), Image.BILINEAR)
    mask = Image.new("L", (pw, ph), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, pw, ph], radius=32, fill=255)
    a = ease(t / 0.35)
    if a < 1:
        mask = mask.point(lambda v: int(v * a))
    img.paste(layer, (PX, PY), mask)
    d = ImageDraw.Draw(img, "RGBA")
    # いまの章
    chs = meta["chapters"]
    ci = s.get("chapter", 0)
    fc = F(FONT_BOLD, 34)
    d.text((RX, 205), chs[ci]["title"] if ci < len(chs) else "", font=fc, fill=GLOW)
    # 字幕
    cap = None
    for c0, c1, ln in item["cues"]:
        if c0 - 0.15 <= tg <= c1 + R.GAP:
            cap = ln["text"]
    if cap:
        f = F(FONT_BOLD, 46)
        ls = wrap(d, cap, f, RW - 40)[:6]
        d.rounded_rectangle([RX - 10, 280, W - 50, 280 + 40 + 66 * 6], radius=24, fill=(8, 26, 48, 235))
        for i, ln in enumerate(ls):
            d.text((RX + 14, 300 + i * 66), ln, font=f, fill=WHITE)
    # 章の一覧
    fl = F(FONT_BOLD, 26)
    y0 = 760
    start = max(0, min(ci - 2, len(chs) - 6))
    for j, ch in enumerate(chs[start : start + 6]):
        k = start + j
        col = GLOW if k == ci else ((150, 170, 190) if k < ci else WHITE)
        d.text((RX, y0 + j * 40), f"{'▶' if k == ci else '　'} {ch['time']}  {ch['title']}", font=fl, fill=col)
    # 進み具合
    total = timeline[-1]["end"]
    d.rounded_rectangle([RX, H - 80, W - 50, H - 72], radius=4, fill=(40, 86, 132))
    d.rounded_rectangle([RX, H - 80, RX + (W - 50 - RX) * min(1, tg / total), H - 72], radius=4, fill=GLOW)
    return img


def fmt(sec):
    sec = int(sec)
    return f"{sec // 60}:{sec % 60:02d}"


def thumbnail(meta, path):
    img = Image.new("RGB", (1280, 720), NAVY)
    d = ImageDraw.Draw(img)
    for k in range(3):
        y = 520 + k * 50
        pts = [(x, y + 18 * math.sin(x / 160 + k)) for x in range(0, 1281, 8)]
        d.polygon(pts + [(1280, 720), (0, 720)], fill=(24 + k * 8, 84 + k * 18, 132 + k * 18))
    logo(d, 50, 36, 64)
    d.rounded_rectangle([50, 140, 50 + 260, 200], radius=30, fill=RED)
    d.text((72, 146), "完全ガイド", font=F(FONT_BLACK, 40), fill=WHITE)
    ft = fit_font(d, meta["thumb"], FONT_BLACK, [110, 100, 90, 80], 1180)
    for i, ln in enumerate(wrap(d, meta["thumb"], ft, 1180)[:2]):
        d.text((50, 230 + i * (ft.size + 16)), ln, font=ft, fill=WHITE, stroke_width=4, stroke_fill=(8, 26, 48))
    d.text((54, 470), meta.get("thumb_sub", ""), font=F(FONT_BLACK, 52), fill=GLOW, stroke_width=3, stroke_fill=(8, 26, 48))
    img.save(path, quality=90)


def main():
    slug = sys.argv[1]
    stills = "--stills" in sys.argv
    outdir = sys.argv[sys.argv.index("--outdir") + 1] if "--outdir" in sys.argv else "build/long"
    d = f"build/video/{slug}"
    tl = json.load(open(f"{d}/timeline.json", encoding="utf-8"))
    src = json.load(open(f"content/long/{slug}.json", encoding="utf-8"))
    timeline, total = build_timeline(tl)
    # 章の開始時刻
    chapters = []
    for item in timeline:
        ci = item["scene"].get("chapter", 0)
        if len(chapters) <= ci:
            chapters.append({"title": src["chapters"][ci], "time": fmt(item["start"]), "sec": item["start"]})
    meta = {"title": tl["title"], "tag": src.get("tag"), "voice": tl.get("voice"), "chapters": chapters, "thumb": src.get("thumb", tl["title"]), "thumb_sub": src.get("thumb_sub", "")}
    base = base_frame(meta)
    os.makedirs(outdir, exist_ok=True)
    print(f"{slug}: {len(timeline)} scenes, {total / 60:.1f}min")
    if stills:
        os.makedirs(f"{d}/stills", exist_ok=True)
        for i, item in enumerate(timeline):
            tg = item["start"] + (item["end"] - item["start"]) * 0.6
            render_frame(meta, timeline, i, tg, base).save(f"{d}/stills/{i:03d}-{item['scene']['type']}.jpg", quality=75)
        thumbnail(meta, f"{d}/stills/thumb.jpg")
        return
    with open(f"{outdir}/{slug}-chapters.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(f"{c['time']} {c['title']}" for c in chapters) + "\n")
    thumbnail(meta, f"{outdir}/{slug}.jpg")
    audio = f"{d}/narration.wav"
    has_audio = any(ln.get("wav") for s in tl["scenes"] for ln in s["lines"])
    if has_audio:
        R.mix_audio(timeline, total, audio)
    out = f"{outdir}/{slug}.mp4"
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"]
    if has_audio:
        cmd += ["-i", audio, "-c:a", "aac", "-b:a", "96k"]
    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-tune", "animation", "-crf", "28", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-shortest" if has_audio else "-an", out]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    idx = 0
    for fi in range(int(total * FPS)):
        tg = fi / FPS
        while idx < len(timeline) - 1 and tg >= timeline[idx]["end"]:
            idx += 1
        proc.stdin.write(render_frame(meta, timeline, idx, tg, base).tobytes())
    proc.stdin.close()
    proc.wait()
    print(f"wrote {out} ({os.path.getsize(out) / 1e6:.1f}MB, {total / 60:.1f}min)")


if __name__ == "__main__":
    main()
