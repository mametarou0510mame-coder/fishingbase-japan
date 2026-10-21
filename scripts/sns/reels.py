# 1日4回のリール動画（Instagram／YouTube）を作って投稿する。
#   06:00 spots   … 今日の釣れる時間（ねらい目）と最近の釣果
#   20:00 tomorrow … 明日の釣れる時間（金曜は weekend）
#   12:00 guide   … 釣り方ガイド（作成済みの動画を順番に）
#   18:00 deals   … 釣り道具のお得情報（楽天市場・PR）
#   00:00 trivia  … 釣りの豆知識
#   金曜20:00 weekend … 週末の釣れる時間
# 使い方:
#   python scripts/sns/reels.py make <slot> <outdir>   動画の台本（JSON）と投稿文を作る
#   python scripts/sns/reels.py publish <outdir>        作った動画を投稿する（動画はサイトに公開済みであること）
import json, os, sys, time, urllib.request
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(__file__))
from video_post import SITE, clean, http, site_lead  # noqa: E402
import discuss  # noqa: E402

JST = timezone(timedelta(hours=9))
WEEK = "月火水木金土日"
LOG = "data/sns/reels-log.json"
CREDIT = "音声合成：VOICEVOX:ずんだもん"
TAGS = "#関西釣り #釣り初心者 #大阪湾 #堤防釣り #海釣り公園 #釣果情報 #ツレドキ関西"
END = {"type": "end", "lines": ["釣れる時間と、近くの釣り場は、ツレドキ関西でチェックしてください。"]}


def now():
    return datetime.now(JST)


def md(date):
    d = datetime.strptime(date, "%Y-%m-%d")
    return f"{d.month}月{d.day}日（{WEEK[d.weekday()]}）"


def load_log():
    try:
        return json.load(open(LOG, encoding="utf-8"))
    except FileNotFoundError:
        return {"posts": []}


def save_log(log):
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with open(LOG, "w", encoding="utf-8") as f:
        json.dump(log, f, ensure_ascii=False, indent=1)
        f.write("\n")


def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "TsuredokiKansai-SNS/0.1"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def short_spot(name):
    return name.split("（")[0].replace("市立", "").replace("臨海公園 ", "")[:12]


# ---------- 06:00 今日の釣れる時間 ----------
def make_spots(day, when="今日"):
    """when=「今日」は朝6時、「明日」は前の日の20時に出す"""
    data = get_json(f"{SITE}/sns/today.json")
    date = day if day in [d["date"] for d in data["dates"]] else data["dates"][0]["date"]
    tide = next((d["tideName"] for d in data["dates"] if d["date"] == date), "")

    def best(s):
        ws = s["days"].get(date, {}).get("windows", [])
        return max(ws, key=lambda w: w["score"]) if ws else None

    ranked = [s for s in data["spots"] if best(s)]
    ranked.sort(key=lambda s: (-best(s)["score"], -s.get("recentReports", 0)))
    top = ranked[:3]
    windy = sum(1 for s in data["spots"] if (s["days"].get(date, {}).get("maxWind") or 0) >= 10)
    rows = [[short_spot(s["name"]), f"{best(s)['grade']} {best(s)['from']}:00〜{best(s)['to']}:00"] for s in top]

    # 最近の釣果（直近の日の、釣り場ごとに一番の釣果）
    cdays = sorted(data["catches"].keys(), reverse=True)
    crow = []
    if cdays:
        seen = {}
        for it in data["catches"][cdays[0]]:
            if "種類不明" in it["species"]:
                continue
            sc = (it["sizeCm"] or 0) * 10 + min(it["count"] or 0, 500)
            if it["spot"] not in seen or sc > seen[it["spot"]][0]:
                seen[it["spot"]] = (sc, it)
        for _, it in sorted(seen.values(), key=lambda x: -x[0])[:4]:
            cnt, size = it["count"] or 0, it["sizeCm"]
            val = f"{cnt}匹" if cnt >= 10 else (f"{size:g}cm" if size else (f"{cnt}匹" if cnt else ""))
            crow.append([short_spot(it["name"]), f"{it['species'].split('（')[0]} {val}".strip()])

    lines1 = [f"{md(date)}は{tide}。{when}の釣れる時間をお知らせします。"]
    if top:
        s0 = top[0]
        lines2 = [f"一番のねらい目は、{short_spot(s0['name'])}の、{best(s0)['from']}:00から{best(s0)['to']}:00です。",
                  "潮の動きと、朝夕のまずめから計算しています。"]
    else:
        lines2 = [f"{when}は、営業時間内に目立つねらい目が少ない日です。"]
    scenes = [{"type": "title", "lines": lines1}]
    if top:
        scenes.append({"type": "pattern", "heading": f"① {when}のねらい目", "rows": rows, "lines": lines2})
    if crow:
        c0 = crow[0]
        scenes.append({"type": "pattern", "heading": f"② 最近の釣果（{md(cdays[0])}）", "rows": crow,
                       "lines": [f"最近の釣果では、{c0[0]}で、{c0[1].replace('匹', 'ひき')}が上がっています。"]})
    caution = [f"{windy}か所で風速10m以上の予報" if windy else "風の予報は各釣り場のページで", "ライフジャケットを着る", "釣り場のルールを確認"]
    scenes.append({"type": "points", "heading": "③ 出かける前に", "items": caution,
                   "lines": [f"{when}は、{windy}か所で強い風の予報です。無理はしないでください。" if windy else "出かける前に、風の予報と釣り場のルールを確認しましょう。"]})
    q = discuss.spots([short_spot(x["name"]) for x in top])
    scenes.append(discuss.scene(q))
    scenes.append(END)
    guide = {"title": f"{when}の釣れる時間", "sub": f"{md(date)}・{tide}", "tag": f"{when}の釣り情報", "video": {"scenes": scenes}}

    cap = [f"【{when}の釣れる時間】{md(date)} {tide}", ""] + (["前の日のうちに、明日の釣行計画にどうぞ。", ""] if when == "明日" else [])
    for i, s in enumerate(top, 1):
        w = best(s)
        cap.append(f"{'①②③'[i - 1]} {s['name']}　{w['grade']}{w['from']}〜{w['to']}時（{'・'.join(w['reasons']) or '総合'}）")
    if crow:
        cap += ["", f"▼最近の釣果（{md(cdays[0])}）"] + [f"・{a}：{b}" for a, b in crow]
    if windy:
        cap += ["", f"⚠ {windy}か所で風速10m以上の予報。無理な釣行は控えましょう"]
    cap += ["", "潮の動き・朝夕のまずめ・営業時間・風の予報（気象庁）から計算した目安です。釣果は各施設・釣具店の発表より。"]
    cap += site_lead("/", "釣り場ごとのタイドグラフ・天気・最近の釣果")
    cap += discuss.caption(q) + [""]
    cap += [CREDIT, "", TAGS + " #釣り情報"]
    return guide, "\n".join(cap)


# ---------- 金曜 20:00 週末の釣れる時間 ----------
def make_weekend(day):
    data = get_json(f"{SITE}/sns/today.json")
    dates = [d["date"] for d in data["dates"]]
    wk = [x for x in dates if datetime.strptime(x, "%Y-%m-%d").weekday() in (5, 6)][:2] or dates[1:3]

    def best(s, date):
        ws = s["days"].get(date, {}).get("windows", [])
        return max(ws, key=lambda w: w["score"]) if ws else None

    scenes = [{"type": "title", "lines": ["今週末の釣れる時間をお知らせします。"]}]
    cap = ["【週末の釣れる時間】", ""]
    for i, date in enumerate(wk):
        tide = next((d["tideName"] for d in data["dates"] if d["date"] == date), "")
        ranked = sorted([s for s in data["spots"] if best(s, date)], key=lambda s: (-best(s, date)["score"], -s.get("recentReports", 0)))[:3]
        windy = sum(1 for s in data["spots"] if (s["days"].get(date, {}).get("maxWind") or 0) >= 10)
        rows = [[short_spot(s["name"]), f"{best(s, date)['grade']} {best(s, date)['from']}:00〜{best(s, date)['to']}:00"] for s in ranked]
        label = md(date)
        if rows:
            s0 = ranked[0]
            line = f"{label}は{tide}。おすすめは、{short_spot(s0['name'])}の、{best(s0, date)['from']}:00から{best(s0, date)['to']}:00です。"
            if windy:
                line += f"{windy}か所で風が強い予報です。"
            scenes.append({"type": "pattern", "heading": f"{'①②'[i]} {label}・{tide}", "rows": rows, "lines": [line]})
        cap.append(f"▼{label} {tide}" + (f"（⚠ {windy}か所で風速10m以上の予報）" if windy else ""))
        cap += [f"・{s['name']}　{best(s, date)['grade']}{best(s, date)['from']}〜{best(s, date)['to']}時" for s in ranked] or ["・目立つねらい目が少ない日です"]
        cap.append("")
    scenes.append({"type": "points", "heading": "週末に出かける前に", "items": ["前日に風と波の予報を確認", "ライフジャケットを着る", "混雑時は周りと譲り合う"],
                   "lines": ["前の日に、風と波の予報をもう一度確認してから出かけましょう。"]})
    q = discuss.weekend()
    scenes.append(discuss.scene(q))
    scenes.append(END)
    g = {"title": "週末の釣れる時間", "sub": "・".join(md(x) for x in wk), "tag": "週末の釣り情報", "video": {"scenes": scenes}}
    cap += ["潮の動き・朝夕のまずめ・営業時間・風の予報（気象庁）から計算した目安です。予報は変わることがあるので、前日にもう一度確認しましょう。"]
    cap += site_lead("/", "釣り場ごとのタイドグラフ・天気・最近の釣果")
    cap += discuss.caption(q) + [""]
    cap += [CREDIT, "", TAGS + " #週末釣り #釣り情報"]
    return g, "\n".join(cap)


# ---------- 18:00 お得情報（PR） ----------
def short_item(name):
    """楽天の長い商品名を、動画に入る短い名前にする"""
    import re
    n = re.sub(r"[《【\[(（][^》】\])）]*[》】\])）]", " ", name)
    n = n.replace("送料無料", " ").replace("！", " ")
    words = [w for w in n.split() if not re.fullmatch(r"[A-Za-z0-9\-/.:]+", w) or len(w) <= 2 and False]
    out = ""
    for w in words:
        if out and len(out) + len(w) > 20:
            break
        out = (out + " " + w).strip()
    return (out or name)[:22]


def make_deals(day):
    d = json.load(open("public/data/deals.json", encoding="utf-8"))
    cats = [c for c in d["categories"] if c.get("items")]
    idx = datetime.strptime(day, "%Y-%m-%d").toordinal() % len(cats)
    c = cats[idx]
    items = c["items"][:3]
    kind = {"sale": "セール", "point": "ポイントアップ"}.get(c.get("kind"), "人気商品")
    head = f"{c['label']}の{kind}"
    rows = [[f"{it['price']:,}円", short_item(it["name"]) + (f"（ポイント{it['pointRate']}倍）" if (it.get("pointRate") or 1) > 1 else "")] for it in items]
    top = items[0]
    lines = [f"今日の釣り道具のお得情報は、{c['label']}です。", f"{short_item(top['name'])}は、{top['price']:,}円。"
             + (f"レビューは{top['review']:.1f}点です。" if top.get("review") and (top.get("reviewCount") or 0) >= 10 else "")]
    scenes = [
        {"type": "title", "lines": ["楽天市場の、釣り道具のお得情報です。この動画はPRを含みます。"]},
        {"type": "tackle", "heading": f"① {head}", "items": rows, "lines": lines},
        {"type": "points", "heading": "② 買う前に", "items": ["価格・在庫は変わることがあります", "釣り場のルールに合うか確認", "くわしくはサイトのセールページへ"],
         "lines": ["価格や在庫は変わることがあります。くわしくは、ツレドキ関西のセールページを見てください。"]},
    ]
    q = discuss.deals([short_item(it["name"]) for it in items])
    scenes += [discuss.scene(q), END]
    guide = {"title": "今日のお得な釣り道具", "sub": "楽天市場【PR】", "tag": "PR・お得情報", "video": {"scenes": scenes}}
    cap = [f"【PR】今日のお得な釣り道具｜{head}", ""]
    for it in items:
        rv = f"（レビュー{it['review']:.1f}・{it.get('reviewCount', 0)}件）" if it.get("review") else ""
        cap.append(f"・{short_item(it['name'])}　{it['price']:,}円{rv}")
    cap += ["", f"楽天市場の情報（{d.get('updatedOn', '')}時点）です。価格・在庫・ポイントは変わることがあります。"]
    cap += site_lead("/gear/sale/", "商品へのリンクと、ほかのセール情報")
    cap += discuss.caption(q) + [""]
    cap += ["この投稿は広告（アフィリエイト）を含みます。", "", CREDIT, "", "#PR " + TAGS + " #釣り具 #釣具セール"]
    return guide, "\n".join(cap)


# ---------- 00:00 豆知識 ----------
def make_trivia(day, log):
    items = json.load(open("content/trivia.json", encoding="utf-8"))
    done = {p["key"] for p in log["posts"] if p["slot"] == "trivia"}
    t = next((x for x in items if f"trivia-{x['id']}" not in done), None) or items[len(done) % len(items)]
    scenes = [
        {"type": "title", "lines": [t["title"]]},
        {"type": "points", "heading": "答え", "items": t["points"], "lines": t["lines"]},
    ]
    q = discuss.trivia(t)
    scenes += [discuss.scene(q), END]
    guide = {"title": t["title"], "sub": "釣りの豆知識", "tag": f"釣りの豆知識 No.{t['no']}", "video": {"scenes": scenes}, "key": f"trivia-{t['id']}"}
    cap = [f"【釣りの豆知識】{t['title']}", ""] + t["lines"] + [""] + [f"・{p}" for p in t["points"]]
    cap += site_lead(t.get("link", "/"), "関連する釣り方ガイド・今日の釣れる時間")
    cap += discuss.caption(q) + [""]
    cap += [CREDIT, "", TAGS + " #釣りの豆知識 #釣り雑学"]
    return guide, "\n".join(cap)


def make(slot, outdir):
    os.makedirs(outdir, exist_ok=True)
    day = now().strftime("%Y-%m-%d")
    if slot == "trivia" and now().hour >= 20:
        day = (now() + timedelta(days=1)).strftime("%Y-%m-%d")  # 0時の投稿は翌日分
    if slot == "spots" and now().hour >= 20:
        day = (now() + timedelta(days=1)).strftime("%Y-%m-%d")
    log = load_log()
    if slot == "spots":
        g, cap = make_spots(day)
    elif slot == "tomorrow":
        day = (now() + timedelta(days=1)).strftime("%Y-%m-%d")
        g, cap = make_spots(day, "明日")
    elif slot == "weekend":
        g, cap = make_weekend(day)
    elif slot == "deals":
        g, cap = make_deals(day)
    elif slot == "trivia":
        g, cap = make_trivia(day, log)
    else:
        raise SystemExit(f"unknown slot {slot}")
    vid = f"{slot}-{day}"
    g.setdefault("key", vid)
    json.dump(g, open(f"{outdir}/{vid}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"id": vid, "slot": slot, "key": g["key"], "caption": cap, "title": g["title"]}, open(f"{outdir}/post.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(cap)
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as f:
            f.write(f"id={vid}\n")
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as f:
            f.write(f"## {g['title']}（{vid}）\n```\n{cap}\n```\n")


def wait_url(url, minutes=15):
    for _ in range(minutes * 4):
        try:
            req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "TsuredokiKansai-SNS/0.1"})
            with urllib.request.urlopen(req, timeout=30) as r:
                if r.status == 200 and "video" in (r.headers.get("Content-Type") or ""):
                    return True
        except Exception:
            pass
        time.sleep(15)
    return False


def ig_reel(video_url, cover_url, caption):
    uid, token = clean(os.environ.get("IG_USER_ID")), clean(os.environ.get("IG_TOKEN"))
    if not uid or not token:
        return None
    api = "https://graph.facebook.com/v21.0"
    c = http("POST", f"{api}/{uid}/media", {"media_type": "REELS", "video_url": video_url, "cover_url": cover_url, "caption": caption, "share_to_feed": "true", "access_token": token})
    for _ in range(40):
        time.sleep(15)
        st = http("GET", f"{api}/{c['id']}?fields=status_code,status&access_token={token}")
        if st.get("status_code") == "FINISHED":
            break
        if st.get("status_code") in ("ERROR", "EXPIRED"):
            raise RuntimeError(f"Instagram の動画処理に失敗: {st}")
    else:
        raise RuntimeError("Instagram の動画処理が10分以内に終わりませんでした")
    return http("POST", f"{api}/{uid}/media_publish", {"creation_id": c["id"], "access_token": token}).get("id")


def yt_short(path, title, caption):
    cid, csec, rtok = (clean(os.environ.get(k)) for k in ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN"))
    if not (cid and csec and rtok):
        return None
    tok = http("POST", "https://oauth2.googleapis.com/token", {"client_id": cid, "client_secret": csec, "refresh_token": rtok, "grant_type": "refresh_token"})["access_token"]
    desc = caption.replace("・プロフィールのリンクから\n", "").replace(SITE.replace("https://", ""), SITE)
    meta = {"snippet": {"title": f"{title}【ツレドキ関西】 #Shorts"[:100], "description": desc[:4900], "categoryId": "26", "defaultLanguage": "ja", "defaultAudioLanguage": "ja"},
            "status": {"privacyStatus": "public", "selfDeclaredMadeForKids": False}}
    size = os.path.getsize(path)
    r = http("POST", "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", json.dumps(meta).encode(),
             {"Authorization": f"Bearer {tok}", "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": str(size)}, raw=True)
    with open(path, "rb") as f:
        vid = http("PUT", r.headers["Location"], f.read(), {"Authorization": f"Bearer {tok}", "Content-Type": "video/mp4"}).get("id")
    thumb = path[:-4] + ".jpg"  # リールの表紙をサムネイルにも使う
    if vid and os.path.exists(thumb):
        try:
            with open(thumb, "rb") as f:
                http("POST", f"https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={vid}", f.read(), {"Authorization": f"Bearer {tok}", "Content-Type": "image/jpeg"})
        except Exception as e:
            print(f"::warning::サムネイルを設定できませんでした: {str(e)[:200]}")
    return vid


def publish(outdir):
    p = json.load(open(f"{outdir}/post.json", encoding="utf-8"))
    vid = p["id"]
    url = f"{SITE}/sns/{vid}.mp4"
    if not wait_url(url):
        raise SystemExit(f"動画がサイトに公開されていません: {url}")
    log = load_log()
    rec = {"slot": p["slot"], "key": p["key"], "id": vid, "at": now().isoformat(timespec="minutes")}
    failed = False
    try:
        ig = ig_reel(url, f"{SITE}/sns/{vid}.jpg", discuss.with_yt(p["caption"]))
        if ig:
            rec["instagram"] = ig
            print(f"::notice::instagram ok {ig}")
    except Exception as e:
        print(f"::error::instagram: {e}")
        failed = True
    try:
        yt = yt_short(f"public/sns/{vid}.mp4", p["title"], p["caption"])
        if yt:
            rec["youtube"] = yt
            print(f"::notice::youtube ok {yt}")
    except Exception as e:
        if "uploadLimitExceeded" in str(e):
            # 新しいチャンネルは1日に投稿できる本数が少ない。翌日には戻るので失敗扱いにしない
            print("::warning::youtube: 1日の投稿上限に達したため、今回はYouTubeに投稿しませんでした")
        else:
            print(f"::error::youtube: {e}")
            failed = True
    log["posts"].append(rec)
    save_log(log)
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    if sys.argv[1] == "make":
        make(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == "publish":
        publish(sys.argv[2])
