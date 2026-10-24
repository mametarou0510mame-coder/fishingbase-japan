# 風の予報の当たり具合を記録する（data/verify/wind.json）。
#  ・気象庁の3時間ごとの予報（予報区全体の代表、幅つき）と、釣り場の位置の数値予報（ECMWF）を、これから24時間分メモする
#  ・メモしておいた予報と、近くの海に面したアメダスの実測（3時間ごとの時刻の10分平均）を比べ、平均の誤差を出す
# 実測と比べる釣り場は、アメダスがすぐ近くにある所だけにする（地点の違いで差が出ないように）。
import json, math, os, urllib.request
from datetime import datetime, timedelta, timezone

JST = timezone(timedelta(hours=9))
CHECK = {  # 釣り場 → (アメダス, 気象庁の予報区)
    "kobe-airport-shinsui-gogan": ("63517", "280010"),  # 神戸空港
    "sennan-fishing-park-sazan": ("62101", "270000"),  # 関空島
    "wakayama-hokko-umizuri-koen": ("65042", "300010"),  # 和歌山
    "tomogashima": ("65036", "300010"),  # 友ケ島
}
PATH = "data/verify/wind.json"
UA = {"User-Agent": "TsuredokiKansai/0.1 (+https://tsuredoki-kansai.mametarou0510mame.workers.dev/about/)"}


def get_json(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return json.loads(r.read())


def main():
    log = json.load(open(PATH, encoding="utf-8")) if os.path.exists(PATH) else {"pairs": {}, "stats": {}}
    weather = json.load(open("public/data/weather.json", encoding="utf-8"))
    marine = json.load(open("public/data/marine.json", encoding="utf-8"))
    now = datetime.now(JST)
    run = datetime.fromisoformat(marine["run"].replace("Z", "+00:00"))
    # 1) これから24時間の予報をメモ（同じ時刻は新しい予報で上書き＝直前の予報を評価する）
    for slug, (amd, area) in CHECK.items():
        hourly = weather["areas"].get(area, {}).get("hourly", [])
        mp = marine["points"].get(slug, {})
        for h in hourly:
            t = datetime.fromisoformat(h["time"])
            if not (now <= t <= now + timedelta(hours=24)):
                continue
            i = round((t - run).total_seconds() / 10800)
            ws = mp.get("ws", [])[i] if 0 <= i < len(mp.get("ws", [])) else None
            key = f"{slug}|{t.strftime('%Y-%m-%dT%H')}"
            rec = log["pairs"].get(key, {})
            rec.update({"jmaMin": h.get("windMin"), "jmaMax": h.get("windMax"), "jmaDir": h.get("windDir"), "model": ws})
            log["pairs"][key] = rec
    # 2) 過ぎた時刻に実測を入れる
    for key, rec in log["pairs"].items():
        if "obs" in rec:
            continue
        slug, th = key.split("|")
        t = datetime.fromisoformat(th + ":00:00+09:00")
        if t > now - timedelta(minutes=30) or t < now - timedelta(days=2):
            continue
        amd = CHECK.get(slug, (None,))[0]
        blk = t.replace(hour=t.hour // 3 * 3)
        try:
            d = get_json(f"https://www.jma.go.jp/bosai/amedas/data/point/{amd}/{blk.strftime('%Y%m%d_%H')}.json")
            v = d.get(t.strftime("%Y%m%d%H0000"), {}).get("wind")
            if v:
                rec["obs"] = v[0]
        except Exception as e:  # noqa: BLE001
            print(f"[verify] {key}: {e}")
    # 3) 古い記録を消して、誤差をまとめる
    lim = (now - timedelta(days=30)).strftime("%Y-%m-%dT%H")
    log["pairs"] = {k: v for k, v in log["pairs"].items() if k.split("|")[1] >= lim}
    done = [v for v in log["pairs"].values() if v.get("obs") is not None]
    def mae(xs):
        return round(sum(xs) / len(xs), 2) if xs else None
    jma_mid = [abs(((v["jmaMin"] + v["jmaMax"]) / 2) - v["obs"]) for v in done if v.get("jmaMin") is not None and v.get("jmaMax") is not None]
    model = [abs(v["model"] - v["obs"]) for v in done if v.get("model") is not None]
    log["stats"] = {
        "updated": now.isoformat(timespec="minutes"),
        "n": len(done),
        "jmaMidMAE": mae(jma_mid),
        "modelMAE": mae(model),
        "jmaInRange": round(sum(1 for v in done if v.get("jmaMin") is not None and v["jmaMin"] <= v["obs"] <= v["jmaMax"]) / len(done), 2) if done else None,
        "note": "誤差は m/s の平均（気象庁は幅の中央、数値予報は値そのもの）。実測は海に面したアメダスの10分平均",
    }
    os.makedirs(os.path.dirname(PATH), exist_ok=True)
    json.dump(log, open(PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"[verify] {log['stats']}")


if __name__ == "__main__":
    main()
