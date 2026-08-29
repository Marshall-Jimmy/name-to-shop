// 程序化 Canvas 纹理绘制器：墙面 / 屋顶 / 地板 / 地面
import { hsl, roundRect, grain } from './helpers.js'

function shade(c, dl, ds = 0) {
  return [c[0], Math.max(0, Math.min(100, c[1] + ds)), Math.max(0, Math.min(100, c[2] + dl))]
}

// 网格尺寸对齐（无缝平铺）
const G = (total, target) => total / Math.max(1, Math.round(total / target))

function grime(ctx, w, h, rand, strength = 1) {
  const g = ctx.createLinearGradient(0, h * 0.55, 0, h)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(20,15,10,${0.16 * strength})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < rand.i(4, 9); i++) {
    const x = rand.f(0, w), r = rand.f(20, 80)
    const s = ctx.createRadialGradient(x, h - rand.f(0, h * 0.2), 2, x, h, r)
    s.addColorStop(0, `rgba(30,25,20,${rand.f(0.05, 0.14) * strength})`)
    s.addColorStop(1, 'rgba(30,25,20,0)')
    ctx.fillStyle = s
    ctx.fillRect(x - r, h - r * 2, r * 2, r * 2)
  }
}

function streaks(ctx, w, h, rand, n = 14) {
  ctx.globalAlpha = 0.08
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = rand.chance(0.5) ? '#000' : '#fff'
    const x = rand.f(0, w)
    ctx.fillRect(x, rand.f(0, h * 0.4), rand.f(1, 3), rand.f(h * 0.3, h * 0.8))
  }
  ctx.globalAlpha = 1
}

// ---------- 墙面 ----------
export function paintBrick(ctx, w, h, pal, rand) {
  ctx.fillStyle = hsl(...shade(pal.wall, -18))
  ctx.fillRect(0, 0, w, h)
  const bh = G(h, rand.f(26, 34)), bw = G(w, rand.f(64, 84)), mortar = rand.f(3, 5)
  let row = 0
  for (let y = 0; y < h; y += bh) {
    const off = row % 2 === 0 ? 0 : -bw / 2
    for (let x = off; x < w; x += bw) {
      const dl = rand.f(-9, 9), ds = rand.f(-10, 8)
      ctx.fillStyle = hsl(...shade(pal.wall, dl, ds))
      ctx.fillRect(x + mortar, y + mortar, bw - mortar * 2, bh - mortar * 2)
      if (rand.chance(0.06)) {
        ctx.fillStyle = hsl(...shade(pal.wall, -22))
        ctx.fillRect(x + mortar, y + mortar, bw - mortar * 2, bh - mortar * 2)
      }
    }
    row++
  }
  streaks(ctx, w, h, rand)
  grime(ctx, w, h, rand)
}

export function paintWood(ctx, w, h, pal, rand) {
  ctx.fillStyle = hsl(...shade(pal.wall, -14))
  ctx.fillRect(0, 0, w, h)
  const vertical = rand.chance(0.7)
  const pw = G(vertical ? w : h, rand.f(50, 78))
  const n = vertical ? Math.ceil(w / pw) : Math.ceil(h / pw)
  for (let i = 0; i <= n; i++) {
    const base = shade(pal.wall, rand.f(-8, 8), rand.f(-6, 6))
    ctx.fillStyle = hsl(...base)
    if (vertical) ctx.fillRect(i * pw, 0, pw - 2, h)
    else ctx.fillRect(0, i * pw, w, pw - 2)
    ctx.strokeStyle = hsl(...shade(base, -20))
    ctx.lineWidth = 1
    for (let g2 = 0; g2 < 3; g2++) {
      ctx.globalAlpha = rand.f(0.1, 0.3)
      ctx.beginPath()
      if (vertical) {
        const gx = i * pw + rand.f(4, pw - 6)
        ctx.moveTo(gx, 0)
        ctx.bezierCurveTo(gx + rand.f(-4, 4), h * 0.33, gx + rand.f(-4, 4), h * 0.66, gx, h)
      } else {
        const gy = i * pw + rand.f(4, pw - 6)
        ctx.moveTo(0, gy)
        ctx.bezierCurveTo(w * 0.33, gy + rand.f(-4, 4), w * 0.66, gy + rand.f(-4, 4), w, gy)
      }
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    if (rand.chance(0.12)) {
      const kx = vertical ? i * pw + pw / 2 : rand.f(0, w)
      const ky = vertical ? rand.f(0, h) : i * pw + pw / 2
      ctx.beginPath()
      ctx.ellipse(kx, ky, rand.f(3, 6), rand.f(5, 10), 0, 0, Math.PI * 2)
      ctx.fillStyle = hsl(...shade(base, -26))
      ctx.fill()
    }
  }
  streaks(ctx, w, h, rand, 8)
  grime(ctx, w, h, rand, 0.8)
}

export function paintPlaster(ctx, w, h, pal, rand) {
  ctx.fillStyle = hsl(...pal.wall)
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = hsl(...shade(pal.wall, rand.f(-7, 7)))
    ctx.globalAlpha = rand.f(0.08, 0.22)
    ctx.beginPath()
    ctx.ellipse(rand.f(0, w), rand.f(0, h), rand.f(8, 44), rand.f(6, 30), rand.f(0, 3), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  for (let i = 0; i < rand.i(2, 5); i++) {
    ctx.strokeStyle = `rgba(40,30,25,${rand.f(0.12, 0.25)})`
    ctx.lineWidth = rand.f(0.6, 1.4)
    ctx.beginPath()
    let x = rand.f(0, w), y = rand.f(0, h * 0.6)
    ctx.moveTo(x, y)
    for (let s = 0; s < 5; s++) {
      x += rand.f(-30, 30); y += rand.f(10, 46)
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  grain(ctx, w, h, 0.006, rand)
  grime(ctx, w, h, rand, 0.9)
}

export function paintTile(ctx, w, h, pal, rand) {
  paintPlaster(ctx, w, h, pal, rand)
  const tileH = h * rand.f(0.38, 0.5)
  const ts = G(Math.min(w, tileH), rand.f(40, 58))
  ctx.save()
  ctx.beginPath(); ctx.rect(0, h - tileH, w, tileH); ctx.clip()
  ctx.fillStyle = hsl(...shade(pal.trim, 18))
  ctx.fillRect(0, h - tileH, w, tileH)
  for (let y = h - tileH; y < h; y += ts) {
    for (let x = ((y / ts) % 2) * -ts / 2; x < w; x += ts) {
      ctx.fillStyle = hsl(...shade(pal.trim, rand.f(-8, 14)))
      ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4)
    }
  }
  ctx.restore()
  ctx.fillStyle = hsl(...shade(pal.trim, -24))
  ctx.fillRect(0, h - tileH - 6, w, 6)
  grime(ctx, w, h, rand, 0.7)
}

export function paintMetal(ctx, w, h, pal, rand) {
  ctx.fillStyle = hsl(...pal.wall)
  ctx.fillRect(0, 0, w, h)
  const pw = G(w, rand.f(90, 150))
  for (let x = 0; x < w; x += pw) {
    ctx.fillStyle = hsl(...shade(pal.wall, rand.f(-6, 6)))
    ctx.fillRect(x, 0, pw - 3, h)
    ctx.fillStyle = `rgba(0,0,0,${rand.f(0.2, 0.35)})`
    ctx.fillRect(x + pw - 3, 0, 3, h)
    for (let y = 20; y < h; y += rand.f(60, 90)) {
      for (const rx of [x + 10, x + pw - 13]) {
        ctx.beginPath()
        ctx.arc(rx, y, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = hsl(...shade(pal.wall, -30))
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'
        ctx.lineWidth = 0.8
        ctx.stroke()
      }
    }
  }
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = rand.f(0.03, 0.1)
    ctx.fillStyle = rand.chance(0.5) ? '#fff' : '#000'
    ctx.fillRect(0, rand.f(0, h), w, rand.f(1, 3))
  }
  ctx.globalAlpha = 1
  grime(ctx, w, h, rand, 0.8)
}

export function paintConcrete(ctx, w, h, pal, rand) {
  ctx.fillStyle = hsl(...pal.wall)
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = hsl(...shade(pal.wall, rand.f(-6, 6)))
    ctx.globalAlpha = rand.f(0.1, 0.3)
    ctx.beginPath()
    ctx.arc(rand.f(0, w), rand.f(0, h), rand.f(2, 22), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  const ph = h / rand.i(3, 5)
  for (let y = ph; y < h; y += ph) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.fillRect(0, y, w, 2)
    for (let x = rand.f(30, 90); x < w; x += rand.f(140, 220)) {
      ctx.beginPath(); ctx.arc(x, y - 8, 2.6, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill()
    }
  }
  grime(ctx, w, h, rand)
}

export function paintStone(ctx, w, h, pal, rand) {
  ctx.fillStyle = hsl(...shade(pal.wall, -20))
  ctx.fillRect(0, 0, w, h)
  let y = 0, row = 0
  while (y < h) {
    const rh = rand.f(46, 70)
    let x = row % 2 ? -rand.f(20, 50) : 0
    while (x < w) {
      const rw = rand.f(80, 150)
      ctx.fillStyle = hsl(...shade(pal.wall, rand.f(-10, 10), rand.f(-8, 6)))
      roundRect(ctx, x + 3, y + 3, rw - 6, rh - 6, rand.f(2, 5))
      ctx.fill()
      x += rw
    }
    y += rh; row++
  }
  grime(ctx, w, h, rand, 1.1)
}

export function paintFabric(ctx, w, h, pal, rand) {
  ctx.fillStyle = hsl(...pal.wall)
  ctx.fillRect(0, 0, w, h)
  const stripe = rand.f(40, 90)
  for (let x = 0; x < w; x += stripe) {
    ctx.fillStyle = hsl(...shade(pal.wall, rand.chance(0.5) ? 7 : -7))
    ctx.fillRect(x, 0, stripe * rand.f(0.3, 0.6), h)
  }
  for (let i = 0; i < w * h / 90; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rand.f(0.02, 0.07)})`
    ctx.fillRect(rand.f(0, w), rand.f(0, h), 2, 2)
  }
  grime(ctx, w, h, rand, 0.5)
}

export function paintPixel(ctx, w, h, pal, rand) {
  const px = 8
  const cols = Math.ceil(w / px), rows = Math.ceil(h / px)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      ctx.fillStyle = hsl(...shade(pal.wall, rand.f(-5, 5)))
      ctx.fillRect(x * px, y * px, px, px)
    }
  }
  for (let i = 0; i < rand.i(20, 40); i++) {
    const x = rand.i(0, cols - 1) * px, y = rand.i(0, rows - 1) * px
    ctx.fillStyle = hsl(...shade(pal.accent, 0))
    ctx.fillRect(x, y, px, px)
  }
}

export function paintHolo(ctx, w, h, pal, rand) {
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, hsl(...shade(pal.wall, 16)))
  g.addColorStop(0.5, hsl(...shade(pal.accent, 10)))
  g.addColorStop(1, hsl(...shade(pal.trim, 12)))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.globalAlpha = 0.12
  ctx.fillStyle = '#000'
  for (let y = 0; y < h; y += 5) ctx.fillRect(0, y, w, 2)
  ctx.globalAlpha = 1
  ctx.strokeStyle = hsl(...pal.glow)
  ctx.lineWidth = 1.4
  ctx.globalAlpha = 0.6
  for (let i = 0; i < 22; i++) {
    let x = rand.f(0, w), y = rand.f(0, h)
    ctx.beginPath(); ctx.moveTo(x, y)
    for (let s = 0; s < 4; s++) {
      if (rand.chance(0.5)) x += rand.f(-60, 60); else y += rand.f(-40, 40)
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

const WALL_PAINTERS = {
  brick: paintBrick, wood: paintWood, plaster: paintPlaster, tile: paintTile,
  metal: paintMetal, concrete: paintConcrete, stone: paintStone, fabric: paintFabric,
  pixel: paintPixel, holo: paintHolo,
}

export function paintWall(ctx, w, h, pal, rand, texKey) {
  ;(WALL_PAINTERS[texKey] || paintPlaster)(ctx, w, h, pal, rand)
}

// ---------- 屋顶 ----------
export function paintRoofTiles(ctx, w, h, pal, rand) {
  ctx.fillStyle = hsl(...shade(pal.main, -26))
  ctx.fillRect(0, 0, w, h)
  const tw = rand.f(46, 62), th = rand.f(30, 42)
  for (let y = 0; y < h + th; y += th) {
    for (let x = 0; x < w + tw; x += tw) {
      const c = shade(pal.main, rand.f(-14, 6))
      ctx.fillStyle = hsl(...c)
      ctx.beginPath()
      ctx.moveTo(x, y + th)
      ctx.lineTo(x, y + 6)
      ctx.quadraticCurveTo(x + tw / 2, y - 8, x + tw, y + 6)
      ctx.lineTo(x + tw, y + th)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = hsl(...shade(c, -18))
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }
  grime(ctx, w, h, rand, 0.6)
}

export function paintShingles(ctx, w, h, pal, rand) {
  ctx.fillStyle = hsl(...shade(pal.main, -24))
  ctx.fillRect(0, 0, w, h)
  const sw = 52, sh = 26
  for (let y = 0; y < h + sh; y += sh) {
    const off = (y / sh) % 2 ? sw / 2 : 0
    for (let x = -sw; x < w + sw; x += sw) {
      ctx.fillStyle = hsl(...shade(pal.main, rand.f(-12, 8)))
      ctx.fillRect(x + off + 1.5, y + 1.5, sw - 3, sh - 3)
    }
  }
  grime(ctx, w, h, rand, 0.5)
}

export function paintThatch(ctx, w, h, pal, rand) {
  ctx.fillStyle = hsl(...shade(pal.main, -20))
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < w / 3; i++) {
    ctx.strokeStyle = hsl(...shade(pal.main, rand.f(-16, 10)))
    ctx.lineWidth = rand.f(1, 2.5)
    const x = rand.f(0, w)
    ctx.beginPath()
    ctx.moveTo(x, rand.f(-10, 10))
    ctx.lineTo(x + rand.f(-14, 14), h)
    ctx.stroke()
  }
  grime(ctx, w, h, rand, 0.7)
}

export function paintMetalSeam(ctx, w, h, pal, rand) {
  ctx.fillStyle = hsl(...pal.main)
  ctx.fillRect(0, 0, w, h)
  const seam = rand.f(60, 90)
  for (let x = 0; x < w; x += seam) {
    ctx.fillStyle = hsl(...shade(pal.main, rand.f(-10, 10)))
    ctx.fillRect(x + 4, 0, seam - 8, h)
    const g = ctx.createLinearGradient(x, 0, x + 8, 0)
    g.addColorStop(0, 'rgba(255,255,255,0.28)')
    g.addColorStop(1, 'rgba(0,0,0,0.18)')
    ctx.fillStyle = g
    ctx.fillRect(x, 0, 8, h)
  }
}

export function paintRoofFlat(ctx, w, h, pal, rand) {
  paintConcrete(ctx, w, h, { ...pal, wall: shade(pal.main, -14) }, rand)
}

// ---------- 室内地板 ----------
export function paintFloorWood(ctx, w, h, pal, rand) {
  ctx.fillStyle = hsl(...shade(pal.trim, -8))
  ctx.fillRect(0, 0, w, h)
  const ph = 44
  for (let y = 0; y < h; y += ph) {
    const off = (y / ph) % 2 ? -60 : 0
    for (let x = off; x < w; x += 120) {
      const c = shade([30, rand.f(35, 55), rand.f(38, 52)], 0)
      ctx.fillStyle = hsl(...c)
      ctx.fillRect(x + 2, y + 2, 116, ph - 4)
      ctx.strokeStyle = hsl(...shade(c, -18))
      ctx.globalAlpha = 0.4
      for (let g2 = 0; g2 < 2; g2++) {
        ctx.beginPath()
        const gy = y + rand.f(6, ph - 6)
        ctx.moveTo(x + 2, gy); ctx.lineTo(x + 118, gy + rand.f(-3, 3))
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
  }
}

export function paintFloorTile(ctx, w, h, pal, rand) {
  const ts = 64
  for (let y = 0; y < h; y += ts) {
    for (let x = 0; x < w; x += ts) {
      const dark = ((x / ts) + (y / ts)) % 2 === 0
      ctx.fillStyle = hsl(...shade(pal.wall, dark ? -14 : 6))
      ctx.fillRect(x + 1, y + 1, ts - 2, ts - 2)
    }
  }
  grain(ctx, w, h, 0.004, rand)
}

// ---------- 地面 ----------
export function paintGroundPlaza(ctx, w, h, pal, rand) {
  ctx.fillStyle = hsl(...shade(pal.ground, -10))
  ctx.fillRect(0, 0, w, h)
  const ts = 120
  for (let y = 0; y < h; y += ts) {
    for (let x = 0; x < w; x += ts) {
      ctx.fillStyle = hsl(...shade(pal.ground, rand.f(-7, 7)))
      ctx.fillRect(x + 3, y + 3, ts - 6, ts - 6)
      if (rand.chance(0.08)) {
        ctx.fillStyle = hsl(...shade(pal.ground, -16))
        ctx.fillRect(x + 3, y + 3, ts - 6, ts - 6)
      }
    }
  }
  grain(ctx, w, h, 0.005, rand)
}

export function paintGroundRoad(ctx, w, h, pal, rand) {
  ctx.fillStyle = hsl(...shade(pal.ground, 0))
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = hsl(...shade(pal.ground, rand.f(-10, 10)))
    ctx.globalAlpha = rand.f(0.2, 0.5)
    ctx.beginPath()
    ctx.arc(rand.f(0, w), rand.f(0, h), rand.f(1, 5), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

export function paintGroundGrass(ctx, w, h, pal, rand) {
  ctx.fillStyle = hsl(...pal.ground)
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 1400; i++) {
    ctx.strokeStyle = hsl(pal.ground[0] + rand.f(-14, 14), rand.f(30, 55), rand.f(24, 44))
    ctx.lineWidth = rand.f(1, 2)
    const x = rand.f(0, w), y = rand.f(0, h)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + rand.f(-4, 4), y - rand.f(4, 11))
    ctx.stroke()
  }
}

export function paintGroundCyber(ctx, w, h, pal, rand) {
  ctx.fillStyle = hsl(...shade(pal.ground, -6))
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = hsl(...pal.glow)
  ctx.globalAlpha = 0.5
  const cell = 100
  for (let x = 0; x <= w; x += cell) {
    ctx.lineWidth = x % (cell * 4) === 0 ? 3 : 1
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
  }
  for (let y = 0; y <= h; y += cell) {
    ctx.lineWidth = y % (cell * 4) === 0 ? 3 : 1
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }
  ctx.globalAlpha = 1
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = hsl(...pal.accent)
    ctx.globalAlpha = rand.f(0.06, 0.16)
    ctx.fillRect(rand.f(0, w), rand.f(0, h), rand.f(60, 200), rand.f(3, 7))
  }
  ctx.globalAlpha = 1
}
