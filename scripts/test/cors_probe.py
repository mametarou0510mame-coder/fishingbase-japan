# 気象庁 bosai のデータがブラウザから直接読めるか（CORS）を確認する
import urllib.request
for u in ["https://www.jma.go.jp/bosai/amedas/data/latest_time.txt", "https://www.jma.go.jp/bosai/amedas/data/point/63517/20261024_18.json"]:
    r = urllib.request.urlopen(urllib.request.Request(u, headers={"Origin": "https://tsuredoki-kansai.mametarou0510mame.workers.dev", "User-Agent": "TsuredokiKansai/0.1"}))
    h = {k.lower(): v for k, v in r.headers.items()}
    print(f"::notice::{u.split('/')[-1]} ACAO={h.get('access-control-allow-origin')} cache={h.get('cache-control')}")
