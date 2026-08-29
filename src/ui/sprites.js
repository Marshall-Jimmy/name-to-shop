// 3D UI 基础：Canvas 文字面板 / 圆角牌 / 矢量图标（无 emoji，全路径绘制）
import * as THREE from 'three/webgpu'

export const FONT = '"PingFang SC","Microsoft YaHei","Segoe UI",sans-serif'

export function roundedPanel(ctx, w, h, r, { bg = 'rgba(16,20,32,0.82)', border = 'rgba(120,180,255,0.8)', borderWidth = 3, glow = null } = {}) {
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.arcTo(w, 0, w, h, r)
  ctx.arcTo(w, h, 0, h, r)
  ctx.arcTo(0, h, 0, 0, r)
  ctx.arcTo(0, 0, w, 0, r)
  ctx.closePath()
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 22 }
  ctx.fillStyle = bg
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.lineWidth = borderWidth
  ctx.strokeStyle = border
  ctx.stroke()
  ctx.restore()
}

export function panelTexture(key, w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  draw(c.getContext('2d'), w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  tex.userData.key = key
  return tex
}

// 面板（Plane Mesh，billboard 由调用方驱动；Sprite 在 WebGL2 节点后端有兼容问题）
export function makePanel(tex, worldH, aspect) {
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })
  const m = new THREE.Mesh(new THREE.PlaneGeometry(worldH * aspect, worldH), mat)
  m.userData.noExport = true
  m.renderOrder = 20
  return m
}

// 兼容旧名
export const makePanelSprite = makePanel

// ---------- 矢量图标（canvas path 绘制）----------
export function drawIcon(ctx, name, cx, cy, size, color) {
  const s = size
  ctx.save()
  ctx.translate(cx, cy)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = Math.max(2, s * 0.09)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const u = s / 24
  switch (name) {
    case 'rocket': {
      ctx.beginPath()
      ctx.moveTo(0, -11 * u); ctx.quadraticCurveTo(6 * u, -4 * u, 5 * u, 6 * u)
      ctx.lineTo(-5 * u, 6 * u); ctx.quadraticCurveTo(-6 * u, -4 * u, 0, -11 * u)
      ctx.closePath(); ctx.stroke()
      ctx.beginPath(); ctx.arc(0, -3 * u, 2.2 * u, 0, 7); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-5 * u, 2 * u); ctx.lineTo(-9 * u, 8 * u); ctx.lineTo(-4 * u, 7 * u); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(5 * u, 2 * u); ctx.lineTo(9 * u, 8 * u); ctx.lineTo(4 * u, 7 * u); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, 8 * u); ctx.lineTo(0, 11 * u); ctx.stroke()
      break
    }
    case 'camera': {
      ctx.beginPath(); ctx.roundRect(-9 * u, -6 * u, 18 * u, 13 * u, 2.5 * u); ctx.stroke()
      ctx.beginPath(); ctx.arc(0, 0.5 * u, 4 * u, 0, 7); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-3 * u, -6 * u); ctx.lineTo(-2 * u, -9 * u); ctx.lineTo(4 * u, -9 * u); ctx.lineTo(5 * u, -6 * u); ctx.stroke()
      break
    }
    case 'cube': {
      ctx.beginPath()
      ctx.moveTo(0, -10 * u); ctx.lineTo(9 * u, -5 * u); ctx.lineTo(9 * u, 5 * u); ctx.lineTo(0, 10 * u)
      ctx.lineTo(-9 * u, 5 * u); ctx.lineTo(-9 * u, -5 * u); ctx.closePath(); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-9 * u, -5 * u); ctx.lineTo(0, 0); ctx.lineTo(9 * u, -5 * u); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 10 * u); ctx.stroke()
      break
    }
    case 'link': {
      ctx.beginPath(); ctx.arc(-4.5 * u, -4.5 * u, 5 * u, Math.PI * 0.4, Math.PI * 1.4); ctx.stroke()
      ctx.beginPath(); ctx.arc(4.5 * u, 4.5 * u, 5 * u, Math.PI * 1.4, Math.PI * 0.4); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-7 * u, -1 * u); ctx.lineTo(1 * u, 7 * u); ctx.stroke()
      break
    }
    case 'pencil': {
      ctx.beginPath()
      ctx.moveTo(6 * u, -9 * u); ctx.lineTo(9 * u, -6 * u); ctx.lineTo(-4 * u, 9 * u)
      ctx.lineTo(-9 * u, 10 * u); ctx.lineTo(-8 * u, 5 * u); ctx.closePath(); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(4 * u, -7 * u); ctx.lineTo(7 * u, -4 * u); ctx.stroke()
      break
    }
    case 'sound': {
      ctx.beginPath(); ctx.moveTo(-9 * u, -3 * u); ctx.lineTo(-5 * u, -3 * u); ctx.lineTo(-1 * u, -8 * u)
      ctx.lineTo(-1 * u, 8 * u); ctx.lineTo(-5 * u, 3 * u); ctx.lineTo(-9 * u, 3 * u); ctx.closePath(); ctx.fill()
      ctx.beginPath(); ctx.arc(1 * u, 0, 4 * u, -Math.PI / 2.6, Math.PI / 2.6); ctx.stroke()
      ctx.beginPath(); ctx.arc(1 * u, 0, 7.5 * u, -Math.PI / 2.8, Math.PI / 2.8); ctx.stroke()
      break
    }
    case 'mute': {
      ctx.beginPath(); ctx.moveTo(-9 * u, -3 * u); ctx.lineTo(-5 * u, -3 * u); ctx.lineTo(-1 * u, -8 * u)
      ctx.lineTo(-1 * u, 8 * u); ctx.lineTo(-5 * u, 3 * u); ctx.lineTo(-9 * u, 3 * u); ctx.closePath(); ctx.fill()
      ctx.beginPath(); ctx.moveTo(2 * u, -4 * u); ctx.lineTo(9 * u, 4 * u); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(9 * u, -4 * u); ctx.lineTo(2 * u, 4 * u); ctx.stroke()
      break
    }
    case 'door': {
      ctx.beginPath(); ctx.roundRect(-7 * u, -10 * u, 14 * u, 20 * u, 3 * u); ctx.stroke()
      ctx.beginPath(); ctx.arc(3.5 * u, 0, 1.4 * u, 0, 7); ctx.fill()
      break
    }
    case 'exit': {
      ctx.beginPath(); ctx.moveTo(-4 * u, -9 * u); ctx.lineTo(-9 * u, -9 * u); ctx.lineTo(-9 * u, 9 * u); ctx.lineTo(-4 * u, 9 * u); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-6 * u, 0); ctx.lineTo(8 * u, 0); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(4 * u, -4 * u); ctx.lineTo(8 * u, 0); ctx.lineTo(4 * u, 4 * u); ctx.stroke()
      break
    }
    case 'dice': {
      ctx.beginPath(); ctx.roundRect(-9 * u, -9 * u, 18 * u, 18 * u, 4 * u); ctx.stroke()
      ctx.beginPath(); ctx.arc(-4 * u, -4 * u, 1.6 * u, 0, 7); ctx.fill()
      ctx.beginPath(); ctx.arc(4 * u, 4 * u, 1.6 * u, 0, 7); ctx.fill()
      ctx.beginPath(); ctx.arc(4 * u, -4 * u, 1.6 * u, 0, 7); ctx.fill()
      ctx.beginPath(); ctx.arc(-4 * u, 4 * u, 1.6 * u, 0, 7); ctx.fill()
      break
    }
    case 'back': {
      ctx.beginPath(); ctx.moveTo(7 * u, -6 * u); ctx.lineTo(-1 * u, 0); ctx.lineTo(7 * u, 6 * u); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(1 * u, 0); ctx.lineTo(10 * u, 0); ctx.stroke()
      break
    }
    case 'star': {
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 10 * u : 4.2 * u
        const a = -Math.PI / 2 + i * Math.PI / 5
        ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r)
      }
      ctx.closePath(); ctx.fill()
      break
    }
    case 'book': {
      ctx.beginPath(); ctx.moveTo(0, -8 * u); ctx.quadraticCurveTo(-6 * u, -10 * u, -9 * u, -8 * u)
      ctx.lineTo(-9 * u, 8 * u); ctx.quadraticCurveTo(-5 * u, 6 * u, 0, 8 * u); ctx.closePath(); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, -8 * u); ctx.quadraticCurveTo(6 * u, -10 * u, 9 * u, -8 * u)
      ctx.lineTo(9 * u, 8 * u); ctx.quadraticCurveTo(5 * u, 6 * u, 0, 8 * u); ctx.closePath(); ctx.stroke()
      break
    }
  }
  ctx.restore()
}

// 按钮面板纹理：圆角底板 + 图标 + 下方小标签
export function buttonTexture(key, icon, label, accent) {
  const S = 200
  return panelTexture(`btn-${key}`, S, S, (ctx) => {
    ctx.clearRect(0, 0, S, S)
    roundedPanel(ctx, S - 16, S - 16, 34, {
      bg: 'rgba(18,22,36,0.88)', border: accent, borderWidth: 4, glow: accent,
    })
    ctx.translate(8, 8)
    drawIcon(ctx, icon, S / 2, S / 2 - 14, 74, '#ffffff')
    ctx.font = `600 26px ${FONT}`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = accent
    ctx.fillText(label, S / 2, S - 42)
  })
}
