// 3D 打字机（造物台）：Raycaster 点按键打字 + 物理键盘双通道，全部 3D 无 DOM
import * as THREE from 'three/webgpu'
import { panelTexture, roundedPanel, FONT } from './sprites.js'
import { makeRng } from '../core/rng.js'
import { sfx } from '../core/audio.js'

const ROWS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']
const KEY_W = 0.36, KEY_H = 0.1, KEY_D = 0.36, GAP = 0.048

const NAME_HEADS = ['咕噜', '阿福', '小满', '猫又', '半糖', '云吞', '芝麻', '柚子', '桃酥', '栗子', '豆蔻', '青梅', '抹茶', '糯米', '汤圆', '灯芯', '拾光', '南山', '拾贝', '鲸落', '鹿鸣', '知秋', '夏至', '白露', '惊蛰', '谷雨', '一夜', '大橘', '旺财', '来福']
const NAME_TAILS = ['', '', '', '猫', '酱', '君', '桑', '老板', '师傅', '小铺', '食堂', '研究所']

function keyTopTexture(label, accent = '#e8e4d8') {
  return panelTexture(`key-${label}`, 128, 128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128)
    roundedPanel(ctx, 116, 116, 26, {
      bg: 'rgba(38,44,60,0.94)', border: 'rgba(255,255,255,0.16)', borderWidth: 2.5,
    })
    ctx.translate(6, 6)
    ctx.font = `700 ${label.length > 2 ? 34 : 52}px ${FONT}`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = accent
    ctx.fillText(label, 58, 62)
  })
}

export class Typewriter {
  constructor() {
    this.group = new THREE.Group()
    this.name = ''
    this.keys = []
    this.hoverKey = null
    this.enterReady = false
    this.onName = null
    this.onChange = null
    this._build()
  }

  _build() {
    const g = this.group

    // 云台
    const platMat = new THREE.MeshStandardMaterial({ color: 0x8fa8c8, roughness: 0.85 })
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.8, 0.5, 42), platMat)
    plat.position.y = -0.42
    plat.receiveShadow = true
    g.add(plat)
    const platTop = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.4, 0.06, 42),
      new THREE.MeshStandardMaterial({ color: 0xc8d8ec, roughness: 0.6 }),
    )
    platTop.position.y = -0.15
    platTop.receiveShadow = true
    g.add(platTop)

    // 打字机机身
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2c3a50, roughness: 0.45, metalness: 0.35 })
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.34, 2.1), bodyMat)
    body.position.set(0, 0.0, 0)
    body.castShadow = true; body.receiveShadow = true
    g.add(body)
    // 铜色边条
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9a24b, roughness: 0.3, metalness: 0.85 })
    const trimF = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.07, 0.09), brass)
    trimF.position.set(0, -0.14, 1.05)
    g.add(trimF)

    // 斜键盘面（绕 X 前倾）
    const deck = new THREE.Group()
    deck.rotation.x = -0.16
    deck.position.set(0, 0.2, 0.35)
    g.add(deck)

    const keyBodyMat = new THREE.MeshStandardMaterial({ color: 0x3a4256, roughness: 0.5, metalness: 0.2 })

    const addKey = (label, x, z, w = KEY_W, accent, opts = {}) => {
      const kg = new THREE.Group()
      const geo = new THREE.BoxGeometry(w, KEY_H, KEY_D)
      const keyMesh = new THREE.Mesh(geo, keyBodyMat)
      keyMesh.castShadow = true
      kg.add(keyMesh)
      const top = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.94, KEY_D * 0.94),
        new THREE.MeshStandardMaterial({
          map: keyTopTexture(label, accent), transparent: true, roughness: 0.55,
          emissive: 0xffffff, emissiveMap: keyTopTexture(label, accent), emissiveIntensity: 0.22,
        }),
      )
      top.rotation.x = -Math.PI / 2
      top.position.y = KEY_H / 2 + 0.002
      kg.add(top)
      kg.position.set(x, 0, z)
      kg.userData = { label, key: 'k', baseY: 0, w, ...opts }
      deck.add(kg)
      this.keys.push(kg)
      return kg
    }

    // 字母/数字行
    let totalW = 10 * KEY_W + 9 * GAP
    ROWS.forEach((row, ri) => {
      const rw = row.length * KEY_W + (row.length - 1) * GAP
      for (let i = 0; i < row.length; i++) {
        addKey(row[i], -rw / 2 + KEY_W / 2 + i * (KEY_W + GAP), -ri * (KEY_D + GAP))
      }
    })

    // 功能行
    const fy = 3 * (KEY_D + GAP) + 0.1
    const addFn = (label, x, w, accent, action, key) => {
      const k = addKey(label, x, fy, w, accent, { fn: action, key })
      k.userData.fnKey = true
      return k
    }
    addFn('清空', -totalW / 2 + 0.5, 0.96, '#9fb4d8', () => this.setName(''), 'clear')
    addFn('删除', -totalW / 2 + 1.56, 0.96, '#9fb4d8', () => this.backspace(), 'back')
    addFn('骰子', -totalW / 2 + 2.62, 0.96, '#ffd166', () => this.rollName(), 'dice')
    addFn('空格', 0.2, 1.7, '#9fb4d8', () => this.addChar(' '), 'space')
    // 开业大按钮（右侧独立，不斜放，圆形）
    const enterGroup = new THREE.Group()
    const enterBase = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.16, 32),
      new THREE.MeshStandardMaterial({ color: 0x8c2f39, roughness: 0.4, metalness: 0.2 }))
    enterBase.castShadow = true
    const enterTex = panelTexture('key-enter', 160, 160, (ctx) => {
      ctx.clearRect(0, 0, 160, 160)
      ctx.beginPath(); ctx.arc(80, 80, 68, 0, 7)
      ctx.fillStyle = 'rgba(255,110,110,0.14)'; ctx.fill()
      ctx.lineWidth = 5; ctx.strokeStyle = '#ff8896'; ctx.stroke()
      ctx.font = `800 54px ${FONT}`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = '#ffd9dd'
      ctx.fillText('开', 80, 60)
      ctx.fillText('业', 80, 116)
    })
    const enterTop = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 32),
      new THREE.MeshStandardMaterial({
        map: enterTex, transparent: true,
        emissive: 0xff5566, emissiveMap: enterTex, emissiveIntensity: 0.55,
      }),
    )
    enterTop.rotation.x = -Math.PI / 2
    enterTop.position.y = 0.085
    enterGroup.add(enterBase, enterTop)
    enterGroup.position.set(2.62, 0.32, 0.55)
    enterGroup.userData = { label: '开业', key: 'enter', baseY: 0.32, fn: () => this.confirm(), enter: true }
    this.group.add(enterGroup)
    this.keys.push(enterGroup)
    this.enterKey = enterGroup

    // 显示屏（名字）
    this.displayCanvas = document.createElement('canvas')
    this.displayCanvas.width = 900; this.displayCanvas.height = 220
    this.displayTex = new THREE.CanvasTexture(this.displayCanvas)
    this.displayTex.colorSpace = THREE.SRGBColorSpace
    const display = new THREE.Mesh(
      new THREE.PlaneGeometry(3.9, 0.95),
      new THREE.MeshStandardMaterial({
        map: this.displayTex, transparent: true,
        emissive: 0xffffff, emissiveMap: this.displayTex, emissiveIntensity: 0.92,
      }),
    )
    display.position.set(0, 0.78, -0.72)
    display.rotation.x = -0.28
    g.add(display)
    this.display = display

    // 屏框
    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.15, 1.18, 0.1), brass)
    frame.position.set(0, 0.78, -0.8)
    frame.rotation.x = -0.28
    g.add(frame)

    this._drawDisplay()
  }

  _drawDisplay() {
    const ctx = this.displayCanvas.getContext('2d')
    const W = 900, H = 220
    ctx.clearRect(0, 0, W, H)
    roundedPanel(ctx, W - 8, H - 8, 26, {
      bg: 'rgba(10,16,28,0.92)', border: 'rgba(122,196,255,0.55)', borderWidth: 3,
    })
    ctx.translate(4, 4)
    ctx.font = `500 30px ${FONT}`
    ctx.fillStyle = 'rgba(150,190,235,0.85)'
    ctx.textBaseline = 'middle'
    ctx.fillText('YOUR NAME · 名字', 44, 56)
    const shown = this.name || ''
    const size = shown.length > 14 ? 64 : shown.length > 9 ? 82 : 100
    ctx.font = `800 ${size}px ${FONT}`
    ctx.fillStyle = shown ? '#ffffff' : 'rgba(160,175,200,0.4)'
    ctx.shadowColor = '#6fc2ff'; ctx.shadowBlur = 24
    const label = shown || '输入一个名字…'
    ctx.fillText(label, 44, 138)
    // 光标
    if (Math.floor(performance.now() / 500) % 2 === 0) {
      const tw = ctx.measureText(label).width
      ctx.fillStyle = '#7ec8ff'
      ctx.fillRect(50 + Math.min(tw, W - 120), 106, 8, 66)
    }
    this.displayTex.needsUpdate = true
  }

  addChar(ch) {
    if (this.name.length >= 16) return
    this.setName(this.name + ch)
  }

  backspace() {
    this.setName(this.name.slice(0, -1))
  }

  rollName() {
    const rng = makeRng('roll-' + performance.now() + '-' + this.name.length)
    this.setName(rng.pick(NAME_HEADS) + rng.pick(NAME_TAILS))
  }

  setName(n) {
    this.name = n
    this._drawDisplay()
    this.onChange?.(n)
  }

  confirm() {
    if (!this.name.trim()) {
      sfx('error')
      return false
    }
    return true
  }

  // 交互：hover / press
  hover(key) {
    if (this.hoverKey === key) return
    this.hoverKey = key
    for (const k of this.keys) {
      const target = k === key ? 0.055 : 0
      k.userData.hoverLift = target
    }
  }

  press(key) {
    const ud = key.userData
    if (ud.fn) ud.fn()
    else if (ud.key === 'k') this.addChar(ud.label)
  }

  update(dt, camera) {
    // 悬浮抬升 + 开业键脉冲
    for (const k of this.keys) {
      const ud = k.userData
      const lift = ud.hoverLift || 0
      ud.pressT = Math.max(0, (ud.pressT || 0) - dt * 4)
      const press = ud.pressT > 0 ? Math.sin(ud.pressT * Math.PI) * 0.05 : 0
      const y = (ud.baseY || 0) + lift - press
      k.position.y += (y - k.position.y) * Math.min(1, dt * 14)
    }
    // 光标闪烁重绘（低频）
    this._cursorT = (this._cursorT || 0) + dt
    if (this._cursorT > 0.5) { this._cursorT = 0; this._drawDisplay() }
    // 开业键呼吸
    const pulse = 0.5 + Math.sin(performance.now() * 0.004) * 0.25
    this.enterKey.children[1].material.emissiveIntensity = this.name ? pulse : 0.12
    // 整机轻微浮动
    this.group.position.y = Math.sin(performance.now() * 0.0012) * 0.05
  }

  triggerPress(key) {
    key.userData.pressT = 1
  }
}
