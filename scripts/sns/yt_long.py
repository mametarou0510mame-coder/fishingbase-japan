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
         "long-aomono-end", "long-kiken10", "long-kinou",
         "cg-michihiki",  # 2026-11-06 見える化 潮の満ち引き（定時タスクで force 投稿）
         "long-kanji30", "long-issho", "long-dataquiz", "long-iitsutae",
         # 第6弾（2026-11-05。書き出し済み）
         "long-hatsumono", "long-shokuchudoku", "long-kisetsu-quiz", "long-osaka-kobe",  # 2026-11-27 nakama-quiz・shurui・yougo30 は最後に移した
         # 第7弾（2026-11-09。1日1本・高クオリティ。書き出し済み）
         # （long-tsureta-jikan・long-shime は 2026-11-27 に最後へ移した）
         "cg-aori",
         "cg-fune-tachiuo",
         "cg-fune-tairaba", "cg-fune-aomono",
         "cg-surf",  # 2026-11-16 見える化 サーフ（11/13 に書き出しと Blender の冒頭まで済み。オーナー「サーフ出して」→ 11/16 18:17 の枠）
         "cg-fune-mebaru",  # 2026-11-16 船釣り見える化 第4回 船のメバル（オーナー「メバルは明日で」→ 11/17 18:17 の枠）
         "cg-akai",  # 2026-11-17 ツレドキアカデミー R10 海の中で赤は消える？（定期タスク。Blender の冒頭・サムネイル差しかえずみ）
         "cg-kakou",  # 2026-11-17 オーナー「河口はオーダーに入れて」（11/7 制作。見える化 河口と塩水くさび）
         "cg-tetra",  # 2026-11-18 見える化 テトラ帯、どこに投げる？（定期タスク。Blender の冒頭・サムネイル差しかえずみ）
         "cg-iwashi",  # 2026-11-20 ツレドキアカデミー R13 もしもイワシがいなくなったら？（定期タスク。Blender の冒頭・サムネイル差しかえずみ。full 44670344438・最小すきま 1.23m）
         "cg-slope",  # 2026-11-20 見える化 漁港のスロープ、どこに投げる？（3DCG 定期タスク。Blender の冒頭・サムネイル差しかえずみ。full 44671765398・最小すきま 0.24m）
         "cg-aji",  # 2026-11-21 ツレドキアカデミー R14 もしもアジがいなくなったら？（定期タスク。Blender の冒頭・サムネイル差しかえずみ。書き出し 44851817112・差しかえ 44869238049・最小すきま 0.754m）
         "cg-nabura",  # 2026-11-23 作り直して出し直し（1回目 JWOl07p4gj0 はオーナーが非公開。ミノーの向き・ブリが水面から出る場面を直した）／2026-11-22 見える化 船のキャスティング、ナブラを見つけたらどうする？（3DCG 定期タスク。Blender の冒頭・サムネイル差しかえずみ。書き出し 44967934322・full 44971302967・最小すきま 5.15m）
         "cg-sawara-moshi",  # 2026-11-22 ツレドキアカデミー R15 もしもサワラがいなくなったら？（定期タスク。Blender の冒頭・サムネイル差しかえずみ。書き出し 44986093157・full 44989380244・最小すきま 1.945m）
         "cg-kaze",  # 2026-11-23 見える化 風の日、釣り場はどう変わる？（3DCG 定期タスク。Blender の冒頭・サムネイル差しかえずみ。書き出し 45090512331・full 45093535691・最小すきま 5.233m）
         "cg-hiruyoru",  # 2026-11-23 ツレドキアカデミー R9 魚にも「昼型」と「夜型」がいる？（定期タスク。Blender の冒頭・サムネイル差しかえずみ。書き出し 45113730520・圧縮 45116205270・full 45116440276（attempt 2）・最小すきま 0.587m）
         "cg-shikai",  # 2026-11-24 見える化 魚からはどこまで見えている？（3DCG 定期タスク。Blender の冒頭・サムネイル差しかえずみ。書き出し 45299045780・圧縮 45307006335・full 45303771457・最小すきま 0.379m）
         "cg-nori",  # 2026-11-24 ツレドキアカデミー R11 冬のチヌはノリを食べに来る？（定期タスク。Blender の冒頭・サムネイル差しかえずみ。書き出し 45329169274・圧縮 45338408379・full 45340723375・最小すきま 1.069m）
         "cg-oto",  # 2026-11-25 見える化（A4） 堤防の足音・話し声は魚に届く？（3DCG 定期タスク。Blender の冒頭・サムネイル差しかえずみ。書き出し 45519622908・圧縮 45522481605・full 45523680707・最小すきま 0.526m）
         # 2026-11-27 オーナー「long は毎日2本ずつ出していい。順番は任せる。事実の再確認が前提」→ 9本を事実確認して直し、書き出し直した。
         # 季節もの（冬の堤防）を先に。12月の関西は 12/1 から（NOT_BEFORE）。
         "long-fuyu-teibou", "long-hajimete-ichinichi", "long-shime", "long-tsureta-jikan",
         "long-nakama-quiz", "long-shun-quiz", "long-shurui", "long-month-12", "long-yougo30"]  # 船釣り見える化 第3・2回（2026-11-12 オーナー：タイラバを今日 11/12 18:17 に、ショートも同時。青物ジギングはそのあと） ／ 2026-11-10 アカデミー R7 ／ 2026-11-11 船釣り見える化 第1回（オーナー指示で当日 force 投稿）
REC = "data/sns/long-posts.json"
PER_DAY = 1  # 3DCG・アカデミー（cg-*）を1日に出す本数（18:17、出せなかった日は 21:17）
LONG_PER_DAY = 2  # 通常の長尺（long-*）を1日に出す本数（2026-11-27 オーナー：毎日2本。12:17 と 20:17、出せなかったら 23:17）
NOT_BEFORE = {"long-month-12": "2026-12-01"}  # この日より前は出さない（季節もの）


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
HOLD = {"cg-gear-lure", "cg-gear-goods"}  # cg-fune-aomono は 2026-11-14 オーナーOKで HOLD から外した

# 2026-11-23 オーナー：通常の長尺（long-*）も、cg-* が切れた日に自動で出す。ただし投稿前にオーナーが見て OK したものだけ。
# オーナーが動画を見て OK したら、その slug をここに足す（足していない long-* は自動では出ない）
# 2026-11-27 オーナー「long は毎日2本ずつ出していい（事実の再確認が前提）」→ 事実確認して直し、書き出し直した9本
APPROVED = {"long-fuyu-teibou", "long-hajimete-ichinichi", "long-shime", "long-tsureta-jikan", "long-nakama-quiz",
            "long-shun-quiz", "long-shurui", "long-month-12", "long-yougo30"}


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
    if sys.argv[1] in ("next", "next-long"):  # まだ投稿していない次の動画の slug を出す（その日の上限を超えていれば空）
        # next：3DCG・アカデミー（cg-*）を1日 PER_DAY 本。next-long：オーナーが OK した long-*（APPROVED）を1日 LONG_PER_DAY 本。
        # 2026-11-27 オーナー：long は毎日2本。cg-* とは別の枠で出す（cg-* の数には数えない）
        from datetime import datetime, timedelta, timezone
        done = posted()
        today = datetime.now(timezone(timedelta(hours=9))).strftime("%Y-%m-%d")
        cg = sys.argv[1] == "next"
        mine = lambda s: s.startswith("cg-") == cg  # noqa: E731
        if sum(v.get("at", "").startswith(today) and mine(k) for k, v in done.items()) >= (PER_DAY if cg else LONG_PER_DAY) and "--force" not in sys.argv:
            print("")
            return
        left = [s for s in ORDER if s not in done and s not in HOLD and mine(s) and (cg or s in APPROVED) and NOT_BEFORE.get(s, "") <= today]
        print(left[0] if left else "")
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
