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
    (r"(\d{1,2}):00", r"\1時"),
    (r"(\d{1,2}):(\d{2})", r"\1時\2分"),
    (r"(\d+(?:\.\d+)?)\s*〜\s*(\d+(?:\.\d+)?)", r"\1から\2"),
    (r"〜", "から"),
    (r"(\d),(\d{3})", r"\1\2"),
    (r"%OFF", "パーセントオフ"),
    (r"PR", "ピーアール"),
    (r"(\d+(?:\.\d+)?)\s*lb", r"\1ポンド"),
    (r"(\d+(?:\.\d+)?)\s*ft", r"\1フィート"),
    (r"(\d+(?:\.\d+)?)\s*g(?![a-zA-Z])", r"\1グラム"),
    (r"(\d+(?:\.\d+)?)\s*cm", r"\1センチ"),
    (r"(\d+(?:\.\d+)?)\s*m/s", r"\1メートル"),
    (r"(\d+(?:\.\d+)?)\s*m(?![a-zA-Z])", r"\1メートル"),
    (r"PE", "ピーイー"),
    (r"FG", "エフジー"),
    (r"&", "アンド"),
    # オーナーから指摘のあった読み（2026-10-25）
    (r"時合い?", "じあい"),
    (r"朝まずめ", "あさまずめ"),
    (r"夕まずめ", "ゆうまずめ"),
    (r"一文字", "いちもんじ"),
    (r"時化", "しけ"),
    (r"根(?:が|掛)かり", "ねがかり"),
    (r"高切れ", "たかぎれ"),
    (r"根魚", "ねざかな"),
    (r"潮汐", "ちょうせき"),
    (r"魚影", "ぎょえい"),
    (r"穂先", "ほさき"),
    (r"水深", "すいしん"),
    (r"大潮", "おおしお"),
    (r"小潮", "こしお"),
    (r"中潮", "なかしお"),
    (r"若潮", "わかしお"),
    (r"長潮", "ながしお"),
    (r"魚探", "ぎょたん"),
    (r"締め", "しめ"),
    (r"竿頭", "さおがしら"),
    (r"楽天市場", "らくてんいちば"),
    (r"釣り人", "つりびと"),
    (r"突堤", "とってい"),
    (r"見え", "みえ"),  # 見える・見えれば・見える化（オーナー指定 2026-10-30）
    (r"反転流", "はんてんりゅう"),
    (r"青物", "あおもの"),
    (r"潮目", "しおめ"),
    (r"撒き餌", "まきえ"),
    (r"8分目", "はちぶんめ"),
    (r"足元", "あしもと"),
    (r"際", "きわ"),
    (r"層", "そう"),
    (r"ツレドキ関西", "ツレドキかんさい"),
    # 第3弾で追加（2026-10-26）
    (r"潮止まり", "しおどまり"),
    (r"目張", "めばる"),
    (r"採捕", "さいほ"),
    (r"印(?!象)", "しるし"),
    (r"渡船", "とせん"),
    (r"海づり公園", "うみづりこうえん"),
    (r"漁業権", "ぎょぎょうけん"),
    # 3DCG 冬の水温（2026-10-30）
    (r"変温動物", "へんおんどうぶつ"),
    (r"深場", "ふかば"),
    (r"浅場", "あさば"),
    (r"海面水温", "かいめんすいおん"),
    (r"輪切り", "わぎり"),
    (r"物かげ", "ものかげ"),
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
    src = sys.argv[1]
    silent = "--silent" in sys.argv
    # ガイド名（content/guides/<slug>.json）か、JSON ファイルのパスを受け付ける
    path = src if src.endswith(".json") else f"content/guides/{src}.json"
    slug = os.path.basename(path)[:-5]
    guide = json.load(open(path, encoding="utf-8"))
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
        {"slug": slug, "title": guide["title"], "sub": guide.get("sub", ""), "no": guide.get("no"), "tag": guide.get("tag"), "voice": None if silent else VOICE_CREDIT, "scenes": scenes},
        open(f"{out_dir}/timeline.json", "w", encoding="utf-8"),
        ensure_ascii=False,
        indent=1,
    )


if __name__ == "__main__":
    main()
