# 3DCG の長尺動画を作る（three.js をヘッドレス Chromium で1コマずつ描いて ffmpeg でつなぐ）。
# 使い方:
#   python3 scripts/video/narrate.py content/cg/<slug>.json [--silent]   … 先にナレーション
#   python3 scripts/cg/render_cg.py <slug> --stills                      … 各シーンの静止画
#   python3 scripts/cg/render_cg.py <slug> --chunk 0/8                   … 8分割の0番目だけ描く（並列用）
#   python3 scripts/cg/render_cg.py <slug> --finish                      … つないで音を付ける
#   python3 scripts/cg/render_cg.py <slug>                               … 全部まとめて
import functools
import http.server
import json
import os
import subprocess
import sys
import threading

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "video"))
FPS = int(os.environ.get("CG_FPS", "24"))
LEAD, GAP, TAIL = 0.6, 0.45, 0.9
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FLAGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]


def build(tl):
    t = 0.0
    out = []
    no = 0
    last_ch = None
    for s in tl["scenes"]:
        cues = []
        c = t + LEAD
        for ln in s["lines"]:
            cues.append((c, c + ln["dur"], ln))
            c += ln["dur"] + GAP
        end = max(c - GAP + TAIL, t + s.get("min", 0))
        if s.get("chapter") and s["chapter"] != last_ch and s["type"] != "summary":
            no += 1
        last_ch = s.get("chapter")
        out.append({"scene": s, "start": t, "end": end, "cues": cues, "no": no})
        t = end
    return out, t


def frame_args(timeline, total, tg, T_offset=0.0):
    idx = 0
    while idx < len(timeline) - 1 and tg >= timeline[idx]["end"]:
        idx += 1
    it = timeline[idx]
    s = it["scene"]
    t = tg - it["start"]
    d = it["end"] - it["start"]
    k, cap = 0, ""
    for i, (c0, c1, ln) in enumerate(it["cues"]):
        if tg >= c0 - 0.05:
            k = i
        if c0 - 0.05 <= tg <= c1 + GAP:
            cap = ln["text"]
    if s.get("nocap"):
        cap = ""
    dim = 0.0
    if idx > 0:
        dim = max(dim, 1 - t / 0.35)
    if idx < len(timeline) - 1:
        dim = max(dim, 1 - (d - t) / 0.25)
    if idx == len(timeline) - 1:
        dim = max(dim, 1 - (d - t) / 1.0)
    extra = {k2: v for k2, v in s.items() if k2 not in ("lines",)}
    return {
        "shot": s["type"], "t": t, "d": d, "s": extra, "k": k, "T": tg + T_offset, "cap": cap,
        "chapter": s.get("chapter") if s["type"] not in ("summary",) else "まとめ",
        "chapterNo": it["no"] if s["type"] != "summary" else "★",
        "progress": tg / total, "dim": max(0.0, min(1.0, dim)),
    }


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

    h = functools.partial(Quiet, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv.server_address[1]


def open_page(pw):
    port = serve()
    b = pw.chromium.launch(args=FLAGS)
    p = b.new_page(viewport={"width": 1920, "height": 1080})
    p.on("pageerror", lambda e: print("pageerror:", e, flush=True))
    p.goto(f"http://127.0.0.1:{port}/scripts/cg/index.html")
    p.wait_for_function("window.frame && window.ready", timeout=120000)
    p.evaluate("window.ready")
    p.evaluate("document.fonts.ready")
    return b, p


def main():
    from playwright.sync_api import sync_playwright

    slug = sys.argv[1]
    d = f"build/video/{slug}"
    tl = json.load(open(f"{d}/timeline.json", encoding="utf-8"))
    timeline, total = build(tl)
    nframes = int(total * FPS)
    print(f"total {total:.1f}s / {nframes} frames", flush=True)
    args = sys.argv[2:]

    if "--thumb" in args:
        with sync_playwright() as pw:
            b, p = open_page(pw)
            p.evaluate("o => window.frame(o)", {"shot": "thumb", "t": 0, "d": 1, "T": 12, "progress": 0})
            p.evaluate("document.querySelector('.logo').style.fontSize='54px'")
            p.screenshot(path=f"{d}/thumb-full.jpg", type="jpeg", quality=95)
            b.close()
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{d}/thumb-full.jpg", "-vf", "scale=1280:720", "-q:v", "2", f"{d}/thumb.jpg"], check=True)
        return

    if "--stills" in args:
        os.makedirs(f"{d}/stills", exist_ok=True)
        with sync_playwright() as pw:
            b, p = open_page(pw)
            for i, it in enumerate(timeline):
                for j, frac in enumerate((0.3, 0.8)):
                    tg = it["start"] + (it["end"] - it["start"]) * frac
                    p.evaluate("o => window.frame(o)", frame_args(timeline, total, tg))
                    p.screenshot(path=f"{d}/stills/{i:02d}{'ab'[j]}-{it['scene']['type']}.jpg", type="jpeg", quality=85)
            b.close()
        return

    chunks = [(0, 1)]
    if "--chunk" in args:
        a, n = args[args.index("--chunk") + 1].split("/")
        chunks = [(int(a), int(n))]
    if "--finish" not in args:
        for ci, cn in chunks:
            f0, f1 = nframes * ci // cn, nframes * (ci + 1) // cn
            if "--range" in args:  # 確認用：秒で範囲を指定（例 0:12）
                a0, a1 = args[args.index("--range") + 1].split(":")
                f0, f1 = int(float(a0) * FPS), int(float(a1) * FPS)
            out = f"{d}/seg-{ci:02d}-of-{cn:02d}.mp4"
            ff = subprocess.Popen(
                ["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg", "-i", "-",
                 "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS), out],
                stdin=subprocess.PIPE,
            )
            with sync_playwright() as pw:
                b, p = open_page(pw)
                for fi in range(f0, f1):
                    p.evaluate("o => window.frame(o)", frame_args(timeline, total, fi / FPS))
                    ff.stdin.write(p.screenshot(type="jpeg", quality=92))
                    if (fi - f0) % 240 == 0:
                        print(f"chunk {ci}: {fi - f0}/{f1 - f0}", flush=True)
                b.close()
            ff.stdin.close()
            ff.wait()
        if "--chunk" in args:
            return
    finish(slug, d, timeline, total)


def finish(slug, d, timeline, total):
    import render
    import render_long

    segs = sorted(f for f in os.listdir(d) if f.startswith("seg-") and f.endswith(".mp4"))
    with open(f"{d}/segs.txt", "w") as f:
        for s in segs:
            f.write(f"file '{os.path.abspath(os.path.join(d, s))}'\n")
    audio = f"{d}/audio.wav"
    tl_old = [{"cues": it["cues"]} for it in timeline]
    render.mix_audio(tl_old, total, audio)
    render_long.add_ambient(audio)
    os.makedirs("build/long", exist_ok=True)
    out = f"build/long/{slug}.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", f"{d}/segs.txt", "-i", audio,
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out],
        check=True,
    )
    chapters = []
    seen = set()
    for it in timeline:
        ch = it["scene"].get("chapter")
        if ch and ch not in seen:
            seen.add(ch)
            m = int(it["start"])
            chapters.append(f"{m // 60}:{m % 60:02d} {ch}")
    json.dump({"slug": slug, "duration": round(total, 1), "chapters": ["0:00 オープニング"] + chapters}, open(f"build/long/{slug}.meta.json", "w"), ensure_ascii=False, indent=1)
    with open(f"build/long/{slug}-chapters.txt", "w") as f:
        f.write("\n".join(["0:00 オープニング"] + chapters) + "\n")
    print("done", out, f"{total:.1f}s")


if __name__ == "__main__":
    main()
