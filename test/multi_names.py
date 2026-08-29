import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright
import urllib.parse

BASE = 'http://localhost:5174'

NAMES = [
    ('john', 'en'),
    ('888', 'num'),
    ('🐱', 'emoji'),
    ('尊嘟假嘟', 'egg1'),
    ('泰裤辣', 'egg2'),
    ('雪糕刺客', 'egg3'),
    ('skibidi', 'egg4'),
    ('李四五', 'zh2'),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--enable-unsafe-webgpu'])
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    errors_all = []
    page.on('pageerror', lambda e: errors_all.append(str(e)[:300]))

    for name, tag in NAMES:
        page.goto(f'{BASE}/?name={urllib.parse.quote(name)}', timeout=60000)
        try:
            page.wait_for_function('() => window.__nts && window.__nts.state() === "shop"', timeout=25000)
        except Exception:
            print(f'[{tag}] TIMEOUT waiting shop for {name}')
            continue
        page.wait_for_timeout(4500)
        info = page.evaluate('''() => {
          const d = window.__nts.shop.dna
          const ck = window.__nts.shop.ctx.checks
          return {
            biz: d.business.name, style: d.style.name, rarity: d.rarity,
            eggs: (d.eggs || []).map(e => e.n || e.t).slice(0, 4),
            valid: window.__nts.shop.ctx.valid, checks: ck,
            manifest: window.__nts.shop.manifest.length,
          }
        }''')
        page.screenshot(path=f'test/multi_{tag}.png')
        print(f'[{tag}] {name} -> {info["biz"]} x {info["style"]} {info["rarity"]} eggs={info["eggs"]} valid={info["valid"]} parts={info["manifest"]}')

    browser.close()
    print('--- ERRORS ---')
    for e in errors_all[:10]: print(e)
