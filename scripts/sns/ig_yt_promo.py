# YouTube に投稿した長尺動画（完全ガイド）を、Instagram のリールで紹介する。
#  縦長の画面に、長尺動画の冒頭（つかみ）と最初の釣り方の章の一部を入れた約35秒の予告編を作り、
#  「続きはYouTubeで（プロフィールのリンクから）」と案内する。1回に1本、まだ紹介していない動画を順番に。
# 使い方:
#   python scripts/sns/ig_yt_promo.py make <outdir>    予告編を public/sns/ に作る（紹介する動画がなければ何もしない）
#   python scripts/sns/ig_yt_promo.py publish <outdir> Instagram に投稿して、記録を残す
import json, os, re, subprocess, sys
from datetime import datetime, timedelta, timezone

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
import discuss  # noqa: E402
from draw import FONT_BLACK, FONT_BOLD, FONT_REG, GLOW, NAVY, RED, WHITE, font, logo  # noqa: E402
from reels import ig_reel, wait_url, yt_short  # noqa: E402
from video_post import SITE  # noqa: E402

JST = timezone(timedelta(hours=9))
POSTS = "data/sns/long-posts.json"
LOG = "data/sns/ig-yt-promo.json"  # 長尺の投稿記録とは別のファイルにする（同時に書き換えてもぶつからない）
W, H = 1080, 1920
VY = 640  # 動画を置く高さ
VH = 608
SKIP = {"はじめに", "知っておきたいこと", "データで見る"}
TAGS = "#関西釣り #釣り初心者 #大阪湾 #堤防釣り #釣り方 #YouTube #ツレドキ関西"


def sec(t):
    p = [int(x) for x in t.split(":")]
    return p[0] * 60 + p[1] if len(p) == 2 else p[0] * 3600 + p[1] * 60 + p[2]


def wrap(d, text, f, maxw):
    out, cur = [], ""
    for ch in text:
        if d.textlength(cur + ch, font=f) > maxw and cur:
            if ch in "、。）」！？ー":
                cur += ch
                continue
            out.append(cur)
            cur = ch
        else:
            cur += ch
    return out + ([cur] if cur else [])


def frame(src, chapters, total_min, thumb=None):
    """予告編の土台（動画の上下）。thumb を渡すと動画の位置にサムネイルを入れて表紙にする"""
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img, "RGBA")
    for y in range(H):
        k = y / H
        d.line([(0, y), (W, y)], fill=(int(14 + 10 * k), int(40 + 30 * (1 - k)), int(74 + 40 * (1 - k))))
    logo(d, 60, 70, 56)
    f = font(FONT_BLACK, 40)
    lab = "▶ YouTubeで公開中"
    tw = d.textlength(lab, font=f)
    d.rounded_rectangle([W - 60 - tw - 56, 66, W - 60, 136], radius=35, fill=(227, 30, 36))
    d.text((W - 60 - tw - 28, 76), lab, font=f, fill=WHITE)
    title = src.get("thumb") or src["title"].replace("【完全版】", "")
    for size in (96, 88, 80, 72, 64):  # 1行に収まる大きさを優先
        ft = font(FONT_BLACK, size)
        ls = wrap(d, title, ft, W - 120)
        if len(ls) == 1:
            break
    else:
        size = 84
        ft = font(FONT_BLACK, size)
        ls = wrap(d, title, ft, W - 120)
    y = 300 if len(ls) == 1 else 230
    for ln in ls[:2]:
        d.text(((W - d.textlength(ln, font=ft)) / 2, y), ln, font=ft, fill=WHITE, stroke_width=5, stroke_fill=(6, 22, 42))
        y += size * 1.2
    sub = src.get("thumb_sub") or ""
    if sub:
        fs = font(FONT_BOLD, 40)
        d.text(((W - d.textlength(sub, font=fs)) / 2, y + 14), sub, font=fs, fill=GLOW)
    d.rectangle([0, VY - 6, W, VY + VH + 6], fill=(0, 0, 0))
    if thumb is not None:
        img.paste(thumb.convert("RGB").resize((W, VH)), (0, VY))
    # この動画でわかること
    y = VY + VH + 60
    d.text((70, y), f"約{total_min}分の完全ガイド｜この動画でわかること", font=font(FONT_BOLD, 38), fill=GLOW)
    y += 70
    fc = font(FONT_BOLD, 40)
    for c in chapters[:5]:
        d.rounded_rectangle([70, y, W - 70, y + 60], radius=18, fill=(255, 255, 255, 26))
        d.text((96, y + 8), c["time"], font=font(FONT_REG, 34), fill=(190, 214, 232))
        t = c["title"] if len(c["title"]) <= 17 else c["title"][:16] + "…"
        d.text((230, y + 6), t, font=fc, fill=WHITE)
        y += 72
    ft2 = font(FONT_BLACK, 42)
    txt = "続きはYouTubeで ▶ プロフィールのリンクから"
    tw = d.textlength(txt, font=ft2)
    d.rounded_rectangle([(W - tw) / 2 - 36, H - 160, (W + tw) / 2 + 36, H - 76], radius=42, fill=GLOW)
    d.text(((W - tw) / 2, H - 150), txt, font=ft2, fill=NAVY)
    return img


def make(out):
    posts = json.load(open(POSTS, encoding="utf-8")) if os.path.exists(POSTS) else {}
    done = json.load(open(LOG, encoding="utf-8")) if os.path.exists(LOG) else {}
    # 3DCG（cg-*）は専用のショートがあるので除く
    ok = lambda s: not s.startswith("cg-") and os.path.exists(f"content/long/{s}.json")
    # Instagram は出したが YouTube ショートがまだ（上限で止まった等）のものを先に
    redo = [s for s, v in done.items() if ok(s) and not v.get("youtube") and v.get("at", "") >= "2026-10-30"]
    todo = [s for s, v in posts.items() if v.get("youtube") and s not in done and ok(s)]
    if not redo and not todo:
        print("紹介する長尺動画はありません")
        return
    slug = redo[0] if redo else todo[0]
    platforms = ["youtube"] if redo else ["instagram", "youtube"]
    src = json.load(open(f"content/long/{slug}.json", encoding="utf-8"))
    os.makedirs(out, exist_ok=True)
    for f in (f"{slug}.mp4", f"{slug}.jpg", f"{slug}-chapters.txt"):
        with open(f"{out}/{f}", "wb") as fh:
            fh.write(subprocess.check_output(["git", "show", f"origin/long-media:{f}"]))
    chs = []
    for ln in open(f"{out}/{slug}-chapters.txt", encoding="utf-8").read().splitlines():
        m = re.match(r"(\S+)\s+(.+)", ln)
        if m:
            chs.append({"time": m.group(1), "title": m.group(2), "sec": sec(m.group(1))})
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"{out}/{slug}.mp4"]).decode())
    body = [c for c in chs if c["title"] not in SKIP and c["title"] != "まとめ"]
    g0 = body[0]["sec"] if body else 60
    listed = [c for c in chs if c["title"] not in ("はじめに", "まとめ")]
    total_min = round(dur / 60)
    frame(src, listed, total_min).save(f"{out}/bg.png")
    cover = frame(src, listed, total_min, Image.open(f"{out}/{slug}.jpg"))
    os.makedirs("public/sns", exist_ok=True)
    vid = f"yt-{slug[5:]}"
    cover.save(f"public/sns/{vid}.jpg", quality=88)
    # 冒頭（つかみ）7秒 ＋ 最初の釣り方の章 28秒
    # 同じ動画を2回、必要な所だけ読み込む（全体を読むとメモリが足りない）
    fc = (
        f"[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a];[v]scale={W}:{VH},setsar=1[vs];[2:v][vs]overlay=0:{VY}:shortest=1,format=yuv420p[o];"
        f"[a]afade=t=out:st=33.5:d=1.5[ao]"
    )
    mp4 = f"{out}/{slug}.mp4"
    subprocess.check_call(["ffmpeg", "-y", "-loglevel", "error", "-t", "7", "-i", mp4, "-ss", str(g0), "-t", "28", "-i", mp4, "-loop", "1", "-r", "24", "-i", f"{out}/bg.png",
                           "-filter_complex", fc, "-map", "[o]", "-map", "[ao]", "-t", "35", "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
                           "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", f"public/sns/{vid}.mp4"])
    title = src["title"].replace("【完全版】", "")
    cap = [f"【YouTubeで公開】{title}", "", f"約{total_min}分の完全ガイドを公開しました。リールはその予告編です。", "", "▼ この動画でわかること"]
    cap += [f"・{c['title']}" for c in listed[:8]]
    cap += ["", "▶ 続きはYouTubeで", "プロフィールのリンク →「YouTube」から見られます", "（YouTubeで「ツレドキ関西」と検索しても見つかります）"]
    if slug in discuss.LONG:
        cap += discuss.caption(discuss.LONG[slug])
    cap += ["", TAGS]
    # YouTube ショートの説明：フル版へのリンク
    ycap = [f"{title}（約{total_min}分）の予告編です。", "", "▶ フル版はこちら", f"https://youtu.be/{posts[slug]['youtube']}", "", "▼ この動画でわかること"]
    ycap += [f"・{c['title']}" for c in listed[:8]]
    ycap += ["", "▼関西の釣果・潮・今日の釣れる時間", SITE, "", "#釣り #釣り初心者 #関西釣り #堤防釣り #ツレドキ関西"]
    json.dump({"slug": slug, "id": vid, "caption": "\n".join(cap), "yt_title": f"{title}【予告】", "yt_caption": "\n".join(ycap), "platforms": platforms},
              open(f"{out}/post.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(vid)


def publish(out):
    p = json.load(open(f"{out}/post.json", encoding="utf-8"))
    url = f"{SITE}/sns/{p['id']}.mp4"
    if not wait_url(url):
        raise SystemExit(f"動画がサイトに公開されていません: {url}")
    done = json.load(open(LOG, encoding="utf-8")) if os.path.exists(LOG) else {}
    rec = done.get(p["slug"], {})
    failed = False
    if "instagram" in p.get("platforms", ["instagram"]):
        try:
            rec["instagram"] = ig_reel(url, f"{SITE}/sns/{p['id']}.jpg", p["caption"])
            rec["at"] = datetime.now(JST).isoformat(timespec="minutes")
            print(f"::notice::Instagram で YouTube 動画を紹介しました {rec['instagram']}（{p['slug']}）")
        except Exception as e:
            print(f"::error::instagram: {e}")
            failed = True
    if "youtube" in p.get("platforms", []) and p.get("yt_caption"):
        try:
            yt = yt_short(f"public/sns/{p['id']}.mp4", p["yt_title"], p["yt_caption"])
            if yt:
                rec["youtube"] = yt
                print(f"::notice::youtube ok {yt}（{p['slug']}）")
        except Exception as e:
            if "uploadLimitExceeded" in str(e):
                print("::warning::YouTube の投稿上限に達したため、次の回にもう一度投稿します")
            else:
                print(f"::error::youtube: {e}")
                failed = True
    if rec:
        rec.setdefault("at", datetime.now(JST).isoformat(timespec="minutes"))
        done[p["slug"]] = rec
        json.dump(done, open(LOG, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    {"make": make, "publish": publish}[sys.argv[1]](sys.argv[2])
