import sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

name = sys.argv[1] if len(sys.argv) > 1 else '张三'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'shot_shop.png'
WAIT = int(sys.argv[3]) if len(sys.argv) > 3 else 8000

logs = []
errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--enable-unsafe-webgpu'])
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    page.on('console', lambda m: logs.append(f'[{m.type}] {m.text[:300]}'))
    page.on('pageerror', lambda e: errors.append(str(e)[:600]))
    import urllib.parse
    url = f'http://localhost:5174/?name={urllib.parse.quote(name)}'
    page.goto(url, timeout=60000)
    page.wait_for_timeout(WAIT)
    page.screenshot(path=OUT)
    browser.close()

print('--- PAGE ERRORS ---')
for e in errors[:20]: print(e)
print('--- CONSOLE WARN/ERROR (last 25) ---')
for l in logs[-25:]:
    if not l.startswith('[debug]') and not l.startswith('[log]'):
        print(l)
