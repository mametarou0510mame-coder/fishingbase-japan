# ナレーションの音声を作る（VOICEVOX エンジン http://127.0.0.1:50021）。
# 使い方: python3 scripts/video/narrate.py <slug> [--silent]
#   出力: build/video/<slug>/line-XX.wav と timeline.json（各セリフの長さ）
#   --silent: エンジンなしで長さだけ見積もる（画面の確認用。音声は入らない）
import json
import os
import re
import sys
import urllib.parse
import urllib.request
import wave

ENGINE = os.environ.get("VOICEVOX_URL", "http://127.0.0.1:50021")
SPEAKER = int(os.environ.get("VOICEVOX_SPEAKER", "3"))  # 3 = ずんだもん（ノーマル）
SPEED = float(os.environ.get("VOICEVOX_SPEED", "1.15"))
VOICE_CREDIT = os.environ.get("VOICEVOX_CREDIT", "VOICEVOX:ずんだもん")

# 読み間違えやすい語の読み（字幕はそのまま、音声だけ置き換える）
READINGS = [
    (r"#7119", "シャープ、ななのいちいちきゅう"),
    (r"118番", "いちいちはちばん"),
    (r"119番", "いちいちきゅうばん"),
    (r"(\d+(?:\.\d+)?)\s*〜\s*(\d+(?:\.\d+)?)", r"\1から\2"),
    (r"(\d+(?:\.\d+)?)\s*lb", r"\1ポンド"),
    (r"(\d+(?:\.\d+)?)\s*ft", r"\1フィート"),
    (r"(\d+(?:\.\d+)?)\s*g(?![a-zA-Z])", r"\1グラム"),
    (r"(\d+(?:\.\d+)?)\s*cm", r"\1センチ"),
    (r"(\d+(?:\.\d+)?)\s*m(?![a-zA-Z])", r"\1メートル"),
    (r"PE", "ピーイー"),
    (r"FG", "エフジー"),
    (r"&", "アンド"),
    (r"青物", "あおもの"),
    (r"潮目", "しおめ"),
    (r"撒き餌", "まきえ"),
    (r"8分目", "はちぶんめ"),
    (r"足元", "あしもと"),
    (r"際", "きわ"),
    (r"層", "そう"),
    (r"ツレドキ関西", "ツレドキかんさい"),
]


def reading(text):
    for pat, rep in READINGS:
        text = re.sub(pat, rep, text)
    return text


def post(path, params, body=None):
    url = f"{ENGINE}{path}?{urllib.parse.urlencode(params)}"
    data = json.dumps(body).encode() if body is not None else b""
    req = urllib.request.Request(url, data=data, method="POST", headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def synth(text, out):
    q = json.loads(post("/audio_query", {"text": reading(text), "speaker": SPEAKER}))
    q["speedScale"] = SPEED
    q["prePhonemeLength"] = 0.05
    q["postPhonemeLength"] = 0.1
    q["outputSamplingRate"] = 24000
    wav = post("/synthesis", {"speaker": SPEAKER}, q)
    with open(out, "wb") as f:
        f.write(wav)
    with wave.open(out) as w:
        return w.getnframes() / w.getframerate()


def main():
    slug = sys.argv[1]
    silent = "--silent" in sys.argv
    guide = json.load(open(f"content/guides/{slug}.json", encoding="utf-8"))
    out_dir = f"build/video/{slug}"
    os.makedirs(out_dir, exist_ok=True)
    scenes = []
    n = 0
    for s in guide["video"]["scenes"]:
        lines = []
        for text in s["lines"]:
            n += 1
            path = f"{out_dir}/line-{n:02d}.wav"
            if silent:
                dur = round(len(reading(text)) * 0.13 / SPEED + 0.3, 2)
                path = None
            else:
                dur = synth(text, path)
            lines.append({"text": text, "wav": path, "dur": dur})
            print(f"{n:02d} {dur:5.2f}s {text}")
        scenes.append({**{k: v for k, v in s.items() if k != "lines"}, "lines": lines})
    json.dump(
        {"slug": slug, "title": guide["title"], "sub": guide.get("sub", ""), "no": guide.get("no"), "voice": None if silent else VOICE_CREDIT, "scenes": scenes},
        open(f"{out_dir}/timeline.json", "w", encoding="utf-8"),
        ensure_ascii=False,
        indent=1,
    )


if __name__ == "__main__":
    main()
