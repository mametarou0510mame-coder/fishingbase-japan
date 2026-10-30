# 釣り場ごとの波の予報（3時間ごと・約5日先まで）を作り、public/data/marine.json に保存する。
#
# 出典: ECMWF Open Data（IFS 波浪モデル・大気モデル 0.1度格子、CC BY 4.0。商用利用可・出典の表示が必要）
#   https://www.ecmwf.int/en/forecasts/datasets/open-data
# ファイル全体ではなく、索引(.index)を見て必要な要素（有義波高 swh・平均波向 mwd・平均周期 mwp）だけを
# HTTP Range で取得する。陸の格子は値がないため、釣り場から一番近い「海の格子」の値を使う。
# 風（高さ10mの東西・南北成分 10u/10v）は、釣り場の位置そのもので取る（周りの4つの格子から内挿）。
# 気象庁の風の予報は予報区全体の代表（10〜14m/s のような幅）なので、釣り場ごとの風はこちらを使う。
#
# 必要なもの: python3-eccodes, python3-numpy（GitHub Actions では apt で入れる）
import json
import math
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone

import numpy as np
import eccodes

BASE = "https://data.ecmwf.int/forecasts"
PARAMS = ["swh", "mwd", "mwp"]
WIND = ["10u", "10v"]
STEPS = list(range(0, 121, 3))  # 0〜120時間、3時間ごと
UA = {"User-Agent": "TsuredokiKansai/0.1 (+https://tsuredoki-kansai.mametarou0510mame.workers.dev/about/)"}
SEARCH_DEG = 0.35  # 海の格子を探す範囲（度）


def get(url, rng=None, tries=3):
    for i in range(tries):
        try:
            h = dict(UA)
            if rng:
                h["Range"] = f"bytes={rng[0]}-{rng[0] + rng[1] - 1}"
            with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=60) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            if i == tries - 1:
                raise
            print(f"[marine] retry {url}: {e}", file=sys.stderr)
            time.sleep(5)


def run_candidates():
    # 新しい順に、公開済みの可能性がある実行（00z・12z）を並べる。公開は実行の約8時間後
    now = datetime.now(timezone.utc)
    out = []
    t = now.replace(minute=0, second=0, microsecond=0)
    t = t.replace(hour=12 if t.hour >= 12 else 0)
    for _ in range(6):
        out.append(t)
        t -= timedelta(hours=12)
    return out


def file_url(run, step, res, stream="wave"):
    d = run.strftime("%Y%m%d")
    hh = run.strftime("%H")
    stem = f"{d}{hh}0000-{step}h-{stream}-fc"
    if res == "0p1":
        return f"{BASE}/{d}/{hh}z/ifs/0p1/{stream}/{stem}-sfc"
    return f"{BASE}/{d}/{hh}z/ifs/0p25/{stream}/{stem}"


def read_index(url):
    raw = get(url + ".index").decode()
    return {j["param"]: (j["_offset"], j["_length"]) for j in map(json.loads, raw.strip().splitlines())}


def pick_run():
    for run in run_candidates():
        for res in ("0p1", "0p25"):
            try:
                # 最後のステップまで公開済みか確かめる
                read_index(file_url(run, STEPS[-1], res))
                return run, res
            except Exception:  # noqa: BLE001
                continue
    raise SystemExit("[marine] 使える実行が見つかりません")


def decode(buf):
    gid = eccodes.codes_new_from_message(buf)
    try:
        ni = eccodes.codes_get(gid, "Ni")
        nj = eccodes.codes_get(gid, "Nj")
        lat1 = eccodes.codes_get(gid, "latitudeOfFirstGridPointInDegrees")
        lon1 = eccodes.codes_get(gid, "longitudeOfFirstGridPointInDegrees")
        dlat = eccodes.codes_get(gid, "jDirectionIncrementInDegrees")
        dlon = eccodes.codes_get(gid, "iDirectionIncrementInDegrees")
        scan_neg = eccodes.codes_get(gid, "jScansPositively") == 0
        miss = eccodes.codes_get(gid, "missingValue")
        vals = eccodes.codes_get_values(gid).reshape(nj, ni)
    finally:
        eccodes.codes_release(gid)
    vals = np.where(vals == miss, np.nan, vals)
    return {"vals": vals, "lat1": lat1, "lon1": lon1, "dlat": dlat if scan_neg else -dlat, "dlon": dlon, "ni": ni, "nj": nj}


def bilinear(f, lat, lon):
    """格子の値を、釣り場の位置へ内挿する（周りの4点。欠けていれば値のある点の平均）"""
    y = (f["lat1"] - lat) / f["dlat"]
    x = ((lon - f["lon1"]) % 360) / f["dlon"]
    j0, i0 = int(math.floor(y)), int(math.floor(x))
    fy, fx = y - j0, x - i0
    acc = wsum = 0.0
    for dj, wy in ((0, 1 - fy), (1, fy)):
        for di, wx in ((0, 1 - fx), (1, fx)):
            j, i = j0 + dj, (i0 + di) % f["ni"]
            if not (0 <= j < f["nj"]):
                continue
            val = f["vals"][j, i]
            if np.isnan(val):
                continue
            acc += val * wy * wx
            wsum += wy * wx
    return acc / wsum if wsum > 0 else float("nan")


def nearest_sea(field, lat, lon):
    # 釣り場の周り SEARCH_DEG 度の中で、値のある格子のうち一番近いもの
    f = field
    best = None
    n = int(math.ceil(SEARCH_DEG / f["dlon"]))
    j0 = int(round((f["lat1"] - lat) / f["dlat"]))
    i0 = int(round(((lon - f["lon1"]) % 360) / f["dlon"]))
    for dj in range(-n, n + 1):
        for di in range(-n, n + 1):
            j, i = j0 + dj, (i0 + di) % f["ni"]
            if not (0 <= j < f["nj"]):
                continue
            v = f["vals"][j, i]
            if np.isnan(v):
                continue
            glat = f["lat1"] - j * f["dlat"]
            glon = (f["lon1"] + i * f["dlon"] + 180) % 360 - 180
            dkm = math.hypot((glat - lat) * 111.0, (glon - lon) * 111.0 * math.cos(math.radians(lat)))
            if best is None or dkm < best[2]:
                best = (j, i, dkm, glat, glon)
    return best


def main():
    coords = json.load(open("lib/spotCoords.json", encoding="utf-8"))
    # 全国の潮位ポイント（気象庁 潮位表の約240地点）も同じように計算する（キーは "t:地点記号"）
    for st in json.load(open("lib/tideStations.json", encoding="utf-8"))["stations"]:
        if st.get("lat") is not None and st.get("lon") is not None:
            coords["t:" + st["code"]] = {"lat": st["lat"], "lon": st["lon"]}
    run, res = pick_run()
    print(f"[marine] run {run.isoformat()} res {res}")
    grid = {}  # slug -> (j, i, dkm, glat, glon)
    series = {slug: {p: [] for p in PARAMS + ["ws", "wd", "rain"]} for slug in coords}
    tp_prev = None
    for step in STEPS:
        url = file_url(run, step, res)
        idx = read_index(url)
        for p in PARAMS:
            if p not in idx:
                for slug in coords:
                    series[slug][p].append(None)
                continue
            field = decode(get(url + ".grib2", idx[p]))
            for slug, c in coords.items():
                if slug not in grid:
                    grid[slug] = nearest_sea(field, c["lat"], c["lon"])
                g = grid[slug]
                v = None if g is None else field["vals"][g[0], g[1]]
                if v is None or np.isnan(v):
                    series[slug][p].append(None)
                elif p == "swh":
                    series[slug][p].append(round(float(v), 2))
                elif p == "mwp":
                    series[slug][p].append(round(float(v), 1))
                else:
                    series[slug][p].append(int(round(float(v))) % 360)
        # 風：波と同じ海の格子の位置の値
        wurl = file_url(run, step, res, "oper")
        try:
            widx = read_index(wurl)
            u = decode(get(wurl + ".grib2", widx["10u"]))
            v = decode(get(wurl + ".grib2", widx["10v"]))
        except Exception as e:  # noqa: BLE001
            print(f"[marine] wind {step}h: {e}", file=sys.stderr)
            u = v = None
        # 雨：積算降水量（m）の3時間の差 → mm（潮位ポイントだけ）
        try:
            tp = decode(get(wurl + ".grib2", widx["tp"])) if u is not None and "tp" in widx else None
        except Exception as e:  # noqa: BLE001
            print(f"[marine] tp {step}h: {e}", file=sys.stderr)
            tp = None
        for slug, c in coords.items():
            if not slug.startswith("t:"):
                continue
            if tp is None or tp_prev is None:
                series[slug]["rain"].append(None if step else 0.0)
                continue
            a, b = bilinear(tp, c["lat"], c["lon"]), bilinear(tp_prev, c["lat"], c["lon"])
            series[slug]["rain"].append(None if math.isnan(a) or math.isnan(b) else round(max(0.0, (a - b) * 1000), 1))
        tp_prev = tp
        for slug, c in coords.items():
            if u is None:
                series[slug]["ws"].append(None)
                series[slug]["wd"].append(None)
                continue
            uu, vv = bilinear(u, c["lat"], c["lon"]), bilinear(v, c["lat"], c["lon"])
            if math.isnan(uu) or math.isnan(vv):
                series[slug]["ws"].append(None)
                series[slug]["wd"].append(None)
                continue
            series[slug]["ws"].append(round(math.hypot(uu, vv), 1))
            # 風の吹いてくる向き（北=0、時計回り）
            series[slug]["wd"].append(int(round(math.degrees(math.atan2(-uu, -vv)))) % 360)
        print(f"[marine] step {step}h ok")

    points = {}
    tide_points = {}
    for slug, g in grid.items():
        if slug.startswith("t:"):
            # 潮位ポイント：海の格子がなくても風・雨は出す
            tide_points[slug[2:]] = {"distKm": None if g is None else round(g[2], 1), **series[slug]}
            if g is None:
                for p in PARAMS:
                    tide_points[slug[2:]][p] = []
            continue
        if g is None:
            print(f"[marine] {slug}: 近くに海の格子がありません", file=sys.stderr)
            continue
        points[slug] = {"lat": round(g[3], 3), "lon": round(g[4], 3), "distKm": round(g[2], 1), **{k: v for k, v in series[slug].items() if k != "rain"}}
    out = {
        "fetchedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "ECMWF Open Data（IFS 波浪モデル・大気モデル）CC BY 4.0",
        "sourceUrl": "https://www.ecmwf.int/en/forecasts/datasets/open-data",
        "resolution": "0.1度" if res == "0p1" else "0.25度",
        "run": run.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "stepHours": 3,
        "points": points,
    }
    with open("public/data/marine.json", "w", encoding="utf-8") as fp:
        json.dump(out, fp, ensure_ascii=False, separators=(",", ":"))
        fp.write("\n")
    print(f"[marine] saved {len(points)} points")
    # 潮位ポイントは1地点1ファイル（アプリが選んだ地点の分だけ読む）
    import os
    os.makedirs("public/data/marine-tide", exist_ok=True)
    meta = {k: out[k] for k in ("fetchedAt", "source", "sourceUrl", "resolution", "run", "stepHours")}
    for code, ser in tide_points.items():
        with open(f"public/data/marine-tide/{code}.json", "w", encoding="utf-8") as fp:
            json.dump({**meta, "code": code, **ser}, fp, ensure_ascii=False, separators=(",", ":"))
    print(f"[marine] saved {len(tide_points)} tide points")


if __name__ == "__main__":
    main()
