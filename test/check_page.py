import json
import sys
import time

from playwright.sync_api import sync_playwright

URL = 'http://localhost:5174/check.html'
OUT = r'd:\WorkingSpace\name-to-shop\test\shots'

errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1680, 'height': 1000})
    page.on('console', lambda m: errors.append(f'[{m.type}] {m.text}') if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(f'[pageerror] {e}'))

    page.goto(URL, timeout=60000)
    page.wait_for_load_state('networkidle')

    deadline = time.time() + 240
    status = ''
    while time.time() < deadline:
        status = page.evaluate("document.getElementById('status')?.textContent || ''")
        if status.startswith('完成') or status.startswith('启动失败'):
            break
        time.sleep(3)

    print('FINAL_STATUS:', status)
    canvas_info = page.evaluate("""() => {
        const c = document.querySelector('#viewport canvas')
        return c ? { w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight } : null
    }""")
    print('CANVAS:', json.dumps(canvas_info))

    if status.startswith('完成'):
        stats = page.evaluate("""() => ({
            checks: [...document.querySelectorAll('#checkBody .check')].map(el => ({
                ok: el.className.includes('ok'),
                text: el.querySelector('.tx').textContent.trim(),
            })),
            registry: document.getElementById('regBody')?.innerText || '',
            coverage: document.getElementById('covBody')?.innerText || '',
            cards: document.querySelectorAll('#grid .card').length,
            imgs: [...document.querySelectorAll('#grid .card img')].map(i => i.naturalWidth > 0),
            unused: [...document.querySelectorAll('#unusedBody .tag')].length,
        })""")
        print('CHECKLIST:', json.dumps(stats['checks'], ensure_ascii=False, indent=1))
        print('REGISTRY:', stats['registry'].replace('\\n', ' | '))
        print('COVERAGE:', stats['coverage'].replace('\\n', ' | '))
        print('CARDS:', stats['cards'], 'loaded_imgs:', sum(stats['imgs']), '/', len(stats['imgs']))
        print('UNUSED_TAGS:', stats['unused'])

        page.screenshot(path=f'{OUT}\\check_full.png', full_page=True)
        page.locator('#grid .card').first.click()
        page.wait_for_timeout(600)
        page.screenshot(path=f'{OUT}\\check_detail.png')
        detail = page.evaluate("""() => ({
            checks: [...document.querySelectorAll('#detail .tagrow .tag')].map(t => t.textContent.trim()),
            manifestCount: document.querySelectorAll('#detail .mf').length,
        })""")
        print('DETAIL_CHECKS:', json.dumps(detail['checks'], ensure_ascii=False))
        print('DETAIL_MANIFEST_COUNT:', detail['manifestCount'])
    else:
        page.screenshot(path=f'{OUT}\\check_stuck.png', full_page=True)

    print('CONSOLE_ERRORS:', json.dumps(errors[:20], ensure_ascii=False, indent=1))
    print('ERROR_COUNT:', len(errors))
    browser.close()
