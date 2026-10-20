# 概要欄用の短いアフィリエイトリンクが、楽天の検索結果に正しく飛ぶか確かめる
import sys
from playwright.sync_api import sync_playwright
sys.path.insert(0, "scripts/sns")
from affiliate import rakuten_search_url  # noqa: E402

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    for kw in ["ショアジギング ロッド 9.6ft", "メタルジグ 40g"]:
        for short in (True, False):
            try:
                pg.goto(rakuten_search_url(kw, short), timeout=45000)
                pg.wait_for_timeout(2500)
                print(f"::notice::short={short} {kw} -> {pg.url[:140]} | {pg.title()[:60]}")
            except Exception as e:
                print(f"::notice::short={short} {kw} ERR {str(e)[:200]}")
    b.close()
