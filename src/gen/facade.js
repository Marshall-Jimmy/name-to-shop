// Canvas 2D 立面绘制：墙面 + 门窗口装饰 + 招牌带 + 风格皮肤
import { hsl, roundRect, grain } from './helpers.js'
import { paintWall } from './textures.js'

const FONT_STACK = '"PingFang SC","Microsoft YaHei","Noto Sans SC","Source Han Sans SC","Segoe UI Emoji",sans-serif'

function shade(c, dl, ds = 0) {
  return [c[0], Math.max(0, Math.min(100, c[1] + ds)), Math.max(0, Math.min(100, c[2] + dl))]
}

export function fitFont(ctx, text, maxW, startSize, weight = 900) {
  let size = startSize
  ctx.font = `${weight} ${size}px ${FONT_STACK}`
  while (ctx.measureText(text).width > maxW && size > 12) {
    size -= 2
    ctx.font = `${weight} ${size}px ${FONT_STACK}`
  }
  return size
}

export function neonText(ctx, text, x, y, color, size, weight = 800) {
  ctx.font = `${weight} ${size}px ${FONT_STACK}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = color
  ctx.shadowBlur = size * 0.55
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  ctx.fillText(text, x, y)
  ctx.shadowBlur = size * 0.22
  ctx.fillStyle = '#ffffff'
  ctx.fillText(text, x, y)
  ctx.shadowBlur = 0
}

export function outlinedText(ctx, text, x, y, size, fill, outline, weight = 900, ow = 6) {
  ctx.font = `${weight} ${size}px ${FONT_STACK}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = outline
  ctx.lineWidth = ow
  ctx.strokeText(text, x, y)
  ctx.fillStyle = fill
  ctx.fillText(text, x, y)
}

function bulbs(ctx, x, y, w, h, color, spacing = 26) {
  const r = 5
  for (let bx = x + spacing / 2; bx < x + w; bx += spacing) {
    for (const by of [y + 8, y + h - 8]) {
      const g = ctx.createRadialGradient(bx, by, 1, bx, by, r * 2.4)
      g.addColorStop(0, '#fff')
      g.addColorStop(0.4, color)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(bx, by, r * 2.4, 0, Math.PI * 2); ctx.fill()
    }
  }
  for (let by = y + spacing / 2 + 10; by < y + h - 10; by += spacing) {
    for (const bx of [x + 8, x + w - 8]) {
      const g = ctx.createRadialGradient(bx, by, 1, bx, by, r * 2.4)
      g.addColorStop(0, '#fff')
      g.addColorStop(0.4, color)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(bx, by, r * 2.4, 0, Math.PI * 2); ctx.fill()
    }
  }
}

// 立面主绘制。layout 单位为米，px = 每米像素数
export function drawFacade(ctx, w, h, dna, layout, rand, px) {
  const pal = dna.palette
  const skin = dna.style.facadeSkin
  const texKey = dna.style.textureBias?.[0] || dna.material.tex

  // 1. 墙面底
  paintWall(ctx, w, h, pal, rand, texKey)

  const toPx = (m) => m * px

  // 2. 风格皮肤叠加
  if (skin === 'cyber' || skin === 'hongkong') {
    ctx.globalAlpha = 0.25
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, hsl(...pal.glow))
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h * 0.5)
    ctx.globalAlpha = 1
  }
  if (skin === 'showa' || skin === 'zen') {
    // 下半瓷砖 + 上半灰泥
    const tY = toPx(2.9)
    ctx.save()
    ctx.beginPath(); ctx.rect(0, tY, w, h - tY); ctx.clip()
    ctx.fillStyle = hsl(...shade(pal.trim, 24))
    ctx.fillRect(0, tY, w, h - tY)
    const ts = 34
    for (let y = tY; y < h; y += ts) {
      for (let x = ((y / ts) % 2) * -ts / 2; x < w; x += ts) {
        ctx.fillStyle = hsl(...shade(pal.trim, rand.f(-10, 16)))
        ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4)
      }
    }
    ctx.restore()
    ctx.fillStyle = hsl(...shade(pal.trim, -26))
    ctx.fillRect(0, tY, w, 4)
  }

  // 3. 壁柱（两端）
  const pilW = toPx(0.34)
  for (const x of [0, w - pilW]) {
    const g = ctx.createLinearGradient(x, 0, x + pilW, 0)
    g.addColorStop(0, hsl(...shade(pal.wall, -12)))
    g.addColorStop(0.5, hsl(...shade(pal.wall, 14)))
    g.addColorStop(1, hsl(...shade(pal.wall, -12)))
    ctx.fillStyle = g
    ctx.fillRect(x, 0, pilW, h)
    ctx.fillStyle = hsl(...shade(pal.trim, -10))
    ctx.fillRect(x, toPx(layout.H - 1.7), pilW, toPx(0.1))
  }

  // 4. 门窗口装饰（与真实挖洞位置对齐）
  const door = layout.door, windows = layout.windows
  // 门框
  const dx = toPx(door.x), dw = toPx(door.w), dh = toPx(door.h)
  ctx.fillStyle = hsl(...shade(pal.trim, -16))
  ctx.fillRect(dx - toPx(0.12), 0, dw + toPx(0.24), dh + toPx(0.12))
  ctx.fillStyle = hsl(...shade(pal.trim, 12))
  ctx.fillRect(dx - toPx(0.07), 0, dw + toPx(0.14), dh + toPx(0.07))
  // 门头饰
  ctx.fillStyle = hsl(...shade(pal.accent, 0))
  ctx.fillRect(dx - toPx(0.2), dh + toPx(0.12), dw + toPx(0.4), toPx(0.14))
  if (skin === 'classic') {
    ctx.beginPath()
    ctx.moveTo(dx - toPx(0.14), dh + toPx(0.26))
    ctx.quadraticCurveTo(dx + dw / 2, dh + toPx(0.72), dx + dw + toPx(0.14), dh + toPx(0.26))
    ctx.fillStyle = hsl(...shade(pal.trim, 8))
    ctx.fill()
  }

  // 窗：窗台 + 窗框
  for (const win of windows) {
    const wx = toPx(win.x), ww = toPx(win.w), wy = toPx(win.y), wh = toPx(win.h)
    ctx.fillStyle = hsl(...shade(pal.trim, -18))
    ctx.fillRect(wx - toPx(0.08), wy - toPx(0.08), ww + toPx(0.16), wh + toPx(0.16))
    ctx.fillStyle = hsl(...shade(pal.trim, 14))
    ctx.fillRect(wx - toPx(0.04), wy - toPx(0.04), ww + toPx(0.08), wh + toPx(0.08))
    // 窗台
    ctx.fillStyle = hsl(...shade(pal.trim, -26))
    ctx.fillRect(wx - toPx(0.18), wy + wh, ww + toPx(0.36), toPx(0.14))
    ctx.fillStyle = hsl(...shade(pal.trim, 10))
    ctx.fillRect(wx - toPx(0.18), wy + wh + toPx(0.14), ww + toPx(0.36), toPx(0.05))
    // 雨渍
    ctx.globalAlpha = 0.14
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = '#241d16'
      ctx.fillRect(wx + rand.f(0, ww), wy + wh + toPx(0.19), rand.f(2, 5), toPx(rand.f(0.2, 0.7)))
    }
    ctx.globalAlpha = 1
  }

  // 5. 招牌带
  const bandY = toPx(layout.signBand.y), bandH = toPx(layout.signBand.h)
  const bg = ctx.createLinearGradient(0, bandY, 0, bandY + bandH)
  bg.addColorStop(0, hsl(...shade(pal.main, 14)))
  bg.addColorStop(1, hsl(...shade(pal.main, -14)))
  ctx.fillStyle = bg
  ctx.fillRect(0, bandY, w, bandH)
  ctx.fillStyle = hsl(...shade(pal.main, -30))
  ctx.fillRect(0, bandY, w, toPx(0.06))
  ctx.fillRect(0, bandY + bandH - toPx(0.06), w, toPx(0.06))
  // 内嵌线
  ctx.strokeStyle = hsl(...shade(pal.trim, 18))
  ctx.lineWidth = 2
  ctx.strokeRect(toPx(0.12), bandY + toPx(0.12), w - toPx(0.24), bandH - toPx(0.24))

  // 6. 檐口 + 齿饰
  ctx.fillStyle = hsl(...shade(pal.main, -22))
  ctx.fillRect(0, 0, w, toPx(0.18))
  ctx.fillStyle = hsl(...shade(pal.main, -34))
  for (let x = toPx(0.1); x < w; x += toPx(0.42)) {
    ctx.fillRect(x, toPx(0.18), toPx(0.24), toPx(0.12))
  }

  // 7. 二楼窗（若有）
  if (layout.upperWindows) {
    for (const uw of layout.upperWindows) {
      const ux = toPx(uw.x), uw2 = toPx(uw.w), uy = toPx(uw.y), uh = toPx(uw.h)
      ctx.fillStyle = hsl(...shade(pal.trim, -16))
      ctx.fillRect(ux - toPx(0.06), uy - toPx(0.06), uw2 + toPx(0.12), uh + toPx(0.12))
      ctx.fillStyle = hsl(...shade(pal.wall, -34))
      ctx.fillRect(ux, uy, uw2, uh)
      if (skin === 'classic') {
        ctx.beginPath()
        ctx.moveTo(ux - toPx(0.06), uy)
        ctx.quadraticCurveTo(ux + uw2 / 2, uy - toPx(0.4), ux + uw2 + toPx(0.06), uy)
        ctx.lineTo(ux + uw2 + toPx(0.06), uy + toPx(0.1))
        ctx.lineTo(ux - toPx(0.06), uy + toPx(0.1))
        ctx.closePath()
        ctx.fillStyle = hsl(...shade(pal.trim, 4))
        ctx.fill()
      }
      ctx.fillStyle = hsl(...shade(pal.wall, -44))
      ctx.fillRect(ux, uy + uh, uw2, toPx(0.08))
    }
  }

  // 8. 底座
  ctx.fillStyle = hsl(...shade(pal.ground, -18))
  ctx.fillRect(0, h - toPx(0.3), w, toPx(0.3))

  // 9. 涂鸦 / 贴纸（赛博 / 废土 / loft）
  if (['cyber', 'wasteland', 'loft', 'hongkong'].includes(skin) && rand.chance(0.7)) {
    ctx.save()
    ctx.globalAlpha = 0.55
    ctx.translate(rand.f(w * 0.15, w * 0.7), h - toPx(rand.f(0.5, 1.1)))
    ctx.rotate(rand.f(-0.12, 0.12))
    const tags = ['OPEN', 'SALE', '好店', '必吃', 'TOP1', '24h', '新店', 'COOL']
    const tag = rand.pick(tags)
    ctx.font = `900 ${toPx(0.34)}px ${FONT_STACK}`
    ctx.strokeStyle = rand.chance(0.5) ? hsl(...pal.glow) : hsl(...pal.accent)
    ctx.lineWidth = 3
    ctx.strokeText(tag, 0, 0)
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.fillText(tag, 0, 0)
    ctx.restore()
  }

  // 10. 赛博霓虹描边
  if (skin === 'cyber' || skin === 'futurism') {
    ctx.strokeStyle = hsl(...pal.glow)
    ctx.lineWidth = 5
    ctx.shadowColor = hsl(...pal.glow)
    ctx.shadowBlur = 22
    roundRect(ctx, toPx(0.4), bandY + toPx(0.1), w - toPx(0.8), bandH - toPx(0.2), 8)
    ctx.stroke()
    ctx.shadowBlur = 0
  }
  if (dna.eggEffects?.window === 'paw') {
    for (const win of windows) {
      ctx.font = `700 ${toPx(win.h * 0.42)}px ${FONT_STACK}`
      ctx.textAlign = 'center'
      ctx.globalAlpha = 0.85
      ctx.fillText('🐾', toPx(win.x + win.w / 2), toPx(win.y + win.h / 2))
      ctx.globalAlpha = 1
    }
  }

  // 11. 颗粒 + 暗角
  grain(ctx, w, h, 0.004, rand)
}

// ---------- 招牌面绘制（用于 3D 发光招牌板）----------
export function drawSignFace(ctx, w, h, dna, rand, opts = {}) {
  const pal = dna.palette
  const kind = opts.kind || 'box'
  const name = opts.name || dna.name
  const sub = opts.sub || dna.subtitle
  const icon = opts.icon || dna.business.icon
  const glow = hsl(...pal.glow)
  const trim = hsl(...shade(pal.trim, 0))

  ctx.clearRect(0, 0, w, h)

  if (kind === 'neonTube' || kind === 'ledMatrix' || kind === 'holo') {
    // 深底霓虹
    ctx.fillStyle = kind === 'holo' ? 'rgba(8,10,26,0.92)' : '#0a0a14'
    roundRect(ctx, 4, 4, w - 8, h - 8, 18)
    ctx.fill()
    ctx.strokeStyle = glow
    ctx.lineWidth = 4
    ctx.shadowColor = glow
    ctx.shadowBlur = 18
    roundRect(ctx, 14, 14, w - 28, h - 28, 12)
    ctx.stroke()
    ctx.shadowBlur = 0
    const size = fitFont(ctx, name, w * 0.72, h * 0.42)
    neonText(ctx, name, w / 2, h * 0.42, glow, size)
    ctx.font = `600 ${h * 0.12}px ${FONT_STACK}`
    ctx.fillStyle = hsl(...shade(pal.accent, 24))
    ctx.textAlign = 'center'
    ctx.shadowColor = hsl(...pal.accent)
    ctx.shadowBlur = 10
    ctx.fillText(sub, w / 2, h * 0.74)
    ctx.shadowBlur = 0
    return
  }

  if (kind === 'marquee') {
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, hsl(...shade(pal.main, 18)))
    bg.addColorStop(1, hsl(...shade(pal.main, -18)))
    ctx.fillStyle = bg
    roundRect(ctx, 2, 2, w - 4, h - 4, 12)
    ctx.fill()
    bulbs(ctx, 6, 6, w - 12, h - 12, glow)
    const size = fitFont(ctx, name, w * 0.68, h * 0.4)
    outlinedText(ctx, name, w / 2, h * 0.44, size, '#fff', hsl(...shade(pal.main, -38)), 900, size * 0.16)
    ctx.font = `700 ${h * 0.12}px ${FONT_STACK}`
    ctx.textAlign = 'center'
    ctx.fillStyle = '#fff'
    ctx.fillText(`${icon} ${sub}`, w / 2, h * 0.76)
    return
  }

  if (kind === 'chalkboard') {
    ctx.fillStyle = '#22301f'
    roundRect(ctx, 6, 6, w - 12, h - 12, 10)
    ctx.fill()
    ctx.strokeStyle = hsl(...shade(pal.trim, -8))
    ctx.lineWidth = 10
    roundRect(ctx, 8, 8, w - 16, h - 16, 8)
    ctx.stroke()
    const size = fitFont(ctx, name, w * 0.74, h * 0.38)
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,250,0.94)'
    ctx.font = `700 ${size}px ${FONT_STACK}`
    ctx.fillText(name, w / 2, h * 0.44)
    ctx.strokeStyle = 'rgba(255,255,250,0.8)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(w * 0.2, h * 0.58); ctx.lineTo(w * 0.8, h * 0.58)
    ctx.stroke()
    ctx.font = `500 ${h * 0.13}px ${FONT_STACK}`
    ctx.fillStyle = 'rgba(255,255,240,0.85)'
    ctx.fillText(sub, w / 2, h * 0.72)
    return
  }

  // 默认经典招牌盒
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, hsl(...shade(pal.main, 16)))
  bg.addColorStop(1, hsl(...shade(pal.main, -16)))
  ctx.fillStyle = bg
  roundRect(ctx, 2, 2, w - 4, h - 4, 14)
  ctx.fill()
  ctx.strokeStyle = trim
  ctx.lineWidth = 5
  roundRect(ctx, 10, 10, w - 20, h - 20, 9)
  ctx.stroke()
  const hasIcon = name.length <= 6 && icon
  const textW = w * (hasIcon ? 0.6 : 0.8)
  const size = fitFont(ctx, name, textW, h * 0.4)
  const tx = hasIcon ? w * 0.36 + w * 0.06 : w / 2
  outlinedText(ctx, name, tx, h * 0.42, size, '#fffdf5', hsl(...shade(pal.main, -42)), 900, Math.max(4, size * 0.14))
  if (hasIcon) {
    ctx.font = `700 ${h * 0.34}px ${FONT_STACK}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(icon, w * 0.17, h * 0.42)
  }
  ctx.font = `600 ${h * 0.115}px ${FONT_STACK}`
  ctx.textAlign = 'center'
  ctx.fillStyle = hsl(...shade(pal.accent, 26))
  ctx.fillText(`${sub} · ${dna.business.name}`, w / 2, h * 0.76)
  // 高光
  const sheen = ctx.createLinearGradient(0, 0, w, h)
  sheen.addColorStop(0, 'rgba(255,255,255,0.16)')
  sheen.addColorStop(0.4, 'rgba(255,255,255,0)')
  ctx.fillStyle = sheen
  roundRect(ctx, 2, 2, w - 4, h - 4, 14)
  ctx.fill()
}

// 竖式招牌（东亚风）：文字竖排
export function drawSignVertical(ctx, w, h, dna, rand) {
  const pal = dna.palette
  ctx.clearRect(0, 0, w, h)
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, hsl(...shade(pal.main, 12)))
  bg.addColorStop(1, hsl(...shade(pal.main, -14)))
  ctx.fillStyle = bg
  ctx.fillRect(4, 4, w - 8, h - 8)
  ctx.strokeStyle = hsl(...shade(pal.trim, 8))
  ctx.lineWidth = 4
  ctx.strokeRect(12, 12, w - 24, h - 24)
  const chars = [...dna.name]
  const n = chars.length
  const chH = (h - 90) / Math.max(n, 1)
  const size = Math.min(w * 0.62, chH * 0.8)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  chars.forEach((c, i) => {
    const y = 50 + chH * (i + 0.5)
    outlinedText(ctx, c, w / 2, y, size, '#fffcf2', hsl(...shade(pal.main, -40)), 900, size * 0.12)
  })
  ctx.font = `600 ${w * 0.16}px ${FONT_STACK}`
  ctx.fillStyle = hsl(...shade(pal.accent, 22))
  ctx.fillText(dna.business.en.slice(0, 8), w / 2, h - 28)
}
