// 屏幕 HUD：玻璃拟态操作坞 + 顶栏铭牌 + 输入卡 + Toast + 图鉴/彩蛋手册
// （用户已放宽"零 DOM"约束：可点击 UI 一律嵌屏，展示类 3D 元素保留在场景中）
import eggsJson from '../data/eggs.json'

const FONT = `"PingFang SC","Microsoft YaHei",system-ui,-apple-system,sans-serif`
const GOLD = '#ffd166'

const ICONS = {
  door: '<path d="M15 3v18M15 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h9M15 12h2"/>',
  exit: '<path d="M9 3H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h4M14 8l4 4-4 4M18 12H8"/>',
  rocket: '<path d="M12 2c3 2 5 6 5 10l-2 3h-6l-2-3c0-4 2-8 5-10zM12 15v7M9 12l-3 3v3l3-1M15 12l3 3v3l-3-1"/><circle cx="12" cy="9" r="1.4"/>',
  land: '<path d="M12 22V8M12 8c3 0 5 2 5 5H7c0-3 2-5 5-5zM7 18l-3 2M17 18l3 2M4 14h3M17 14h3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
  cube: '<path d="M12 2l9 5v10l-9 5-9-5V7l9-5zM12 12l9-5M12 12L3 7M12 12v10"/>',
  link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>',
  star: '<path d="M12 2l3 6.5 7 .9-5.2 4.8 1.5 6.8L12 17.5 5.7 21l1.5-6.8L2 9.4l7-.9L12 2z"/>',
  pencil: '<path d="M17 3l4 4L8 20l-5 1 1-5L17 3zM14 6l4 4"/>',
  sound: '<path d="M11 5L6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  mute: '<path d="M11 5L6 9H3v6h3l5 4V5zM22 9l-6 6M16 9l6 6"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" stroke="none"/>',
  book: '<path d="M4 4a2 2 0 0 1 2-2h14v18H6a2 2 0 0 0-2 2V4zM20 16H6a2 2 0 0 0-2 2"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 15l.9 2.6L22.5 18.5l-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9L19 15z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  daily: '<path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6 6L4.5 4.5M18 6l1.5-1.5M6 18l-1.5 1.5M18 18l1.5 1.5"/><circle cx="12" cy="12" r="4"/>',
}

function svg(name, size = 22) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`
}

const RARE_META = {
  N: { c: '#9aa7bd', g: 'linear-gradient(135deg,#4a5568,#2d3748)' },
  R: { c: '#7ec8ff', g: 'linear-gradient(135deg,#4f8cff,#2b5fd9)' },
  SR: { c: '#c9b8ff', g: 'linear-gradient(135deg,#9d8cff,#6a4fd9)' },
  SSR: { c: '#ffe6a8', g: 'linear-gradient(135deg,#ffd166,#ff9d3d)' },
  UR: { c: '#ffb3c4', g: 'linear-gradient(135deg,#ff6b81,#d9376e)' },
}

// ---------- 随机名词库 & 每日挑战 ----------
const RAND_A = ['深夜', '贪睡的', '金色的', '赛博', '巷口', '会飞的', '退休的', '暴走的', '温柔的', '无敌', '孤独的', '顶楼', '雨天', '发光的', '云上']
const RAND_B = ['拉面王', '猫店长', '咖啡骑士', '汉堡侠', '书虫本铺', '花间小卖部', '占卜屋', '唱片收容所', '钟表匠', '奶茶炼金师', '杂货猎人', '药水调配处', '理发诗人', '玩具修理所']
const DAILY_POOL = ['摸鱼大师', '雪糕刺客', '遥遥领先', '尊嘟假嘟', '泰裤辣', '猫猫咖啡', '龙之屋', '躺平主义', '显眼包', '电子榨菜', '星之梦', '月下占卜']

export function randomName(rng = Math.random) {
  return RAND_A[Math.floor(rng() * RAND_A.length)] + RAND_B[Math.floor(rng() * RAND_B.length)]
}
export function dailyName() {
  const d = new Date()
  const key = d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate()
  return DAILY_POOL[key % DAILY_POOL.length]
}

// ---------- 彩蛋解锁存档 ----------
function loadUnlocked() {
  try { return JSON.parse(localStorage.getItem('nts-eggs')) || [] } catch { return [] }
}
function recordUnlocked(eggs) {
  const u = new Set(loadUnlocked())
  for (const e of eggs) u.add(e.t)
  localStorage.setItem('nts-eggs', JSON.stringify([...u]))
}

const CSS = `
.nts-root { position: fixed; inset: 0; pointer-events: none; z-index: 50;
  font-family: ${FONT}; color: #eef2fa; user-select: none; -webkit-tap-highlight-color: transparent; }
.nts-root * { box-sizing: border-box; }

/* ---- 顶部铭牌 ---- */
.nts-top { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 14px); left: 14px;
  max-width: calc(50vw - 28px);
  display: flex; align-items: center; gap: 10px; padding: 10px 16px 10px 12px;
  background: rgba(13,17,29,.78); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,.09); border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,.35);
  opacity: 0; transform: translateY(-14px); transition: opacity .4s, transform .45s cubic-bezier(.2,1.4,.4,1); }
.nts-top.on { opacity: 1; transform: none; }
.nts-top .badge { min-width: 46px; height: 46px; border-radius: 13px; display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 800; letter-spacing: .5px; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,.35);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 4px 14px rgba(0,0,0,.3); }
.nts-top > div:last-child { min-width: 0; }
.nts-top .nm { font-size: clamp(16px, 2.4vw, 21px); font-weight: 800; letter-spacing: .02em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nts-top .meta { font-size: 12px; color: #aab6cc; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

/* ---- 底部操作坞 ---- */
.nts-dock { position: absolute; left: 50%; transform: translateX(-50%) translateY(130%);
  bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  display: flex; align-items: center; gap: 4px; padding: 7px;
  background: rgba(13,17,29,.8); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(255,255,255,.1); border-radius: 22px;
  box-shadow: 0 12px 40px rgba(0,0,0,.45);
  transition: transform .5s cubic-bezier(.2,1.3,.35,1), opacity .35s; opacity: 0; }
.nts-dock.on { transform: translateX(-50%); opacity: 1; }
.nts-dock .sep { width: 1px; height: 26px; background: rgba(255,255,255,.12); margin: 0 5px; }
.nts-btn { pointer-events: auto; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 58px; height: 58px; border-radius: 16px; border: 1px solid transparent; background: transparent; color: #c6d2e6;
  cursor: pointer; transition: background .18s, color .18s, transform .12s; }
.nts-btn:hover { background: rgba(255,255,255,.08); color: #fff; }
.nts-btn:active { transform: scale(.9); background: rgba(255,255,255,.12); }
.nts-btn.hero { background: rgba(255,209,102,.16); color: ${GOLD}; border-color: rgba(255,209,102,.35); }
.nts-btn.hero:hover { background: rgba(255,209,102,.24); color: #ffe6a8; }
.nts-btn .lb { font-size: 10px; margin-top: 3px; font-weight: 600; letter-spacing: .06em; }
.nts-btn .tip { position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%) translateY(4px);
  padding: 5px 11px; border-radius: 9px; background: rgba(20,26,42,.95); border: 1px solid rgba(255,255,255,.12);
  font-size: 12px; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity .18s, transform .18s; }
.nts-btn:hover .tip { opacity: 1; transform: translateX(-50%); }

/* ---- 输入卡（typing）---- */
.nts-input { position: absolute; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 126px);
  transform: translateX(-50%) translateY(-22px) scale(.98);
  width: min(560px, calc(100vw - 28px));
  padding: 18px; border-radius: 22px;
  background: rgba(13,17,29,.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,209,102,.28);
  box-shadow: 0 16px 56px rgba(0,0,0,.5), 0 0 0 1px rgba(255,209,102,.06);
  transition: transform .55s cubic-bezier(.2,1.3,.35,1), opacity .35s; opacity: 0; pointer-events: none; }
.nts-input.on { transform: translateX(-50%); opacity: 1; pointer-events: auto; }
.nts-input .row { display: flex; gap: 10px; }
.nts-input input { flex: 1; min-width: 0; height: 54px; padding: 0 18px; border-radius: 15px;
  border: 1.5px solid rgba(255,255,255,.14); background: rgba(8,11,20,.6);
  color: #fff; font-family: ${FONT}; font-size: 19px; font-weight: 600; outline: none;
  transition: border-color .2s, box-shadow .2s; }
.nts-input input:focus { border-color: rgba(255,209,102,.65); box-shadow: 0 0 0 4px rgba(255,209,102,.12); }
.nts-input input::placeholder { color: #5c6a84; font-weight: 400; }
.nts-input .go { height: 54px; padding: 0 24px; border-radius: 15px; border: none; cursor: pointer;
  background: linear-gradient(135deg,#ffd166,#ff9d3d); color: #3d2800; font-family: ${FONT};
  font-size: 16px; font-weight: 800; letter-spacing: .05em;
  box-shadow: 0 6px 20px rgba(255,157,61,.35); transition: transform .15s, filter .2s; pointer-events: auto; }
.nts-input .go:hover { filter: brightness(1.08); }
.nts-input .go:active { transform: scale(.94); }
.nts-input .go:disabled { opacity: .4; cursor: default; }
.nts-chips { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; }
.nts-chip { pointer-events: auto; padding: 6px 13px; border-radius: 999px; cursor: pointer;
  border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05);
  color: #b9c5dc; font-size: 12.5px; transition: all .18s; }
.nts-chip:hover { border-color: rgba(255,209,102,.5); color: #ffe6a8; background: rgba(255,209,102,.08); }

/* ---- Toast ---- */
.nts-toasts { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 14px); right: 14px;
  display: flex; flex-direction: column; align-items: stretch; gap: 8px; width: min(480px, calc(50vw - 28px)); }
.nts-toast { display: flex; align-items: center; gap: 10px; max-width: 100%; padding: 10px 18px; border-radius: 14px;
  background: rgba(13,17,29,.92); backdrop-filter: blur(14px); border: 1px solid rgba(255,255,255,.1);
  box-shadow: 0 10px 34px rgba(0,0,0,.4);
  animation: ntsIn .45s cubic-bezier(.2,1.4,.4,1); }
.nts-toast.bye { animation: ntsOut .3s forwards; }
.nts-toast .dot { width: 9px; height: 9px; border-radius: 50%; flex: none; box-shadow: 0 0 10px currentColor; }
.nts-toast .tx { font-size: 14px; font-weight: 700; }
.nts-toast .sub { font-size: 12px; color: #9fadc6; margin-top: 1px; }
@keyframes ntsIn { from { opacity: 0; transform: translateY(-18px) scale(.92); } }
@keyframes ntsOut { to { opacity: 0; transform: translateY(-10px) scale(.95); } }

/* ---- Modal ---- */
.nts-modal-bg { position: absolute; inset: 0; background: rgba(5,8,15,.62); backdrop-filter: blur(6px);
  opacity: 0; transition: opacity .3s; pointer-events: none; }
.nts-modal-bg.on { opacity: 1; pointer-events: auto; }
.nts-modal { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-48%) scale(.96);
  width: min(680px, calc(100vw - 24px)); max-height: min(78vh, 720px);
  display: flex; flex-direction: column; border-radius: 22px; overflow: hidden;
  background: rgba(15,19,32,.96); border: 1px solid rgba(255,255,255,.1);
  box-shadow: 0 24px 90px rgba(0,0,0,.6);
  opacity: 0; transition: opacity .3s, transform .35s cubic-bezier(.2,1.3,.4,1); pointer-events: none; }
.nts-modal.on { opacity: 1; transform: translate(-50%,-50%); pointer-events: auto; }
.nts-modal .hd { display: flex; align-items: center; gap: 10px; padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(255,255,255,.08); }
.nts-modal .hd .ic { width: 38px; height: 38px; border-radius: 11px; display: flex; align-items: center; justify-content: center;
  background: rgba(255,209,102,.14); color: ${GOLD}; }
.nts-modal .hd h2 { font-size: 18px; font-weight: 800; flex: 1; }
.nts-modal .hd .x { pointer-events: auto; width: 34px; height: 34px; border-radius: 10px; border: none; cursor: pointer;
  background: rgba(255,255,255,.07); color: #aab6cc; display: flex; align-items: center; justify-content: center; }
.nts-modal .hd .x:hover { background: rgba(255,255,255,.14); color: #fff; }
.nts-modal .bd { overflow-y: auto; padding: 16px 20px 20px; overscroll-behavior: contain; }

/* 图鉴统计条 */
.dex-prog { display: flex; gap: 10px; margin-bottom: 16px; }
.dex-cell { flex: 1; padding: 12px 14px; border-radius: 14px; background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.07); }
.dex-cell .v { font-size: 22px; font-weight: 800; color: ${GOLD}; }
.dex-cell .k { font-size: 11px; color: #8d99b3; margin-top: 2px; }
.dex-cell .bar { height: 4px; border-radius: 2px; background: rgba(255,255,255,.09); margin-top: 8px; overflow: hidden; }
.dex-cell .bar > i { display: block; height: 100%; background: linear-gradient(90deg,#ffd166,#ff9d3d); border-radius: 2px; }
.dex-list { display: flex; flex-direction: column; gap: 8px; }
.dex-item { pointer-events: auto; display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 13px;
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); cursor: pointer; transition: all .18s; text-align: left; }
.dex-item:hover { border-color: rgba(255,209,102,.45); background: rgba(255,209,102,.06); }
.dex-item .r { width: 34px; height: 34px; border-radius: 9px; flex: none; display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800; color: #fff; }
.dex-item .nm { font-weight: 700; font-size: 14.5px; }
.dex-item .mt { font-size: 11.5px; color: #8d99b3; margin-top: 1px; }
.dex-item .go2 { margin-left: auto; color: #5c6a84; }
.dex-item:hover .go2 { color: ${GOLD}; }
.dex-empty { text-align: center; color: #6b7891; font-size: 13px; padding: 28px 0; }

/* 彩蛋手册 */
.egg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; }
.egg-cell { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px;
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); }
.egg-cell.locked { opacity: .55; }
.egg-cell .eic { width: 30px; height: 30px; border-radius: 9px; flex: none; display: flex; align-items: center; justify-content: center;
  background: rgba(255,157,226,.14); color: #ff9de2; }
.egg-cell.locked .eic { background: rgba(255,255,255,.06); color: #5c6a84; }
.egg-cell .t { font-size: 12.5px; font-weight: 700; }
.egg-cell .d { font-size: 11px; color: #8d99b3; margin-top: 1px; }

@media (max-width: 640px) {
  .nts-dock { width: min(360px, calc(100vw - 16px)); display: grid; grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 2px; padding: 6px; border-radius: 20px; }
  .nts-dock .sep { display: none; }
  .nts-btn { width: auto; min-width: 0; height: 52px; }
  .nts-btn .tip { display: none; }
  .nts-top { max-width: calc(100vw - 28px); padding: 8px 12px; }
  .nts-top .nm { font-size: 15px; }
  .nts-toasts { top: calc(env(safe-area-inset-top, 0px) + 104px); left: 14px; right: 14px; width: auto; }
  .nts-toast { width: 100%; }
  .nts-input { top: calc(env(safe-area-inset-top, 0px) + 112px); padding: 14px; }
  .nts-input input { height: 48px; font-size: 17px; }
  .nts-input .go { height: 48px; padding: 0 18px; }
  .dex-prog { flex-direction: column; gap: 7px; }
}
@media (max-height: 560px) and (min-width: 641px) {
  .nts-input { left: 14px; top: calc(env(safe-area-inset-top, 0px) + 14px); width: min(420px, calc(50vw - 20px));
    padding: 12px; transform: translateY(-18px) scale(.98); }
  .nts-input.on { transform: none; }
  .nts-input input, .nts-input .go { height: 46px; }
  .nts-chips { margin-top: 8px; gap: 5px; }
  .nts-chip { padding: 4px 9px; font-size: 11.5px; }
}
@media (hover: none) {
  .nts-btn:hover { background: transparent; color: #c6d2e6; }
  .nts-btn.hero:hover { background: rgba(255,209,102,.16); color: ${GOLD}; }
}
`

function maskWord(t) {
  if (!t) return '？'
  if (t.length <= 1) return '关键词只有 1 个字'
  if (/^[a-z0-9]+$/i.test(t)) return t[0] + '×'.repeat(t.length - 1)
  return t[0] + '×'.repeat(t.length - 1)
}

export class HUD {
  constructor({ onAction }) {
    this.onAction = onAction
    this._injectCss()
    this._build()
    this._lastInput = ''
  }

  _injectCss() {
    const s = document.createElement('style')
    s.textContent = CSS
    document.head.appendChild(s)
  }

  _build() {
    const root = document.createElement('div')
    root.className = 'nts-root'
    root.innerHTML = `
      <div class="nts-top">
        <div class="badge"></div>
        <div><div class="nm"></div><div class="meta"></div></div>
      </div>
      <div class="nts-toasts"></div>
      <div class="nts-dock"></div>
      <div class="nts-input">
        <div class="row">
          <input maxlength="16" aria-label="店铺名字" placeholder="输入任何名字… 中文 / 英文 / 数字 / emoji" />
          <button class="go" type="button">开业</button>
        </div>
        <div class="nts-chips"></div>
      </div>
      <div class="nts-modal-bg"></div>
      <div class="nts-modal"><div class="hd"><div class="ic"></div><h2></h2><button class="x" type="button" aria-label="关闭">${svg('x', 18)}</button></div><div class="bd"></div></div>`
    document.body.appendChild(root)
    this.root = root
    this.top = root.querySelector('.nts-top')
    this.dock = root.querySelector('.nts-dock')
    this.inputCard = root.querySelector('.nts-input')
    this.input = root.querySelector('.nts-input input')
    this.goBtn = root.querySelector('.nts-input .go')
    this.chips = root.querySelector('.nts-chips')
    this.toasts = root.querySelector('.nts-toasts')
    this.modalBg = root.querySelector('.nts-modal-bg')
    this.modal = root.querySelector('.nts-modal')

    this._buildDock()
    this._bindInput()
    this.modalBg.onclick = () => this.hideModal()
    this.modal.querySelector('.x').onclick = () => this.hideModal()
  }

  _buildDock() {
    const BTNS = [
      { id: 'door', icon: 'door', label: '进店', label2: '出店', hero: true },
      { id: 'fly', icon: 'rocket', label: '起飞', label2: '降落', hero: true },
      { sep: true },
      { id: 'camera', icon: 'camera', label: '截图' },
      { id: 'cube', icon: 'cube', label: '导出' },
      { id: 'link', icon: 'link', label: '分享' },
      { id: 'star', icon: 'star', label: '稀有度' },
      { sep: true },
      { id: 'dex', icon: 'book', label: '图鉴' },
      { id: 'eggs', icon: 'spark', label: '彩蛋' },
      { id: 'pencil', icon: 'pencil', label: '改名' },
      { id: 'sound', icon: 'sound', label: '音效', label2: '静音' },
    ]
    this.btnEls = new Map()
    for (const b of BTNS) {
      if (b.sep) { const s = document.createElement('div'); s.className = 'sep'; this.dock.appendChild(s); continue }
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'nts-btn' + (b.hero ? ' hero' : '')
      el.setAttribute('aria-label', b.label)
      el.innerHTML = `${svg(b.icon)}<span class="lb">${b.label}</span><span class="tip" aria-hidden="true">${b.label}</span>`
      el.onclick = () => this.onAction?.(b.id)
      this.dock.appendChild(el)
      this.btnEls.set(b.id, { el, cfg: b })
    }
  }

  setButtonState(id, alt) {
    const b = this.btnEls.get(id)
    if (!b) return
    const { cfg } = b
    b.el.querySelector('svg').outerHTML = svg(alt && cfg.icon2 ? cfg.icon2 : cfg.icon)
    b.el.querySelector('.lb').textContent = alt && cfg.label2 ? cfg.label2 : cfg.label
    b.el.querySelector('.tip').textContent = alt && cfg.label2 ? cfg.label2 : cfg.label
    b.el.setAttribute('aria-label', alt && cfg.label2 ? cfg.label2 : cfg.label)
  }

  _bindInput() {
    const commit = () => {
      const n = this.input.value.trim()
      if (!n) { this.shakeInput(); return }
      this.onAction?.('confirmName', n)
    }
    this.goBtn.onclick = commit
    this.input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit() }
    })
    this.input.addEventListener('input', () => {
      this._lastInput = this.input.value
      this.onAction?.('typing', this.input.value)
    })
  }

  shakeInput() {
    this.inputCard.animate(
      [{ translate: '0 0' }, { translate: '-7px 0' },
       { translate: '7px 0' }, { translate: '0 0' }],
      { duration: 260, easing: 'ease-in-out' })
  }

  showInput(name = '') {
    this.input.value = name
    this.inputCard.classList.add('on')
    setTimeout(() => { if (window.matchMedia('(pointer: fine)').matches) this.input.focus() }, 450)
  }
  hideInput() { this.inputCard.classList.remove('on'); this.input.blur() }

  setChips(list) {
    this.chips.innerHTML = ''
    for (const c of list) {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'nts-chip'
      el.textContent = c.label
      el.onclick = () => this.onAction?.(c.action, c.value ?? c.label)
      this.chips.appendChild(el)
    }
  }

  showTop(dna) {
    const rm = RARE_META[dna.rarity] || RARE_META.N
    this.top.querySelector('.badge').style.background = rm.g
    this.top.querySelector('.badge').textContent = dna.rarity
    this.top.querySelector('.nm').textContent = `${dna.name}的店`
    this.top.querySelector('.meta').textContent = `${dna.business.name} × ${dna.style.name} · ${dna.lighting.name}`
    this.top.title = `${dna.name}的店 · ${dna.business.name} × ${dna.style.name} · ${dna.lighting.name}`
    this.top.classList.add('on')
  }
  hideTop() { this.top.classList.remove('on') }

  showDock() { this.dock.classList.add('on') }
  hideDock() { this.dock.classList.remove('on') }

  // ---------- Toast ----------
  toast(text, { color = GOLD, sub = null, dur = 3.2 } = {}) {
    const el = document.createElement('div')
    el.className = 'nts-toast'
    el.innerHTML = `<div class="dot" style="background:${color};color:${color}"></div>
      <div>${text ? `<div class="tx"></div>` : ''}${sub ? `<div class="sub"></div>` : ''}</div>`
    el.querySelector('.tx')?.replaceChildren(text)
    el.querySelector('.sub')?.replaceChildren(sub)
    this.toasts.appendChild(el)
    while (this.toasts.children.length > 4) this.toasts.firstChild.remove()
    setTimeout(() => { el.classList.add('bye'); setTimeout(() => el.remove(), 320) }, dur * 1000)
  }

  // ---------- Modal ----------
  showModal({ title, icon }) {
    this.modal.querySelector('h2').textContent = title
    this.modal.querySelector('.hd .ic').innerHTML = svg(icon, 20)
    this.modal.classList.add('on')
    this.modalBg.classList.add('on')
  }
  hideModal() { this.modal.classList.remove('on'); this.modalBg.classList.remove('on') }
  get modalOpen() { return this.modal.classList.contains('on') }

  showDex({ stats, entries, onVisit }) {
    const rm = id => RARE_META[id] || RARE_META.N
    const pct = (a, b) => b ? Math.round(a / b * 100) : 0
    this.showModal({ title: '店铺图鉴', icon: 'book' })
    const bd = this.modal.querySelector('.bd')
    bd.innerHTML = `
      <div class="dex-prog">
        <div class="dex-cell"><div class="v">${stats.count}</div><div class="k">已造店铺</div></div>
        <div class="dex-cell"><div class="v">${stats.biz}/${stats.bizTotal}</div><div class="k">业态收集</div>
          <div class="bar"><i style="width:${pct(stats.biz, stats.bizTotal)}%"></i></div></div>
        <div class="dex-cell"><div class="v">${stats.styles}/${stats.styleTotal}</div><div class="k">风格收集</div>
          <div class="bar"><i style="width:${pct(stats.styles, stats.styleTotal)}%"></i></div></div>
        <div class="dex-cell"><div class="v">${stats.eggs}</div><div class="k">彩蛋解锁</div></div>
      </div>
      <div class="dex-list"></div>`
    const list = bd.querySelector('.dex-list')
    if (!entries.length) {
      list.innerHTML = `<div class="dex-empty">还没有店铺 · 输入名字开始第一家</div>`
    } else {
      for (const e of [...entries].reverse().slice(0, 24)) {
        const el = document.createElement('button')
        el.type = 'button'
        el.className = 'dex-item'
        const m = rm(e.rarity)
        el.innerHTML = `<div class="r" style="background:${m.g}">${e.rarity}</div>
          <div><div class="nm"></div><div class="mt">${e.bizName || e.biz} · ${e.styleName || e.style}</div></div>
          <div class="go2">${svg('back', 16)}</div>`
        el.querySelector('.nm').textContent = e.name
        el.onclick = () => { this.hideModal(); onVisit?.(e.name) }
        list.appendChild(el)
      }
    }
  }

  showEggs() {
    const unlocked = new Set(loadUnlocked())
    const eggs = eggsJson.eggs || []
    this.showModal({ title: `彩蛋手册 · ${unlocked.size}/${eggs.length}`, icon: 'spark' })
    const bd = this.modal.querySelector('.bd')
    bd.innerHTML = `<div class="egg-grid"></div>
      <div style="margin-top:14px;color:#6b7891;font-size:12px;text-align:center">输入包含关键词的名字即可触发 · 有些彩蛋自带稀有度加成</div>`
    const grid = bd.querySelector('.egg-grid')
    for (const e of eggs) {
      const on = unlocked.has(e.t)
      const el = document.createElement('div')
      el.className = 'egg-cell' + (on ? '' : ' locked')
      el.innerHTML = `<div class="eic">${svg(on ? 'spark' : 'x', 15)}</div>
        <div><div class="t"></div><div class="d"></div></div>`
      el.querySelector('.t').textContent = on ? (e.n || e.t) : '？？？'
      el.querySelector('.d').textContent = on ? (e.sub || '') : `触发词：${maskWord(e.t)}`
      grid.appendChild(el)
    }
  }

  recordEggs(eggs) { if (eggs?.length) recordUnlocked(eggs) }
  unlockedCount() { return loadUnlocked().length }
  get inputValue() { return this.input.value }
  set inputValue(v) { this.input.value = v }
}
