# 長尺動画の「データで見る」用の数字を、サイトの釣果データから作る。
#  season … 過去の公開釣果（岸和田一文字・平磯海づり公園 2020〜2026年）で、月ごとに「その魚が報告された日の割合」
#  tide   … 潮の大きさ（大・中・小）ごとの釣れやすさの倍率（public/data/index.json）
#  spots  … 最近（45日）その魚の釣果が出た釣り場と件数（public/data/catches.json）
import json
from datetime import date, timedelta

HIST = ["kishiwada-ichimonji", "hiraiso-umizuri-koen"]
HIST_NAMES = "岸和田一文字・平磯海づり公園"


def _hist():
    out = {}
    for s in HIST:
        try:
            out[s] = json.load(open(f"data/history/{s}.json", encoding="utf-8")).get("days", {})
        except FileNotFoundError:
            out[s] = {}
    return out


def season(groups):
    """groups: [[魚種名, ...], ...] → 各グループの12か月の割合（0〜1）と、もとになった日数"""
    h = _hist()
    active = [0] * 12
    hit = [[0] * 12 for _ in groups]
    years = set()
    for days in h.values():
        for d, v in days.items():
            if not v.get("s") or not any(not k.startswith(("本日", "悪天候")) for k in v["s"]):
                continue
            m = int(d[5:7]) - 1
            active[m] += 1
            years.add(d[:4])
            for gi, g in enumerate(groups):
                if any(k in v["s"] for k in g):
                    hit[gi][m] += 1
    rates = [[(hit[gi][m] / active[m]) if active[m] else 0 for m in range(12)] for gi in range(len(groups))]
    return {"rates": rates, "days": sum(active), "years": f"{min(years)}〜{max(years)}年" if years else "", "source": HIST_NAMES}


def tide(groups):
    try:
        idx = json.load(open("public/data/index.json", encoding="utf-8"))["spots"]
    except FileNotFoundError:
        return None
    lifts = {"大": [], "中": [], "小": []}
    for sp in idx.values():
        for name in groups[0]:
            t = sp.get("species", {}).get(name, {}).get("tideLift")
            if t:
                for k in lifts:
                    lifts[k].append(t.get(k, 1))
    if not lifts["大"]:
        return None
    return {k: sum(v) / len(v) for k, v in lifts.items()}


def spots(groups, days=45):
    try:
        c = json.load(open("public/data/catches.json", encoding="utf-8"))
        names = {s["slug"]: s["name"] for s in json.load(open("public/data/post-options.json", encoding="utf-8"))["spots"]}
        coords = json.load(open("lib/spotCoords.json", encoding="utf-8"))
    except FileNotFoundError:
        return []
    since = (date.today() - timedelta(days=days)).isoformat()
    names_all = {n for g in groups for n in g}
    cnt = {}
    for r in c["reports"]:
        if r["date"] >= since and r["species"] in names_all and r["spot"] in coords:
            cnt[r["spot"]] = cnt.get(r["spot"], 0) + 1
    out = [{"slug": s, "name": names.get(s, s), "n": n, "lat": coords[s]["lat"], "lon": coords[s]["lon"]} for s, n in sorted(cnt.items(), key=lambda kv: -kv[1])]
    return out[:8]


def month_phrase(rates):
    """「9月から12月。いちばん多いのは10月」のような言い方"""
    mx = max(rates) if rates else 0
    if mx <= 0:
        return None, None
    good = [m for m in range(12) if rates[m] >= mx * 0.55]
    best = rates.index(mx)
    # 続いている月をまとめる（12月→1月もつながる）
    runs, cur = [], [good[0]]
    for m in good[1:]:
        if m == cur[-1] + 1:
            cur.append(m)
        else:
            runs.append(cur)
            cur = [m]
    runs.append(cur)
    if len(runs) > 1 and runs[0][0] == 0 and runs[-1][-1] == 11:
        runs[0] = runs[-1] + runs[0]
        runs.pop()
    txt = "と".join(f"{r[0] + 1}月" if len(r) == 1 else f"{r[0] + 1}月から{r[-1] + 1}月" for r in runs[:2])
    return txt, best + 1
