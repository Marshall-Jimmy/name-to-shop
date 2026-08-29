import json
import time

from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5174'
OUT = r'd:\WorkingSpace\name-to-shop\test\shots'

errors = []
pages_info = {}

def watch(page):
    page.on('console', lambda m: errors.append(f'[{m.type}] {m.text}') if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(f'[pageerror] {e}'))

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ---------- 桌面流程 ----------
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    watch(page)
    page.goto(BASE, timeout=60000)
    page.wait_for_load_state('networkidle')

    # 等 typing 状态（HUD 输入卡出现）
    page.wait_for_selector('.nts-input.on', timeout=60000)
    time.sleep(1.5)
    page.screenshot(path=f'{OUT}\\desktop_typing.png')

    # 输入名字 → 开业
    page.fill('.nts-input input', '摸鱼大师')
    page.click('.nts-input .go')
    page.wait_for_selector('.nts-dock.on', timeout=30000)
    page.wait_for_selector('.nts-top.on', timeout=30000)
    time.sleep(4)  # 等运镜+破土动画
    page.screenshot(path=f'{OUT}\\desktop_shop.png')
    top = page.evaluate("document.querySelector('.nts-top .nm')?.textContent")
    dock_btns = page.evaluate("[...document.querySelectorAll('.nts-dock .nts-btn .lb')].map(e => e.textContent)")
    pages_info['topbar'] = top
    pages_info['dock'] = dock_btns

    # 飞行
    page.click('.nts-dock .nts-btn:has(.lb:text-is("起飞"))')
    time.sleep(3.5)
    page.screenshot(path=f'{OUT}\\desktop_fly.png')
    fly_label = page.evaluate("[...document.querySelectorAll('.nts-dock .nts-btn .lb')].map(e => e.textContent)")
    pages_info['fly_label'] = fly_label
    page.click('.nts-dock .nts-btn:has(.lb:text-is("降落"))')

    # 进店
    time.sleep(2.5)
    page.click('.nts-dock .nts-btn:has(.lb:text-is("进店"))')
    time.sleep(3.5)
    page.screenshot(path=f'{OUT}\\desktop_inside.png')
    pages_info['door_label'] = page.evaluate("[...document.querySelectorAll('.nts-dock .nts-btn .lb')].map(e => e.textContent)")

    # 出店 + 图鉴 modal
    page.click('.nts-dock .nts-btn:has(.lb:text-is("出店"))')
    time.sleep(3)
    page.click('.nts-dock .nts-btn:has(.lb:text-is("图鉴"))')
    page.wait_for_selector('.nts-modal.on', timeout=10000)
    time.sleep(0.8)
    page.screenshot(path=f'{OUT}\\desktop_dex.png')
    pages_info['dex_cells'] = page.evaluate("[...document.querySelectorAll('.dex-cell .v')].map(e => e.textContent)")
    pages_info['dex_items'] = page.evaluate("document.querySelectorAll('.dex-item').length")
    page.click('.nts-modal .x')
    time.sleep(0.5)

    # 彩蛋手册
    page.click('.nts-dock .nts-btn:has(.lb:text-is("彩蛋"))')
    page.wait_for_selector('.nts-modal.on', timeout=10000)
    time.sleep(0.8)
    page.screenshot(path=f'{OUT}\\desktop_eggs.png')
    pages_info['egg_title'] = page.evaluate("document.querySelector('.nts-modal h2')?.textContent")
    pages_info['egg_unlocked'] = page.evaluate("document.querySelectorAll('.egg-cell:not(.locked)').length")
    page.click('.nts-modal .x')

    # 截图按钮（下载事件）
    time.sleep(1)
    with page.expect_download(timeout=20000) as dl:
        page.click('.nts-dock .nts-btn:has(.lb:text-is("截图"))')
    pages_info['screenshot_download'] = dl.value.suggested_filename

    # ---------- 移动端视口 ----------
    errors2 = []
    mpage = browser.new_page(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    mpage.on('console', lambda m: errors2.append(f'[{m.type}] {m.text}') if m.type == 'error' else None)
    mpage.on('pageerror', lambda e: errors2.append(f'[pageerror] {e}'))
    mpage.goto(f'{BASE}?name=张三', timeout=60000)
    mpage.wait_for_load_state('networkidle')
    mpage.wait_for_selector('.nts-dock.on', timeout=60000)
    time.sleep(4.5)
    mpage.screenshot(path=f'{OUT}\\mobile_shop.png')
    pages_info['mobile_dock_overflow'] = mpage.evaluate("""() => {
        const d = document.querySelector('.nts-dock')
        return { scrollW: d.scrollWidth, clientW: d.clientWidth, overflow: d.scrollWidth > d.clientWidth + 2 }
    }""")
    # 触摸点进店
    mpage.tap('.nts-dock .nts-btn:has(.lb:text-is("进店"))')
    time.sleep(3.5)
    mpage.screenshot(path=f'{OUT}\\mobile_inside.png')
    browser.close()

print(json.dumps(pages_info, ensure_ascii=False, indent=1))
print('DESKTOP_ERRORS:', json.dumps(errors[:15], ensure_ascii=False, indent=1))
print('DESKTOP_ERROR_COUNT:', len(errors))
print('MOBILE_ERRORS:', json.dumps(errors2[:10], ensure_ascii=False, indent=1))
print('MOBILE_ERROR_COUNT:', len(errors2))
