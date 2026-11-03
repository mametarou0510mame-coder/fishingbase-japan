# VOICEVOX の声の聞きくらべ用サンプルを作る（エンジン http://127.0.0.1:50021）
import json, os, subprocess, sys, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
import narrate  # noqa: E402

TEXT = "海の中を、3DCGで見える化。タチウオは、昼は海底付近、夜になると中層から表層に上がってきます。釣りに行く前に、ツレドキでチェックしてください。"
WANT = ["青山龍星", "玄野武宏", "白上虎太郎", "剣崎雌雄", "四国めたん", "春日部つむぎ", "雨晴はう", "冥鳴ひまり", "九州そら", "No.7", "小夜/SAYO", "WhiteCUL", "ずんだもん"]
sp = json.load(urllib.request.urlopen(f"{narrate.ENGINE}/speakers"))
os.makedirs("out/voices", exist_ok=True)
rows = []
for name in WANT:
    s = next((x for x in sp if x["name"] == name), None)
    if not s:
        print(f"::warning::{name} が見つからない")
        continue
    st = next((x for x in s["styles"] if x["name"] in ("ノーマル", "ふつう", "人間ver.")), s["styles"][0])
    narrate.SPEAKER = st["id"]
    wav = f"out/voices/{len(rows) + 1:02d}-{name.replace('/', '_')}.wav"
    narrate.synth(TEXT, wav)
    rows.append((name, st["name"], st["id"], wav))
    print(f"::notice::{name}（{st['name']}） id={st['id']}")
# 1本にまとめる（声の名前の前に短い無音）
lst = "out/voices/list.txt"
open(lst, "w").write("".join(f"file '{os.path.basename(w)}'\nfile 'gap.wav'\n" for *_, w in rows))
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "1.2", "out/voices/gap.wav"], check=True)
for *_, w in rows:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", w, "-ar", "24000", "-ac", "1", w + ".tmp.wav"], check=True); os.replace(w + ".tmp.wav", w)
json.dump(rows, open("out/voices/index.json", "w"), ensure_ascii=False, indent=1)
