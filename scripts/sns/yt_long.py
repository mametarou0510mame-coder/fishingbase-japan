# YouTube に長尺動画を投稿する（説明欄に章の目次を入れる）。
#   python scripts/sns/yt_long.py <slug> <mp4> <thumb.jpg> <chapters.txt> [--publish]
import json, re, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from video_post import SITE, clean, http  # noqa: E402
import discuss  # noqa: E402
import voice_credit  # noqa: E402
import affiliate  # noqa: E402
from affiliate import amazon_search_url, rakuten_search_url, tackle_lines  # noqa: E402

CREDIT = "音声合成：VOICEVOX:四国めたん"  # 2026-11-03 から（それより前の動画は voice_credit.credit(slug) で ずんだもん）


ORDER = ["long-shore-jigging", "long-sawara", "long-tachiuo", "long-sabiki", "long-light-game", "long-ika-tako", "long-chinu", "long-big-game", "long-gomoku", "long-basics",
         # 第2弾（釣り場・データ・安全・図鑑）
         # （エリア別の釣り場ガイド4本・海上釣り堀ガイドはオーナー判断で投稿しない）
         "long-weather", "long-calendar", "long-zukan", "long-jiai", "long-family",  # 海上釣り堀ガイドも投稿しない
         # 第3弾（2026-10-26。冬の夜釣りは11〜12月の事故シーズン前に出す）
         "long-month-11",
         # 3DCG（2026-10-28 オーナー Go）
         "cg-teibou-3d", "cg-shokumotsu", "cg-nagare", "cg-kiken", "cg-lure",
         "cg-suion",  # 2026-10-30 冬の水温（3DCG）
         "cg-sawara",  # 2026-10-31 ツレドキアカデミー R6（オーナー OK・臨時投稿）
         "cg-buri",  # 2026-10-31 ツレドキアカデミー R5（オーナー OK、11/1 朝の枠）
         "long-asaichi", "long-ng10", "long-winter-night", "long-keep-rules", "long-quiz30", "long-weekday",
         "cg-tachiuo",  # 2026-11-02 ツレドキアカデミー R1（オーナー OK、11/3 朝の枠）
         "cg-iso", "cg-rantai",  # 2026-11-03 磯場・アカデミー R4 卵胎生（オーナー：即出し。今日の定時投稿はこの2本に置きかえ）
         "cg-jissen-katachi",  # 2026-11-03 見える化 実戦編（L字・船道）。定時タスクで force 投稿
         "cg-gashira", "cg-chinu",  # 2026-11-03 アカデミー R3・R2（オーナー OK、11/4 の 7:17 と 18:17）
         "cg-gear-tackle",  # 2026-11-04 道具紹介【PR】1本目（11/4 夜に force 投稿）。2・3本目は下の HOLD（2日に1本、時刻を決めて slug 指定で出す）
         # 第4弾（2026-11-02。書き出し済み）
         "long-aomono-end", "long-kiken10", "long-kinou", "long-kanji30", "long-issho", "long-dataquiz", "long-iitsutae",
         # 第6弾（2026-11-05。書き出し済み）
         "long-hatsumono", "long-shokuchudoku", "long-kisetsu-quiz", "long-osaka-kobe", "long-nakama-quiz", "long-shurui", "long-yougo30"]
REC = "data/sns/long-posts.json"
PER_DAY = 2  # 1日に出す長尺の本数（07:17 と 18:17。出せなかった分は 21:17）


def yt_title(t):
    # 2026-11-01：中身（問い）を先に、シリーズ名【…】は後ろに回す（検索・おすすめで最初に目に入る所を中身にする）
    m = re.match(r"^【([^】]+)】\s*(.+)$", t)
    return f"{m[2]}【{m[1]}】" if m else t


def desc_fit(desc, limit=4950):
    """概要欄は 5000 バイトまで（YouTube Data API。日本語は1文字3バイト）。PR表記を残すため、長すぎるときは
    ①冒頭のあらすじ ②サイトのリンクのまとまり ③道具の行（後ろから）の順に削る"""
    desc = list(desc)
    size = lambda d: len("\n".join(d).encode("utf-8"))  # noqa: E731
    if size(desc) > limit and desc and not desc[0].startswith(("【PR】", "▼")):
        desc = desc[2:] if len(desc) > 2 and desc[1] == "" else desc[1:]
    for head in ("▼この動画のくわしい情報", "▼関西の釣果・潮"):
        if size(desc) <= limit:
            break
        if head in "\n".join(desc):
            i = next(k for k, l in enumerate(desc) if l.startswith(head))
            j = i + 1
            while j < len(desc) and desc[j].startswith("http"):
                j += 1
            desc = desc[:i] + desc[j:]
    while size(desc) > limit:
        idx = [i for i, l in enumerate(desc) if l.startswith("・") and ("\n楽天 " in l or "\nAmazon " in l)]
        if not idx:
            return "\n".join(desc).encode("utf-8")[:limit].decode("utf-8", "ignore")
        desc = desc[: idx[-1]] + desc[idx[-1] + 1 :]
    return "\n".join(desc)


# 自動の列からは出さず、long-upload の slug 指定で出す動画（2026-11-05 オーナー：道具紹介は2日に1本）
HOLD = {"cg-gear-lure", "cg-gear-goods"}


def comment_text(src):
    """固定コメント用（オーナーが貼る）：紹介した製品ごとに Amazon のリンクだけ（2026-11-05 オーナー：楽天も入れると長すぎる）"""
    items = src.get("gear") or []
    if not items:
        return ""
    out = ["【PR】この動画で紹介した道具（Amazon）", ""]
    for g in items:
        out += [f"■{g['name']}", amazon_search_url(g["keyword"], force=True, media="youtube"), ""]
    out += ["※アフィリエイトリンクです。番手・重さ・カラーはリンク先で選んでください。楽天市場のリンクはプロフィールのサイト「おすすめ道具」にあります。"]
    return "\n".join(out)


def posted():
    try:
        return json.load(open(REC, encoding="utf-8"))
    except FileNotFoundError:
        return {}


def main():
    if sys.argv[1] == "next":  # まだ投稿していない次の動画の slug を出す（1日 PER_DAY 本まで。超えていれば空）
        from datetime import datetime, timedelta, timezone
        done = posted()
        today = datetime.now(timezone(timedelta(hours=9))).strftime("%Y-%m-%d")
        if sum(v.get("at", "").startswith(today) for v in done.values()) >= PER_DAY and "--force" not in sys.argv:
            print("")
            return
        left = [s for s in ORDER if s not in done and s not in HOLD]
        # 2026-11-06 オーナー：3DCG（cg-*）を優先して投稿する。残っていれば通常の長尺より先に出す
        print(next((s for s in left if s.startswith("cg-")), left[0] if left else ""))
        return
    slug, mp4, thumb, chap = sys.argv[1:5]
    publish = "--publish" in sys.argv
    path = f"content/long/{slug}.json"
    if not os.path.exists(path):
        path = f"content/cg/{slug}.json"  # 3DCG 動画
    src = json.load(open(path, encoding="utf-8"))
    gs = [json.load(open(f"content/guides/{g}.json", encoding="utf-8")) for g in src.get("guides", [])]
    chapters = open(chap, encoding="utf-8").read().strip()
    # 2026-11-04 スマホのアプリでは、目次（0:00 …）から後ろの文が概要欄に出ないので、目次はいちばん最後に置く
    desc = [" ".join(src["video"]["scenes"][0]["lines"]), ""]
    if src.get("pr"):  # 道具紹介の動画：冒頭で広告であることを示す（ステルスマーケティング規制）
        desc = ["【PR】この動画は広告リンクを含みます。", ""] + desc
    # 2026-11-04 YouTube も Amazon（もしも、a_id 5877693）の提携が承認されたので、楽天と Amazon の両方を出す
    gear = tackle_lines(gs, amazon=True, media="youtube")
    shops = "楽天市場・Amazon"
    if src.get("gear"):  # 動画で紹介した製品（content/long・content/cg の gear）。概要欄は5000字までなので仕様は書かない
        both = [f"・{g['name']}\n楽天 {rakuten_search_url(g['keyword'])}\nAmazon {amazon_search_url(g['keyword'], force=True, media='youtube')}" for g in src["gear"]]
        # 楽天と Amazon の両方だと長すぎるとき（製品が多い動画）は、Amazon だけにして楽天はサイトのページへ
        gear = both if sum(len(x.encode("utf-8")) for x in both) < 3000 else [f"・{g['name']}\nAmazon {amazon_search_url(g['keyword'], force=True, media='youtube')}" for g in src["gear"]]
        shops = "楽天市場・Amazon" if gear is both else "Amazon"
    if gear:
        desc += [f"▼この動画で紹介した道具（{shops}で探す）【PR】"] + gear + ["※アフィリエイトリンクです。価格・在庫はリンク先で。", ""]
        if src.get("gear"):
            desc += [f"▼{'楽天市場のリンク・' if shops == 'Amazon' else ''}仕様と選び方はサイトで（ツレドキ関西 おすすめ道具）", f"{SITE}/gear/shore-jigging/", ""]
    if gs:
        desc += ["▼くわしい解説・道具リスト（初級・中級・上級）"]
        desc += [f"・{g['title']}：{SITE}/guide/{g['slug']}/" for g in gs]
    if src.get("links"):
        desc += ["▼この動画のくわしい情報（ツレドキ関西）"] + [f"{SITE}{u}" for u in src["links"]]
    desc += ["", "▼関西の釣果・潮・今日の釣れる時間（ねらい目）", f"{SITE}/"]
    if slug in discuss.LONG:
        desc += discuss.caption(discuss.LONG[slug])
    desc += ["", "※このチャンネルはアフィリエイト広告（楽天アフィリエイト・Amazonアソシエイト）を掲載しています。Amazonのアソシエイトとして、当チャンネルは適格販売により収入を得ています。"]
    desc += ["", voice_credit.credit(slug), "", "#釣り #釣り初心者 #関西釣り #堤防釣り #ツレドキ関西", "", "▼目次", chapters]
    tags = ["釣り", "釣り初心者", "関西 釣り", "堤防釣り", "釣り方", "ツレドキ関西"] + [t for g in gs for t in g["targets"][:2]] + src.get("tags", [])
    meta = {
        "snippet": {"title": yt_title(src["title"])[:100], "description": desc_fit(desc), "tags": tags[:25], "categoryId": "26", "defaultLanguage": "ja", "defaultAudioLanguage": "ja"},
        "status": {"privacyStatus": "public", "selfDeclaredMadeForKids": False},
    }
    com = comment_text(src)
    if com:
        os.makedirs("data/sns/yt-comments", exist_ok=True)
        open(f"data/sns/yt-comments/{slug}.txt", "w", encoding="utf-8").write(com + "\n")
        if os.environ.get("GITHUB_STEP_SUMMARY"):
            open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8").write(f"## 固定コメント（貼りつけ用）\n```\n{com}\n```\n")
    print(meta["snippet"]["title"])
    print(meta["snippet"]["description"])
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8").write(f"## {meta['snippet']['title']}\n```\n{meta['snippet']['description']}\n```\n")
    if not publish:
        return
    cid, csec, rtok = (clean(os.environ.get(k)) for k in ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN"))
    tok = http("POST", "https://oauth2.googleapis.com/token", {"client_id": cid, "client_secret": csec, "refresh_token": rtok, "grant_type": "refresh_token"})["access_token"]
    size = os.path.getsize(mp4)
    try:
        r = http("POST", "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", json.dumps(meta).encode(),
                 {"Authorization": f"Bearer {tok}", "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": str(size)}, raw=True)
        f = open(mp4, "rb")
        vid = http("PUT", r.headers["Location"], f.read(), {"Authorization": f"Bearer {tok}", "Content-Type": "video/mp4"})["id"]
    except RuntimeError as e:
        if "uploadLimitExceeded" in str(e):
            print("::warning::YouTube の1日の投稿上限に達したため、次の回に投稿します")
            return
        raise
    print(f"::notice::youtube ok {vid}")
    try:  # サムネイルは電話番号の確認が済んだチャンネルだけ設定できる
        with open(thumb, "rb") as f:
            http("POST", f"https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={vid}", f.read(), {"Authorization": f"Bearer {tok}", "Content-Type": "image/jpeg"})
        print("::notice::thumbnail ok")
    except Exception as e:
        print(f"::warning::サムネイルを設定できませんでした（電話番号の確認が必要な場合があります）: {e}")
    rec = posted()
    from datetime import datetime, timedelta, timezone
    rec[slug] = {"youtube": vid, "at": datetime.now(timezone(timedelta(hours=9))).isoformat(timespec="minutes")}
    os.makedirs(os.path.dirname(REC), exist_ok=True)
    json.dump(rec, open(REC, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
