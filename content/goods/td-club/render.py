# svg/*.svg を透過PNGにする。  python3 content/goods/td-club/render.py [倍率=2] [名前の一部]
import os, sys
from playwright.sync_api import sync_playwright

D = os.path.dirname(os.path.abspath(__file__))
K = float(sys.argv[1]) if len(sys.argv) > 1 else 2
pick = sys.argv[2] if len(sys.argv) > 2 else ""
os.makedirs(f"{D}/png", exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    for f in sorted(os.listdir(f"{D}/svg")):
        if not f.endswith(".svg") or pick not in f:
            continue
        svg = open(f"{D}/svg/{f}").read()
        import re
        w, h = map(int, re.search(r'viewBox="0 0 (\d+) (\d+)"', svg).groups())
        pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=K)
        pg.set_content(f"<html><body style='margin:0;background:transparent'>{svg}</body></html>")
        pg.wait_for_timeout(200)
        pg.screenshot(path=f"{D}/png/{f[:-4]}.png", omit_background=True, clip={"x": 0, "y": 0, "width": w, "height": h})
        pg.close()
        print("png", f)
    b.close()
