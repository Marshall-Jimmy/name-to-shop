import sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5174'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'shot.png'

logs = []
errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--enable-unsafe-webgpu', '--use-gl=angle', '--enable-webgpu'])
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    page.on('console', lambda m: logs.append(f'[{m.type}] {m.text[:400]}'))
    page.on('pageerror', lambda e: errors.append(str(e)[:600]))
    page.goto(URL, timeout=60000)
    page.wait_for_timeout(9000)
    page.screenshot(path=OUT)
    # WebGL/WebGPU info
    info = page.evaluate("""() => {
      const c = document.querySelector('canvas')
      return { canvas: !!c, w: c ? c.width : 0, h: c ? c.height : 0 }
    }""")
    browser.close()

print('CANVAS:', json.dumps(info))
print('--- PAGE ERRORS ---')
for e in errors[:20]: print(e)
print('--- CONSOLE (last 40) ---')
for l in logs[-40:]: print(l)
