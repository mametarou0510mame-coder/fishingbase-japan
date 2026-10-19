# Excel で公開されている釣果を取り込む（fetch-catches.mjs の前に実行）。
#   南あわじ海釣り公園メガフロート：年度ごとの .xls（月ごとのシート。日付・魚種・匹数・体長）
# 出力: data/extra-catches/<key>.json  {"fetchedOn", "url", "reports": [{date, species, count, sizeCm}]}
import json, os, re, sys, time, urllib.request
from datetime import datetime, timedelta, timezone

import xlrd

UA = "TsuredokiKansai/0.1 (+https://tsuredoki-kansai.mametarou0510mame.workers.dev/about/)"
OUT = "data/extra-catches"
JST = timezone(timedelta(hours=9))


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def size_cm(v):
    nums = [float(x) for x in re.findall(r"(\d+(?:\.\d+)?)", str(v).translate(str.maketrans("０１２３４５６７８９．", "0123456789.")))]
    return max(nums) if nums and "cm" in str(v).lower().replace("ｃｍ", "cm") else None


def minamiawaji():
    page_url = "https://www.city.minamiawaji.hyogo.jp/soshiki/suisan/umidurikouen.html"
    html = get(page_url).decode("utf-8", "replace")
    links = re.findall(r'href="([^"]+\.xls)"', html)
    links = [l if l.startswith("http") else "https://www.city.minamiawaji.hyogo.jp" + l for l in links][:2]  # 今年度と前年度
    reports = []
    for url in links:
        book = xlrd.open_workbook(file_contents=get(url))
        for sh in book.sheets():
            if not re.match(r"[RH]\d+\.\d+", sh.name):
                continue
            date = None
            for r in range(sh.nrows):
                c0 = sh.cell(r, 0)
                if c0.ctype == xlrd.XL_CELL_DATE:
                    y, m, d, *_ = xlrd.xldate_as_tuple(c0.value, book.datemode)
                    date = f"{y:04d}-{m:02d}-{d:02d}"
                if date is None or sh.ncols < 9:
                    continue
                sp = str(sh.cell_value(r, 6)).strip()
                if not sp or sp in ("魚種",):
                    continue
                cnt = sh.cell_value(r, 7)
                try:
                    cnt = int(float(cnt))
                except (TypeError, ValueError):
                    cnt = None
                reports.append({"date": date, "species": sp, "count": cnt, "sizeCm": size_cm(sh.cell_value(r, 8))})
        time.sleep(2)
    return page_url, reports


def main():
    os.makedirs(OUT, exist_ok=True)
    for key, fn in [("minamiawaji", minamiawaji)]:
        try:
            url, reports = fn()
            json.dump({"fetchedOn": datetime.now(JST).strftime("%Y-%m-%d"), "url": url, "reports": reports}, open(f"{OUT}/{key}.json", "w", encoding="utf-8"), ensure_ascii=False)
            print(f"::notice::[xls] {key}: {len(reports)}件")
        except Exception as e:  # 失敗しても他の取り込みは続ける
            print(f"::warning::[xls] {key}: 失敗 {e}")


if __name__ == "__main__":
    main()
