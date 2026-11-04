# Instagram のインサイトから「いつ出すと見られるか」を調べる（読むだけ。投稿はしない）
#   python scripts/sns/ig_insights.py  → フォロワーがオンラインの時間帯と、投稿ごとのリーチ（投稿した時刻別）を
#   ::notice:: と data/sns/ig-insights.json に書く
import json, os, sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(__file__))
from video_post import clean, http  # noqa: E402

JST = timezone(timedelta(hours=9))
API = "https://graph.facebook.com/v21.0"


def main():
    uid, tok = clean(os.environ.get("IG_USER_ID")), clean(os.environ.get("IG_TOKEN"))
    out = {"at": datetime.now(JST).isoformat(timespec="minutes")}
    try:
        r = http("GET", f"{API}/{uid}/insights?metric=online_followers&period=lifetime&access_token={tok}")
        v = r["data"][0]["values"][-1]["value"]  # キーは UTC の時（0〜23）
        hours = {(int(h) + 9) % 24: n for h, n in v.items()}
        out["online_followers_jst"] = dict(sorted(hours.items()))
        top = sorted(hours.items(), key=lambda kv: -kv[1])[:6]
        print("::notice::フォロワーがオンラインの多い時間（JST）: " + " / ".join(f"{h}時 {n}人" for h, n in top))
    except Exception as e:  # noqa: BLE001
        print(f"::warning::online_followers が取れません: {str(e)[:200]}")
    media, url = [], f"{API}/{uid}/media?fields=id,timestamp,media_type,media_product_type,caption&limit=50&access_token={tok}"
    while url and len(media) < 150:
        r = http("GET", url)
        media += r.get("data", [])
        url = r.get("paging", {}).get("next")
    rows = []
    for m in media:
        try:
            met = "reach,views,saved,shares" if m.get("media_product_type") == "REELS" else "reach,saved,shares"
            ins = http("GET", f"{API}/{m['id']}/insights?metric={met}&access_token={tok}")
            vals = {d["name"]: d["values"][0]["value"] for d in ins.get("data", [])}
        except Exception as e:  # noqa: BLE001
            vals = {"error": str(e)[:80]}
        t = datetime.strptime(m["timestamp"], "%Y-%m-%dT%H:%M:%S%z").astimezone(JST)
        rows.append({"at": t.isoformat(timespec="minutes"), "wd": "月火水木金土日"[t.weekday()], "h": t.hour, "type": m.get("media_product_type"),
                     "cap": (m.get("caption") or "")[:30], **vals})
    out["media"] = rows
    by_h, by_wd = defaultdict(list), defaultdict(list)
    for r in rows:
        if isinstance(r.get("reach"), int):
            by_h[r["h"]].append(r["reach"])
            by_wd[r["wd"]].append(r["reach"])
    avg = lambda xs: round(sum(xs) / len(xs)) if xs else 0  # noqa: E731
    out["reach_by_hour"] = {h: [avg(v), len(v)] for h, v in sorted(by_h.items())}
    out["reach_by_weekday"] = {w: [avg(v), len(v)] for w, v in by_wd.items()}
    print("::notice::投稿した時刻ごとの平均リーチ（件数）: " + " / ".join(f"{h}時 {a}（{n}）" for h, (a, n) in out["reach_by_hour"].items()))
    print("::notice::曜日ごとの平均リーチ（件数）: " + " / ".join(f"{w} {a}（{n}）" for w, (a, n) in out["reach_by_weekday"].items()))
    os.makedirs("data/sns", exist_ok=True)
    json.dump(out, open("data/sns/ig-insights.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
