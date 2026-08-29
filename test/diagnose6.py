import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright
import urllib.parse

BASE = 'http://localhost:5174'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--enable-unsafe-webgpu'])
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    page.on('pageerror', lambda e: print('PAGEERROR:', str(e)[:400]))

    page.goto(f'{BASE}/?name={urllib.parse.quote("张三")}', timeout=60000)
    page.wait_for_function('() => window.__nts && window.__nts.state() === "shop"', timeout=30000)
    page.wait_for_timeout(5000)

    page.evaluate('() => window.__nts.enterShop()')
    for i in range(9):
        page.wait_for_timeout(700)
        st = page.evaluate('''() => ({
          cam: window.__nts.camPos.map(v=>+v.toFixed(2)),
          tgt: window.__nts.target.map(v=>+v.toFixed(2)),
          ctl: window.__nts.ctl,
          mode: window.__nts.mode(),
          tw: window.__nts.tweens(),
        })''')
        dist = (sum((a-b)**2 for a, b in zip(st['cam'], st['tgt']))) ** 0.5
        print(f't+{(i+1)*0.7:.1f}s cam={st["cam"]} tgt={st["tgt"]} dist={dist:.2f} ctl={st["ctl"]} {st["mode"]} tw={st["tw"]}')
    browser.close()
