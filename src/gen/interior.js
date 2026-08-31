// 室内生成器：地板/墙纸/吊灯 + 业态专属家具布局（Kenney CC0 模型 + 参数化几何）
import * as THREE from 'three/webgpu'
import { reg } from './registry.js'
import {
  box, mesh, group, cyl, sphere, cone, torus, plane, canvasTexture, col, hsl, stdMat,
  glowMat, glassMat, extrudeUp, insetPolygon, orientedBoxInPolygon,
  centroid, disposeObject, roundRect,
} from './helpers.js'
import { makeRng } from '../core/rng.js'

const FONT = '"PingFang SC","Microsoft YaHei","Segoe UI Emoji",sans-serif'

// ---------- 墙纸 ----------
function wallpaperTex(ctx, kind) {
  return canvasTexture(`wp-${ctx.dna.seed}-${kind}`, 512, 512, (c, w, h) => {
    const pal = ctx.dna.palette
    c.fillStyle = hsl(pal.wall[0], pal.wall[1] * 0.55, Math.min(93, pal.wall[2] + 4))
    c.fillRect(0, 0, w, h)
    const ac = hsl(pal.accent[0], pal.accent[1] * 0.8, Math.min(80, pal.accent[2] + 12), 0.5)
    const gc = hsl(pal.glow[0], pal.glow[1], pal.glow[2], 0.4)
    if (kind === 'stripes') {
      for (let x = 0; x < w; x += 64) { c.fillStyle = ac; c.fillRect(x, 0, 26, h) }
    } else if (kind === 'dots') {
      c.fillStyle = ac
      for (let y = 32; y < h; y += 64) for (let x = 32; x < w; x += 64) { c.beginPath(); c.arc(x + (y / 64 % 2) * 32, y, 9, 0, 7); c.fill() }
    } else if (kind === 'diamond') {
      c.strokeStyle = ac; c.lineWidth = 4
      for (let y = 0; y < h + 64; y += 64) for (let x = 0; x < w + 64; x += 64) {
        c.beginPath(); c.moveTo(x, y - 32); c.lineTo(x + 32, y); c.lineTo(x, y + 32); c.lineTo(x - 32, y); c.closePath(); c.stroke()
      }
    } else if (kind === 'plaid') {
      c.strokeStyle = ac; c.lineWidth = 14
      for (let x = 0; x < w; x += 128) { c.globalAlpha = 0.3; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke() }
      for (let y = 0; y < h; y += 128) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke() }
      c.globalAlpha = 1
    } else if (kind === 'grid') {
      c.strokeStyle = gc; c.lineWidth = 2
      for (let x = 0; x <= w; x += 42) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke() }
      for (let y = 0; y <= h; y += 42) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke() }
    } else if (kind === 'stars') {
      c.fillStyle = gc
      for (let i = 0; i < 40; i++) {
        const x = ((i * 97) % w), y = ((i * 173) % h)
        c.save(); c.translate(x, y); c.beginPath()
        for (let k = 0; k < 10; k++) {
          const r = k % 2 === 0 ? 8 : 3.2, a = -Math.PI / 2 + k * Math.PI / 5
          c[k === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r)
        }
        c.closePath(); c.fill(); c.restore()
      }
    }
    // 轻微污渍
    for (let i = 0; i < 26; i++) {
      c.fillStyle = 'rgba(0,0,0,0.03)'
      c.beginPath(); c.ellipse((i * 211) % w, (i * 97) % h, 40, 26, i, 0, 7); c.fill()
    }
  })
}

// Kenney 模型快捷取用（assets.models.furniture[name]）
function ken(ctx, name, fallbackScale = 1) {
  const m = ctx.assets?.models?.furniture?.[name]
  if (!m) return null
  const o = m.clone()
  o.traverse(ch => { if (ch.isMesh) { ch.castShadow = true; ch.receiveShadow = true } })
  o.scale.setScalar(fallbackScale)
  return o
}

function labelPlate(ctx, key, text, W, H, opts = {}) {
  const tex = canvasTexture(`ilb-${ctx.dna.seed}-${key}`, 256, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h)
    if (opts.bg) { c.fillStyle = opts.bg; c.beginPath(); c.roundRect(6, 6, w - 12, h - 12, 16); c.fill() }
    c.font = `${opts.weight || 700} ${opts.size || 44}px ${FONT}`
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillStyle = opts.color || '#fff'
    if (opts.glow) { c.shadowColor = opts.glow; c.shadowBlur = 16 }
    c.fillText(text, w / 2, h / 2)
  })
  const mat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, emissive: 0xffffff, emissiveMap: tex,
    emissiveIntensity: opts.emissive ?? 0.55, side: THREE.DoubleSide,
  })
  return plane(W, H, mat, { cast: false })
}

function hoverable(ctx, obj, type, label) {
  obj.userData.interact = { type, label }
  ctx.hoverables.push(obj)
  return obj
}

// ---------- 家具生成器（对象以自身底面中心为原点）----------

export const genIntCounterBar = reg('interior', 'intCounterBar', (ctx) => {
  const g = group()
  const L = ctx.rand.f(2.6, 4.2)
  const kenBar = ken(ctx, 'kitchenBar')
  if (kenBar) {
    kenBar.scale.setScalar(1)
    g.add(kenBar)
    const ext = ken(ctx, 'kitchenBarEnd')
    if (ext) { ext.position.x = 1.05; g.add(ext) }
    const ext2 = ken(ctx, 'kitchenBarEnd')
    if (ext2) { ext2.position.x = -1.05; ext2.rotation.y = Math.PI; g.add(ext2) }
  } else {
    const body = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -8), roughness: 0.6 })
    g.add(box(L, 1.05, 0.7, body, { p: [0, 0.525, 0] }))
    g.add(box(L + 0.14, 0.07, 0.82, stdMat({ color: col(ctx.dna.palette.main), roughness: 0.35 }), { p: [0, 1.08, 0] }))
    g.add(box(L, 0.22, 0.14, stdMat({ color: col(ctx.dna.palette.accent), roughness: 0.5 }), { p: [0, 0.32, 0.36] }))
  }
  // 收银机
  const reg_ = group(
    box(0.42, 0.12, 0.34, stdMat({ color: 0x30343c, roughness: 0.5 }), { p: [0, 0.3, 0] }),
    box(0.36, 0.3, 0.08, stdMat({ color: 0x23262d, roughness: 0.4 }), { p: [0, 0.5, -0.14], r: [-0.3, 0, 0] }),
    plane(0.3, 0.22, glowMat(col(ctx.dna.palette.glow).getHex(), 1.2), { p: [0, 0.5, -0.095], r: [-0.3, 0, 0], cast: false }),
  )
  reg_.position.set(L * 0.3, 1.12, -0.1)
  g.add(hoverable(ctx, reg_, 'counter', `${ctx.dna.business.name} · 收银台`))
  return { obj: g, size: [L + 0.6, 0.9] }
})

export const genIntCounterDisplay = reg('interior', 'intCounterDisplay', (ctx) => {
  const g = group()
  const L = ctx.rand.f(2.2, 3.4)
  const body = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -6), roughness: 0.55 })
  g.add(box(L, 0.95, 0.72, body, { p: [0, 0.475, 0] }))
  // 玻璃罩
  const glass = box(L - 0.12, 0.5, 0.6, glassMat(0xdff4ff, 0.2), { p: [0, 1.2, 0], cast: false })
  g.add(glass)
  g.add(box(L - 0.12, 0.05, 0.6, ctx.materials.trim, { p: [0, 1.46, 0], cast: false }))
  // 罩内发光商品
  for (let i = 0; i < Math.floor(L / 0.55); i++) {
    const s = ctx.rand.f(0.14, 0.24)
    g.add(box(s, s * 0.7, s, glowMat(col(ctx.dna.palette.glow).getHex(), 1.1), {
      p: [-L / 2 + 0.4 + i * 0.55, 1.03, ctx.rand.f(-0.12, 0.12)], r: [0, ctx.rand.f(0, 1), 0], cast: false,
    }))
  }
  return { obj: hoverable(ctx, g, 'display', '展示柜'), size: [L + 0.4, 0.9] }
})

export const genIntStools = reg('interior', 'intStools', (ctx) => {
  const g = group()
  const n = ctx.rand.i(2, 4)
  for (let i = 0; i < n; i++) {
    let st = ken(ctx, ctx.rand.chance(0.5) ? 'stoolBar' : 'stoolBarSquare')
    if (st) {
      st.position.set((i - (n - 1) / 2) * 0.75, 0, 0)
    } else {
      const leg = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -14), roughness: 0.5, metalness: 0.4 })
      st = group(
        cyl(0.17, 0.17, 0.06, stdMat({ color: col(ctx.dna.palette.accent), roughness: 0.6 }), { p: [0, 0.62, 0], seg: 14 }),
        cyl(0.035, 0.035, 0.6, leg, { p: [0, 0.3, 0] }),
        cyl(0.16, 0.18, 0.03, leg, { p: [0, 0.015, 0], seg: 14 }),
      )
      st.position.set((i - (n - 1) / 2) * 0.75, 0, 0)
    }
    g.add(st)
  }
  return { obj: g, size: [n * 0.75, 0.6] }
})

export const genIntTableSet = reg('interior', 'intTableSet', (ctx) => {
  const g = group()
  const table = ken(ctx, ctx.rand.pick(['tableRound', 'table', 'tableCross']))
  if (table) {
    table.rotation.y = ctx.rand.f(0, 3)
    g.add(table)
  } else {
    g.add(cyl(0.55, 0.55, 0.05, stdMat({ color: col(ctx.dna.palette.trim), roughness: 0.5 }), { p: [0, 0.74, 0], seg: 18 }))
    g.add(cyl(0.05, 0.05, 0.72, ctx.materials.trim, { p: [0, 0.36, 0] }))
    g.add(cyl(0.3, 0.34, 0.04, ctx.materials.trim, { p: [0, 0.02, 0], seg: 16 }))
  }
  // 桌面小物（业态道具）
  const propKind = ctx.dna.business.props?.[0] || 'cup'
  const s = 0.16
  const prop = box(s, s, s, glowMat(col(ctx.dna.palette.glow).getHex(), 0.9), { p: [ctx.rand.f(-0.2, 0.2), 0.84, ctx.rand.f(-0.2, 0.2)], r: [0, ctx.rand.f(0, 2), 0], cast: false })
  g.add(prop)
  // 椅子 ×2
  for (const side of [-1, 1]) {
    let ch = ken(ctx, ctx.rand.pick(['chair', 'chairCushion', 'chairModernCushion']))
    if (ch) {
      ch.position.set(side * 0.95, 0, 0)
      ch.rotation.y = -side * Math.PI / 2
    } else {
      ch = group(
        box(0.42, 0.05, 0.42, stdMat({ color: col(ctx.dna.palette.main), roughness: 0.7 }), { p: [0, 0.45, 0] }),
        box(0.42, 0.5, 0.05, stdMat({ color: col(ctx.dna.palette.main), roughness: 0.7 }), { p: [0, 0.7, -0.19] }),
        cyl(0.03, 0.03, 0.45, ctx.materials.trim, { p: [0.17, 0.22, 0.17] }),
        cyl(0.03, 0.03, 0.45, ctx.materials.trim, { p: [-0.17, 0.22, 0.17] }),
        cyl(0.03, 0.03, 0.45, ctx.materials.trim, { p: [0.17, 0.22, -0.17] }),
        cyl(0.03, 0.03, 0.45, ctx.materials.trim, { p: [-0.17, 0.22, -0.17] }),
      )
      ch.position.set(side * 0.95, 0, 0)
      ch.rotation.y = -side * Math.PI / 2
    }
    g.add(ch)
  }
  return { obj: g, size: [1.9, 1.9] }
})

export const genIntSofaCorner = reg('interior', 'intSofaCorner', (ctx) => {
  const g = group()
  const s1 = ken(ctx, 'loungeSofaCorner')
  if (s1) { g.add(s1) } else {
    const mat = stdMat({ color: col(ctx.dna.palette.accent, null, 0, 0, -6), roughness: 0.85 })
    g.add(box(1.8, 0.42, 0.8, mat, { p: [0, 0.21, 0] }))
    g.add(box(1.8, 0.55, 0.22, mat, { p: [0, 0.6, -0.29] }))
    g.add(box(0.8, 0.42, 1.2, mat, { p: [0.5, 0.21, 0.7] }))
    g.add(box(0.22, 0.55, 1.2, mat, { p: [0.89, 0.6, 0.7] }))
  }
  const p1 = ken(ctx, 'pillow')
  if (p1) { p1.position.set(-0.5, 0.5, 0.1); p1.rotation.y = 0.4; g.add(p1) }
  return { obj: g, size: [1.9, 2.1] }
})

export const genIntShelfBooks = reg('interior', 'intShelfBooks', (ctx) => {
  const g = group()
  const bc = ken(ctx, 'bookcaseOpen')
  if (bc) {
    g.add(bc)
    const b2 = ken(ctx, 'bookcaseOpenLow')
    if (b2) { b2.position.set(-1.1, 0, 0.3); b2.rotation.y = 0.3; g.add(b2) }
  } else {
    const wood = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -10), roughness: 0.8 })
    g.add(box(1.6, 2.1, 0.36, wood, { p: [0, 1.05, 0] }))
    for (let s = 0; s < 4; s++) {
      g.add(box(1.5, 0.04, 0.3, wood, { p: [0, 0.4 + s * 0.52, 0], cast: false }))
      let x = -0.68
      while (x < 0.6) {
        const bw = ctx.rand.f(0.05, 0.1), bh = ctx.rand.f(0.26, 0.4)
        g.add(box(bw, bh, 0.22, stdMat({
          color: col([ctx.rand.f(0, 360), 55, ctx.rand.f(35, 60)]), roughness: 0.85,
        }), { p: [x + bw / 2, 0.44 + s * 0.52 + bh / 2, 0], cast: false }))
        x += bw + 0.012
      }
    }
  }
  return { obj: hoverable(ctx, g, 'shelf', '书架'), size: [1.8, 0.6] }
})

export const genIntShelfWall = reg('interior', 'intShelfWall', (ctx) => {
  const g = group()
  const wood = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -12), roughness: 0.75 })
  const rows = ctx.rand.i(2, 3)
  for (let r = 0; r < rows; r++) {
    const y = 1.3 + r * 0.62
    g.add(box(1.7, 0.05, 0.3, wood, { p: [0, y, 0], cast: false }))
    let x = -0.75
    while (x < 0.62) {
      const s = ctx.rand.f(0.12, 0.24)
      const isGlow = ctx.rand.chance(0.28)
      g.add(box(s, s * ctx.rand.f(0.8, 1.4), s * 0.7, isGlow
        ? glowMat(col(ctx.dna.palette.glow).getHex(), 1.2)
        : stdMat({ color: col([ctx.rand.f(0, 360), 50, ctx.rand.f(40, 65)]), roughness: 0.7 }), {
        p: [x + s / 2, y + s * 0.55, 0], cast: false,
      }))
      x += s + 0.05
    }
  }
  g.add(box(0.06, rows * 0.62 + 0.3, 0.06, wood, { p: [-0.8, 1.3 + (rows - 1) * 0.31, 0] }))
  g.add(box(0.06, rows * 0.62 + 0.3, 0.06, wood, { p: [0.8, 1.3 + (rows - 1) * 0.31, 0] }))
  return { obj: g, size: [1.8, 0.5], wall: true }
})

export const genIntShelfGrocery = reg('interior', 'intShelfGrocery', (ctx) => {
  const g = group()
  const body = stdMat({ color: col(ctx.dna.palette.main, null, 0, 0, -14), roughness: 0.7 })
  g.add(box(2.4, 1.9, 0.55, body, { p: [0, 0.95, 0] }))
  for (let r = 0; r < 4; r++) {
    const y = 0.42 + r * 0.48
    g.add(box(2.3, 0.04, 0.5, ctx.materials.trim, { p: [0, y, 0.02], cast: false }))
    let x = -1.05
    while (x < 0.95) {
      const bw = ctx.rand.f(0.14, 0.26), bh = ctx.rand.f(0.2, 0.36)
      g.add(box(bw, bh, 0.2, ctx.rand.chance(0.25)
        ? glowMat(col(ctx.dna.palette.glow).getHex(), 0.8)
        : stdMat({ color: col([ctx.rand.f(0, 360), 60, ctx.rand.f(45, 70)]), roughness: 0.75 }), {
        p: [x + bw / 2, y + bh / 2 + 0.02, 0.08], cast: false,
      }))
      x += bw + 0.03
    }
  }
  return { obj: hoverable(ctx, g, 'shelf', '货架'), size: [2.5, 0.7] }
})

export const genIntFridge = reg('interior', 'intFridge', (ctx) => {
  const g = group()
  const fr = ken(ctx, ctx.rand.pick(['kitchenFridgeLarge', 'kitchenFridge']))
  if (fr) { g.add(fr) } else {
    const metal = stdMat({ color: 0xd6dade, metalness: 0.7, roughness: 0.35 })
    g.add(box(0.85, 1.9, 0.75, metal, { p: [0, 0.95, 0] }))
    g.add(box(0.02, 1.2, 0.66, stdMat({ color: 0x9aa2ab, metalness: 0.8, roughness: 0.3 }), { p: [0.44, 1.0, 0], cast: false }))
    const door = plane(0.5, 1.5, glassMat(0xbfe8ff, 0.24), { p: [0, 1.0, 0.39], cast: false })
    g.add(door)
    for (let i = 0; i < 4; i++) {
      g.add(box(ctx.rand.f(0.12, 0.2), 0.14, 0.14, glowMat(col(ctx.dna.palette.glow).getHex(), 0.7), {
        p: [ctx.rand.f(-0.25, 0.25), 0.6 + i * 0.34, 0.28], cast: false,
      }))
    }
  }
  return { obj: hoverable(ctx, g, 'fridge', '冰柜'), size: [1.0, 0.9] }
})

export const genIntCoffeeMachine = reg('interior', 'intCoffeeMachine', (ctx) => {
  const g = group()
  const cm = ken(ctx, 'kitchenCoffeeMachine')
  const base = group()
  if (cm) base.add(cm)
  else {
    base.add(box(0.5, 0.55, 0.42, stdMat({ color: 0x2c2f36, roughness: 0.35, metalness: 0.5 }), { p: [0, 0.28, 0] }))
    base.add(cyl(0.09, 0.07, 0.14, glowMat(0xffb52e, 1.8), { p: [0, 0.62, 0], cast: false }))
    base.add(cyl(0.06, 0.05, 0.1, stdMat({ color: 0xe8e2d5, roughness: 0.6 }), { p: [0, 0.06, 0.1], seg: 12 }))
  }
  g.add(hoverable(ctx, base, 'coffee', '咖啡机'))
  return { obj: g, size: [0.6, 0.5] }
})

export const genIntStove = reg('interior', 'intStove', (ctx) => {
  const g = group()
  const st = ken(ctx, ctx.rand.pick(['kitchenStove', 'kitchenStoveElectric']))
  if (st) { g.add(st) } else {
    g.add(box(0.8, 0.85, 0.65, stdMat({ color: 0x33383f, roughness: 0.4, metalness: 0.6 }), { p: [0, 0.43, 0] }))
    for (const [dx, dz] of [[-0.18, -0.12], [0.18, -0.12], [-0.18, 0.14], [0.18, 0.14]]) {
      g.add(torus(0.09, 0.02, glowMat(0xff5a2d, 2.2), { p: [dx, 0.86, dz], r: [Math.PI / 2, 0, 0], seg: 18, cast: false }))
    }
  }
  // 蒸汽
  const steam = group()
  for (let i = 0; i < 3; i++) {
    const p = sphere(0.09, stdMat({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 1 }), {
      p: [ctx.rand.f(-0.15, 0.15), 1.0 + i * 0.22, ctx.rand.f(-0.1, 0.1)], cast: false,
    })
    steam.add(p)
  }
  g.add(steam)
  let t = 0
  ctx.animate.push({
    update(dt) {
      t += dt
      steam.children.forEach((p, i) => {
        p.position.y = 1.0 + ((t * 0.5 + i * 0.33) % 1) * 0.7
        p.material.opacity = 0.4 * (1 - ((t * 0.5 + i * 0.33) % 1))
      })
    },
  })
  return { obj: g, size: [0.9, 0.8] }
})

export const genIntTv = reg('interior', 'intTv', (ctx) => {
  const g = group()
  const tv = ken(ctx, 'televisionModern')
  if (tv) { g.add(tv) } else {
    g.add(box(1.1, 0.65, 0.07, stdMat({ color: 0x14161a, roughness: 0.4 }), { p: [0, 1.2, 0] }))
    g.add(box(0.3, 0.05, 0.2, stdMat({ color: 0x14161a, roughness: 0.4 }), { p: [0, 0.6, 0] }))
  }
  // 发光屏幕（噪点动画）
  const scr = plane(0.96, 0.54, glowMat(col(ctx.dna.palette.glow).getHex(), 1.4), { p: [0, 1.2, 0.045], cast: false })
  g.add(scr)
  let on = true
  g.userData.interact = { type: 'tv', label: '电视' }
  ctx.hoverables.push(g)
  return { obj: g, size: [1.2, 0.4], wall: true }
})

export const genIntLampCeiling = reg('interior', 'intLampCeiling', (ctx) => {
  const g = group()
  const H = ctx.H
  const wire = cyl(0.012, 0.012, 0.5, stdMat({ color: 0x222222, roughness: 0.8 }), { p: [0, H - 0.25, 0], cast: false })
  const shadeMat = stdMat({ color: col(ctx.dna.palette.accent), roughness: 0.6, side: THREE.DoubleSide })
  const shade = cone(0.3, 0.26, shadeMat, { p: [0, H - 0.6, 0], r: [Math.PI, 0, 0], seg: 18, cast: false })
  const bulb = sphere(0.09, glowMat(0xffe9b8, 3.2), { p: [0, H - 0.68, 0], cast: false })
  g.add(wire, shade, bulb)
  const light = new THREE.PointLight(0xffdba8, 26, 12, 2)
  light.position.set(0, H - 0.7, 0)
  g.add(light)
  // 吊灯轻微摆动
  let t = ctx.rand.f(0, 9)
  ctx.animate.push({
    update(dt) {
      t += dt
      const sw = Math.sin(t * 0.8) * 0.02
      wire.rotation.z = sw; shade.rotation.z = sw; bulb.rotation.z = sw
    },
  })
  return { obj: g, size: [0.6, 0.6], light }
})

export const genIntRug = reg('interior', 'intRug', (ctx) => {
  const g = group()
  const rug = ken(ctx, ctx.rand.pick(['rugRound', 'rugRectangle', 'rugRounded']))
  if (rug) { g.add(rug) } else {
    const tex = canvasTexture(`rug-${ctx.dna.seed}`, 256, 256, (c, w, h) => {
      c.fillStyle = hsl(...ctx.dna.palette.accent.map((v, i) => i === 2 ? Math.max(30, v - 18) : v))
      c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 4, 0, 7); c.fill()
      c.strokeStyle = hsl(...ctx.dna.palette.glow); c.lineWidth = 10
      c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 24, 0, 7); c.stroke()
      c.lineWidth = 5
      c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 48, 0, 7); c.stroke()
    })
    const m = mesh(new THREE.CircleGeometry(1.15, 28), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), { p: [0, 0.015, 0], r: [-Math.PI / 2, 0, 0], cast: false })
    g.add(m)
  }
  return { obj: g, size: [2.3, 2.3] }
})

export const genIntArtWall = reg('interior', 'intArtWall', (ctx) => {
  const g = group()
  const rand = makeRng(ctx.dna.seed + '#art')
  const n = rand.i(1, 3)
  for (let i = 0; i < n; i++) {
    const kind = rand.pick(['abstract', 'mountain', 'portrait', 'food'])
    const tex = canvasTexture(`art-${ctx.dna.seed}-${i}`, 256, 256, (c, w, h) => {
      c.fillStyle = '#f4efe4'; c.fillRect(0, 0, w, h)
      c.save(); c.translate(22, 22); c.scale(0.83, 0.83)
      if (kind === 'abstract') {
        for (let k = 0; k < 7; k++) {
          c.fillStyle = hsl(rand.f(0, 360), 70, 60, 0.85)
          c.beginPath(); c.arc(rand.f(0, w), rand.f(0, h), rand.f(18, 60), 0, 7); c.fill()
        }
      } else if (kind === 'mountain') {
        const sky = c.createLinearGradient(0, 0, 0, h)
        sky.addColorStop(0, hsl(200, 60, 78)); sky.addColorStop(1, hsl(30, 60, 85))
        c.fillStyle = sky; c.fillRect(0, 0, w, h)
        c.fillStyle = hsl(150, 30, 38)
        c.beginPath(); c.moveTo(0, h); c.lineTo(w * 0.3, h * 0.3); c.lineTo(w * 0.6, h); c.fill()
        c.fillStyle = hsl(220, 25, 30)
        c.beginPath(); c.moveTo(w * 0.4, h); c.lineTo(w * 0.75, h * 0.45); c.lineTo(w, h); c.fill()
      } else if (kind === 'portrait') {
        c.fillStyle = hsl(30, 40, 80); c.fillRect(0, 0, w, h)
        c.fillStyle = hsl(30, 50, 62)
        c.beginPath(); c.arc(w / 2, h * 0.42, 44, 0, 7); c.fill()
        c.fillStyle = hsl(350, 50, 40)
        c.beginPath(); c.arc(w / 2, h * 0.85, 60, Math.PI, 0); c.fill()
        c.fillStyle = '#222'
        c.beginPath(); c.arc(w / 2 - 16, h * 0.4, 4, 0, 7); c.arc(w / 2 + 16, h * 0.4, 4, 0, 7); c.fill()
        c.strokeStyle = '#a55'; c.lineWidth = 3
        c.beginPath(); c.arc(w / 2, h * 0.47, 10, 0.2, Math.PI - 0.2); c.stroke()
      } else {
        c.fillStyle = hsl(200, 30, 20); c.fillRect(0, 0, w, h)
        c.font = `90px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'
        c.fillText(ctx.dna.business.icon, w / 2, h / 2)
      }
      c.restore()
      c.strokeStyle = '#8a7350'; c.lineWidth = 14
      c.strokeRect(7, 7, w - 14, h - 14)
    })
    const frame = box(0.72, 0.72, 0.05, stdMat({ color: 0x8a7350, roughness: 0.6 }), { p: [i * 0.95 - (n - 1) * 0.475, 0, 0] })
    const art = plane(0.6, 0.6, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), { p: [i * 0.95 - (n - 1) * 0.475, 0, 0.032], cast: false })
    g.add(frame, art)
  }
  g.userData.interact = { type: 'art', label: '店内挂画' }
  ctx.hoverables.push(g)
  return { obj: g, size: [n * 0.95, 0.2], wall: true, elevation: 1.55 }
})

export const genIntPlantCorner = reg('interior', 'intPlantCorner', (ctx) => {
  const g = group()
  const p = ken(ctx, ctx.rand.pick(['pottedPlant', 'plantSmall1', 'plantSmall2', 'plantSmall3']))
  if (p) { g.add(p) } else {
    g.add(cyl(0.24, 0.3, 0.4, stdMat({ color: 0xa8552f, roughness: 0.9 }), { p: [0, 0.2, 0], seg: 14 }))
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2
      g.add(sphere(0.16, stdMat({ color: col([110, 45, 32 + ctx.rand.f(-8, 10)]), roughness: 0.9 }), {
        p: [Math.cos(a) * 0.2, 0.55 + (i % 3) * 0.22, Math.sin(a) * 0.2],
      }))
    }
  }
  return { obj: g, size: [0.7, 0.7] }
})

export const genIntMirror = reg('interior', 'intMirror', (ctx) => {
  const g = group()
  g.add(box(0.9, 1.3, 0.06, stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -12), roughness: 0.6 }), { p: [0, 1.5, 0] }))
  const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xcfe8ff, metalness: 0.95, roughness: 0.05 })
  g.add(plane(0.76, 1.16, mirrorMat, { p: [0, 1.5, 0.04], cast: false }))
  // 灯泡圈（理发店灯）
  for (let i = 0; i < 6; i++) {
    g.add(sphere(0.045, glowMat(0xfff2cf, 2.6), { p: [-0.38 + i * 0.152, 2.2, 0.06], cast: false }))
  }
  return { obj: hoverable(ctx, g, 'mirror', '理发镜'), size: [1.0, 0.3], wall: true }
})

export const genIntBarberChair = reg('interior', 'intBarberChair', (ctx) => {
  const g = group()
  const leather = stdMat({ color: col(ctx.dna.palette.accent, null, 0, 0, -10), roughness: 0.55 })
  g.add(cyl(0.3, 0.36, 0.1, stdMat({ color: 0x33363c, metalness: 0.8, roughness: 0.3 }), { p: [0, 0.05, 0], seg: 5 }))
  g.add(box(0.5, 0.08, 0.5, stdMat({ color: 0x33363c, metalness: 0.8, roughness: 0.3 }), { p: [0, 0.5, 0] }))
  g.add(cyl(0.06, 0.08, 0.4, stdMat({ color: 0x33363c, metalness: 0.8, roughness: 0.3 }), { p: [0, 0.25, 0] }))
  g.add(box(0.62, 0.14, 0.62, leather, { p: [0, 0.62, 0] }))
  g.add(box(0.62, 0.7, 0.16, leather, { p: [0, 1.0, -0.26], r: [0.08, 0, 0] }))
  g.add(box(0.16, 0.1, 0.44, leather, { p: [0.36, 0.78, 0], r: [0, 0, 0.4] }))
  g.add(box(0.16, 0.1, 0.44, leather, { p: [-0.36, 0.78, 0], r: [0, 0, -0.4] }))
  const chrome = stdMat({ color: 0xd6dade, metalness: 0.9, roughness: 0.2 })
  g.add(cyl(0.02, 0.02, 1.5, chrome, { p: [0.45, 0.75, -0.2], r: [0, 0, 0.15] }))
  g.add(sphere(0.04, chrome, { p: [0.57, 1.48, -0.2], cast: false }))
  return { obj: hoverable(ctx, g, 'barberChair', '理发椅'), size: [1.0, 1.0] }
})

export const genIntPhotoStudio = reg('interior', 'intPhotoStudio', (ctx) => {
  const g = group()
  // 背景幕
  const bgTex = canvasTexture(`pbg-${ctx.dna.seed}`, 256, 256, (c, w, h) => {
    const grad = c.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, hsl(...ctx.dna.palette.main.map((v, i) => i === 2 ? Math.min(88, v + 20) : v)))
    grad.addColorStop(1, hsl(...ctx.dna.palette.accent))
    c.fillStyle = grad; c.fillRect(0, 0, w, h)
    c.fillStyle = 'rgba(255,255,255,0.12)'
    for (let i = 0; i < 30; i++) c.fillRect(rand2(c, i, w), rand2(c, i, h), 3, 3)
  })
  const curtain = plane(2.4, 2.2, new THREE.MeshStandardMaterial({ map: bgTex, roughness: 0.95 }), { p: [0, 1.3, -0.1], cast: false })
  g.add(curtain)
  g.add(box(2.5, 0.1, 0.1, ctx.materials.trim, { p: [0, 2.45, -0.05] }))
  // 相机
  const cam = group(
    box(0.5, 0.3, 0.3, stdMat({ color: 0x2a2d33, roughness: 0.4 }), { p: [0, 1.1, 0] }),
    cyl(0.11, 0.13, 0.3, stdMat({ color: 0x17191d, roughness: 0.3 }), { p: [0, 1.1, 0.25], r: [Math.PI / 2, 0, 0], seg: 16 }),
    cyl(0.06, 0.06, 0.06, glowMat(0x7ad0ff, 1.4), { p: [0, 1.1, 0.42], r: [Math.PI / 2, 0, 0], seg: 12, cast: false }),
    box(0.14, 0.1, 0.1, stdMat({ color: 0x17191d, roughness: 0.4 }), { p: [0, 1.32, -0.1] }),
    cyl(0.05, 0.07, 0.85, stdMat({ color: 0x33363c, metalness: 0.7, roughness: 0.3 }), { p: [0, 0.42, 0] }),
    cyl(0.3, 0.34, 0.06, stdMat({ color: 0x33363c, metalness: 0.7, roughness: 0.3 }), { p: [0, 0.03, 0], seg: 5 }),
  )
  g.add(hoverable(ctx, cam, 'camera', '复古相机'))
  // 影棚灯
  const lamp = group(
    box(0.3, 0.4, 0.3, stdMat({ color: 0x2a2d33, roughness: 0.4 }), { p: [1.2, 1.6, 0] }),
    plane(0.26, 0.36, glowMat(0xfff6dd, 3.4), { p: [1.2, 1.6, 0.17], cast: false }),
    cyl(0.03, 0.03, 1.4, stdMat({ color: 0x33363c, metalness: 0.7, roughness: 0.3 }), { p: [1.2, 0.7, -0.1] }),
  )
  g.add(lamp)
  return { obj: g, size: [2.6, 1.4] }
})

function rand2(c, i, w) { return (i * 137.5) % w }

export const genIntAnvil = reg('interior', 'intAnvil', (ctx) => {
  const g = group()
  const iron = stdMat({ color: 0x3a3d44, metalness: 0.9, roughness: 0.35 })
  // 铁砧
  const anvil = group(
    box(0.75, 0.16, 0.3, iron, { p: [0, 0.62, 0] }),
    cone(0.14, 0.3, iron, { p: [0.42, 0.62, 0], r: [0, 0, -Math.PI / 2], seg: 4, cast: false }),
    box(0.3, 0.3, 0.24, iron, { p: [0, 0.42, 0] }),
    box(0.55, 0.12, 0.4, stdMat({ color: 0x5a4632, roughness: 0.9 }), { p: [0, 0.06, 0] }),
  )
  g.add(hoverable(ctx, anvil, 'anvil', '铁砧'))
  // 炉火
  const forge = group(
    box(0.9, 0.85, 0.8, stdMat({ color: 0x5a5148, roughness: 0.95 }), { p: [1.1, 0.43, 0] }),
    box(0.5, 0.36, 0.1, glowMat(0xff6a2d, 2.8), { p: [1.1, 0.45, 0.41], cast: false }),
    cyl(0.09, 0.12, 0.9, stdMat({ color: 0x444a52, metalness: 0.8, roughness: 0.4 }), { p: [1.1, 1.2, -0.2] }),
  )
  g.add(forge)
  // 武器架
  const rack = group()
  rack.add(box(1.2, 0.06, 0.06, stdMat({ color: 0x6b4a2a, roughness: 0.85 }), { p: [0, 1.0, -0.9] }))
  rack.add(box(1.2, 0.06, 0.06, stdMat({ color: 0x6b4a2a, roughness: 0.85 }), { p: [0, 0.6, -0.9] }))
  for (const dx of [-0.5, 0.5]) rack.add(box(0.07, 1.05, 0.07, stdMat({ color: 0x6b4a2a, roughness: 0.85 }), { p: [dx, 0.52, -0.9] }))
  for (const dx of [-0.45, -0.15, 0.15, 0.45]) {
    rack.add(box(0.06, 0.85, 0.03, stdMat({ color: 0xcfd6dd, metalness: 0.95, roughness: 0.15 }), { p: [dx, 0.75, -0.9], r: [0, 0, dx * 0.12] }))
  }
  g.add(rack)
  return { obj: g, size: [2.4, 2.2] }
})

export const genIntRecordStation = reg('interior', 'intRecordStation', (ctx) => {
  const g = group()
  // 唱机
  const player = group(
    box(0.7, 0.1, 0.55, stdMat({ color: 0x2c2f36, roughness: 0.4 }), { p: [0, 0.75, 0] }),
    cyl(0.24, 0.24, 0.02, stdMat({ color: 0x111318, roughness: 0.2 }), { p: [0, 0.81, 0], seg: 24, cast: false }),
    cyl(0.21, 0.21, 0.01, glowMat(col(ctx.dna.palette.glow).getHex(), 0.5), { p: [0, 0.815, 0], seg: 24, cast: false }),
    box(0.02, 0.02, 0.5, stdMat({ color: 0xd6dade, metalness: 0.8, roughness: 0.3 }), { p: [0.1, 0.82, -0.05], cast: false }),
    cyl(0.06, 0.09, 0.7, stdMat({ color: 0x33363c, metalness: 0.7, roughness: 0.3 }), { p: [0, 0.35, 0] }),
  )
  g.add(hoverable(ctx, player, 'record', '黑胶唱机'))
  // 唱片箱
  for (let i = 0; i < 3; i++) {
    g.add(box(0.5, 0.36, 0.5, stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -14), roughness: 0.8 }), {
      p: [0.9, 0.18 + 0 * i, -0.3 - i * 0.55], r: [0, ctx.rand.f(-0.3, 0.3), 0],
    }))
    g.add(cyl(0.22, 0.22, 0.02, stdMat({ color: 0x111318, roughness: 0.2 }), {
      p: [0.9, 0.37, -0.3 - i * 0.55], r: [Math.PI / 2, 0, 0], seg: 20, cast: false,
    }))
  }
  // 唱片旋转
  const disc = player.children[2]
  ctx.animate.push({ update(dt) { disc.rotation.y += 2.4 * dt } })
  return { obj: g, size: [1.6, 1.6] }
})

export const genIntClockWall = reg('interior', 'intClockWall', (ctx) => {
  const g = group()
  const rand = makeRng(ctx.dna.seed + '#clk')
  const n = rand.i(3, 6)
  const hands = []
  for (let i = 0; i < n; i++) {
    const r = rand.f(0.16, 0.3)
    const face = group(
      cyl(r, r, 0.05, stdMat({ color: 0xf2ead8, roughness: 0.6 }), { p: [0, 0, 0], r: [Math.PI / 2, 0, 0], seg: 24 }),
      torus(r, 0.025, stdMat({ color: col(ctx.dna.palette.trim), roughness: 0.4 }), { p: [0, 0, 0.01], seg: 24, cast: false }),
    )
    const hour = box(0.025, r * 0.55, 0.02, stdMat({ color: 0x222222 }), { p: [0, r * 0.22, 0.045], cast: false })
    const min = box(0.02, r * 0.8, 0.02, stdMat({ color: 0x444444 }), { p: [0, r * 0.34, 0.045], cast: false })
    face.add(hour, min)
    face.position.set(rand.f(-1.1, 1.1), rand.f(1.2, 2.2), 0)
    g.add(face)
    hands.push({ hour, min, spd: rand.f(0.2, 2.4) })
  }
  ctx.animate.push({
    t: 0, update(dt) {
      this.t += dt
      for (const c of hands) {
        c.min.rotation.z = -this.t * c.spd
        c.hour.rotation.z = -this.t * c.spd / 12
      }
    },
  })
  return { obj: hoverable(ctx, g, 'clocks', '钟表墙'), size: [2.4, 0.3], wall: true }
})

export const genIntMystic = reg('interior', 'intMystic', (ctx) => {
  const g = group()
  // 圆桌 + 水晶球
  const table = group(
    cyl(0.6, 0.6, 0.06, stdMat({ color: 0x3a2a4a, roughness: 0.6 }), { p: [0, 0.76, 0], seg: 20 }),
    cyl(0.07, 0.1, 0.74, stdMat({ color: 0x2a1f38, roughness: 0.7 }), { p: [0, 0.37, 0] }),
    cyl(0.34, 0.38, 0.05, stdMat({ color: 0x2a1f38, roughness: 0.7 }), { p: [0, 0.03, 0], seg: 5 }),
  )
  g.add(table)
  const orb = sphere(0.26, new THREE.MeshStandardMaterial({
    color: 0x9a7ad8, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85,
    emissive: 0x7a5ad8, emissiveIntensity: 1.4,
  }), { p: [0, 1.12, 0], cast: false })
  g.add(hoverable(ctx, orb, 'orb', '占卜水晶球'))
  const orbLight = new THREE.PointLight(0x9a7ad8, 8, 5, 2)
  orbLight.position.set(0, 1.2, 0)
  g.add(orbLight)
  ctx.animate.push({
    t: 0, update(dt) {
      this.t += dt
      orb.position.y = 1.12 + Math.sin(this.t * 1.6) * 0.04
      orbLight.intensity = 8 + Math.sin(this.t * 2.2) * 3
    },
  })
  // 塔罗桌布
  const clothTex = canvasTexture(`tarot-${ctx.dna.seed}`, 256, 256, (c, w, h) => {
    c.fillStyle = '#1a1030'; c.fillRect(0, 0, w, h)
    c.strokeStyle = hsl(...ctx.dna.palette.glow); c.lineWidth = 3
    c.beginPath(); c.arc(w / 2, h / 2, 90, 0, 7); c.stroke()
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2
      c.beginPath(); c.arc(w / 2 + Math.cos(a) * 90, h / 2 + Math.sin(a) * 90, 5, 0, 7); c.stroke()
    }
    c.font = `60px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillStyle = hsl(...ctx.dna.palette.glow)
    c.fillText('✦', w / 2, h / 2)
  })
  g.add(plane(1.15, 1.15, new THREE.MeshStandardMaterial({ map: clothTex, roughness: 0.95 }), { p: [0, 0.795, 0], r: [-Math.PI / 2, 0, 0], cast: false }))
  // 药剂架
  for (let i = 0; i < 5; i++) {
    const hue = (i * 60 + ctx.dna.palette.glow[0]) % 360
    g.add(cyl(0.07, 0.09, 0.22, glassMat(col([hue, 70, 60]).getHex(), 0.55), {
      p: [-0.9 + i * 0.45, 1.3 + (i % 2) * 0.3, -0.8], seg: 10, cast: false,
    }))
    g.add(cyl(0.03, 0.03, 0.1, stdMat({ color: 0x6b4a2a, roughness: 0.8 }), { p: [-0.9 + i * 0.45, 1.46 + (i % 2) * 0.3, -0.8], cast: false }))
  }
  return { obj: g, size: [2.2, 2.2] }
})

export const genIntClothingRack = reg('interior', 'intClothingRack', (ctx) => {
  const g = group()
  const metal = stdMat({ color: 0x9aa4ad, metalness: 0.85, roughness: 0.3 })
  g.add(cyl(0.03, 0.03, 1.5, metal, { p: [0, 0.75, 0] }))
  g.add(cyl(0.02, 0.02, 1.6, metal, { p: [0, 1.5, 0], r: [0, 0, Math.PI / 2] }))
  for (const dx of [-0.7, 0.7]) g.add(cyl(0.02, 0.02, 0.4, metal, { p: [dx, 0.2, 0], r: [0.5, 0, 0], cast: false }))
  // 挂衣
  const rand = makeRng(ctx.dna.seed + '#rack')
  for (let i = 0; i < 6; i++) {
    const x = -0.65 + i * 0.26
    const hue = rand.f(0, 360)
    const cloth = stdMat({ color: col([hue, rand.f(30, 70), rand.f(35, 65)]), roughness: 0.95 })
    g.add(box(0.22, rand.f(0.7, 0.95), 0.1, cloth, { p: [x, 1.05, 0], r: [0, 0, rand.f(-0.05, 0.05)] }))
    g.add(cyl(0.008, 0.008, 0.12, metal, { p: [x, 1.52, 0], cast: false }))
  }
  return { obj: hoverable(ctx, g, 'rack', '古着衣架'), size: [1.7, 0.6] }
})

export const genIntToyShelf = reg('interior', 'intToyShelf', (ctx) => {
  const g = group()
  const rand = makeRng(ctx.dna.seed + '#toy')
  const body = stdMat({ color: col(ctx.dna.palette.main, null, 0, 0, -10), roughness: 0.7 })
  g.add(box(1.8, 1.7, 0.45, body, { p: [0, 0.85, 0] }))
  for (let r = 0; r < 3; r++) {
    g.add(box(1.7, 0.04, 0.4, ctx.materials.trim, { p: [0, 0.45 + r * 0.55, 0], cast: false }))
    // 玩具：小球/积木/玩偶
    for (let i = 0; i < 4; i++) {
      const x = -0.65 + i * 0.43
      const kind = rand.pick(['ball', 'block', 'bear', 'robot'])
      if (kind === 'ball') {
        g.add(sphere(0.13, stdMat({ color: col([rand.f(0, 360), 75, 60]), roughness: 0.4 }), { p: [x, 0.62 + r * 0.55, 0], cast: false }))
      } else if (kind === 'block') {
        g.add(box(0.2, 0.2, 0.2, stdMat({ color: col([rand.f(0, 360), 70, 58]), roughness: 0.5 }), { p: [x, 0.58 + r * 0.55, 0], r: [0, rand.f(0, 1), 0], cast: false }))
      } else if (kind === 'bear') {
        const fur = stdMat({ color: col([30, 50, 45]), roughness: 0.95 })
        g.add(sphere(0.09, fur, { p: [x, 0.57 + r * 0.55, 0], s: [1, 1.2, 0.8], cast: false }))
        g.add(sphere(0.06, fur, { p: [x, 0.68 + r * 0.55, 0], cast: false }))
      } else {
        g.add(box(0.12, 0.2, 0.1, stdMat({ color: 0x9aa4ad, metalness: 0.8, roughness: 0.3 }), { p: [x, 0.57 + r * 0.55, 0], cast: false }))
        g.add(sphere(0.035, glowMat(0x66d9ff, 2.2), { p: [x, 0.66 + r * 0.55, 0.05], cast: false }))
      }
    }
  }
  return { obj: hoverable(ctx, g, 'toys', '玩具墙'), size: [2.0, 0.6] }
})

export const genIntMenuBoard = reg('interior', 'intMenuBoard', (ctx) => {
  const g = group()
  const items = [
    `${ctx.dna.business.name} 招牌`, '经典款 ¥18', '进阶款 ¥28',
    '豪华款 ¥48', '会员特价 ¥9.9', '今日限定 售完即止',
  ]
  const tex = canvasTexture(`menu-${ctx.dna.seed}`, 512, 640, (c, w, h) => {
    c.fillStyle = '#24201a'; c.fillRect(0, 0, w, h)
    c.strokeStyle = '#c9a86a'; c.lineWidth = 6
    c.strokeRect(14, 14, w - 28, h - 28)
    c.fillStyle = '#f4e8ce'
    c.font = `bold 54px ${FONT}`; c.textAlign = 'center'
    c.fillText('· 菜 单 ·', w / 2, 80)
    c.font = `34px ${FONT}`; c.textAlign = 'left'
    items.forEach((t, i) => {
      const y = 160 + i * 74
      c.fillStyle = i % 2 ? '#e8dcc0' : '#d8c8a4'
      c.fillText(t, 60, y)
      if (i > 0) { c.fillStyle = '#c9a86a'; c.fillText('¥' + (i * 13 + 9), w - 130, y) }
    })
    c.font = `26px ${FONT}`; c.textAlign = 'center'; c.fillStyle = '#c9a86a'
    c.fillText('— 每日新鲜 · 手作温度 —', w / 2, h - 44)
  })
  const board = plane(1.1, 1.35, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), { cast: false })
  board.position.set(0, 1.6, 0)
  g.add(board)
  g.add(box(1.2, 1.45, 0.05, stdMat({ color: 0x171310, roughness: 0.7 }), { p: [0, 1.6, -0.03] }))
  return { obj: hoverable(ctx, g, 'menu', '菜单板'), size: [1.2, 0.3], wall: true }
})

export const genIntWindowTable = reg('interior', 'intWindowTable', (ctx) => {
  const g = group()
  const tab = ken(ctx, 'sideTable')
  if (tab) { g.add(tab) } else {
    g.add(box(0.7, 0.05, 0.5, stdMat({ color: col(ctx.dna.palette.trim), roughness: 0.6 }), { p: [0, 0.55, 0] }))
    for (const [dx, dz] of [[-0.28, -0.18], [0.28, -0.18], [-0.28, 0.18], [0.28, 0.18]]) {
      g.add(cyl(0.025, 0.025, 0.55, ctx.materials.trim, { p: [dx, 0.27, dz], cast: false }))
    }
  }
  const cup = cyl(0.06, 0.045, 0.12, stdMat({ color: 0xf2ead8, roughness: 0.5 }), { p: [0.12, 0.66, 0.06], seg: 12 })
  g.add(cup)
  return { obj: g, size: [0.8, 0.6] }
})

export const genIntPet = reg('interior', 'intPet', (ctx) => {
  const g = group()
  const kind = ctx.dna.business.npc || (ctx.rand.chance(0.5) ? 'cat' : 'dog')
  const furMat = stdMat({ color: col([ctx.rand.f(20, 45), 45, 62]), roughness: 0.95 })
  const dark = stdMat({ color: 0x1a1a1e, roughness: 0.3 })
  const pet = group(
    sphere(0.24, furMat, { p: [0, 0.2, 0], s: [1, 0.9, 1.25] }),
    sphere(0.17, furMat, { p: [0, 0.44, 0.16] }),
    cone(0.06, 0.12, furMat, { p: [-0.09, 0.58, 0.14], r: [0, 0, 0.3], seg: 8, cast: false }),
    cone(0.06, 0.12, furMat, { p: [0.09, 0.58, 0.14], r: [0, 0, -0.3], seg: 8, cast: false }),
    sphere(0.025, dark, { p: [-0.06, 0.47, 0.31], cast: false }),
    sphere(0.025, dark, { p: [0.06, 0.47, 0.31], cast: false }),
    sphere(0.04, dark, { p: [0, 0.4, 0.33], cast: false }),
    cyl(0.03, 0.05, 0.3, furMat, { p: [0, 0.32, -0.28], r: [-0.6, 0, 0], cast: false }),
  )
  g.add(hoverable(ctx, pet, 'pet', `店内小${kind === 'cat' ? '猫' : '狗'}`))
  // 呼吸动画
  let t = ctx.rand.f(0, 9)
  ctx.animate.push({
    update(dt) {
      t += dt
      pet.scale.y = 1 + Math.sin(t * 2.2) * 0.04
      pet.rotation.y = Math.sin(t * 0.3) * 0.3
    },
  })
  // 碗
  g.add(cyl(0.1, 0.07, 0.06, stdMat({ color: col(ctx.dna.palette.accent), roughness: 0.4 }), { p: [0.45, 0.03, 0.3], seg: 14 }))
  return { obj: g, size: [0.9, 0.9] }
})

// 简易收银台（杂货铺用）
export const genIntCounterCheckout = reg('interior', 'intCounterCheckout', (ctx) => {
  const g = group()
  const desk = ken(ctx, 'desk')
  if (desk) { g.add(desk) } else {
    g.add(box(1.6, 0.75, 0.7, stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -10), roughness: 0.7 }), { p: [0, 0.375, 0] }))
  }
  const reg_ = group(
    box(0.4, 0.1, 0.3, stdMat({ color: 0x30343c, roughness: 0.5 }), { p: [0.3, 0.85, 0] }),
    plane(0.26, 0.18, glowMat(col(ctx.dna.palette.glow).getHex(), 1.2), { p: [0.3, 0.9, 0.12], r: [-0.5, 0, 0], cast: false }),
  )
  g.add(reg_)
  return { obj: hoverable(ctx, g, 'counter', '收银台'), size: [1.7, 0.9] }
})

// ================= 扩充组件库（第二批） =================

// 点唱机：拱形顶 + 发光曲目屏 + 唱片
export const genIntJukebox = reg('interior', 'intJukebox', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const bodyM = stdMat({ color: col(pal.main, null, 0, 0, -14), roughness: 0.45, metalness: 0.3 })
  g.add(box(1.0, 1.35, 0.62, bodyM, { p: [0, 0.675, 0] }))
  const glowC = col(pal.glow).getHex()
  g.add(cyl(0.5, 0.5, 0.62, stdMat({ color: col(pal.accent, null, 0, 0, -8), roughness: 0.4 }), { p: [0, 1.35, 0], r: [Math.PI / 2, 0, 0], seg: 20 }))
  const scr = plane(0.72, 0.5, glowMat(glowC, 1.5), { p: [0, 1.02, 0.32], cast: false })
  g.add(scr)
  g.add(plane(0.62, 0.2, stdMat({ color: col(pal.trim), roughness: 0.5 }), { p: [0, 0.55, 0.32], cast: false }))
  // 唱片出口 + 两侧音符灯
  g.add(cyl(0.07, 0.07, 0.05, stdMat({ color: 0x14141c, roughness: 0.3 }), { p: [0.28, 0.4, 0.32], r: [Math.PI / 2, 0, 0], seg: 14 }))
  for (const x of [-0.38, 0.38]) {
    g.add(box(0.08, 0.55, 0.08, glowMat(glowC, 1.3), { p: [x, 0.95, 0.3], cast: false }))
  }
  return { obj: hoverable(ctx, g, 'jukebox', '点唱机 · 点首歌吧'), size: [1.1, 0.8] }
})

// 街机：高柜 + 发光屏 + 摇杆台
export const genIntArcade = reg('interior', 'intArcade', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const glowC = col(pal.glow).getHex()
  const cab = stdMat({ color: col(pal.main, null, 0, 0, -18), roughness: 0.5 })
  g.add(box(0.85, 1.8, 0.75, cab, { p: [0, 0.9, 0] }))
  g.add(box(0.85, 0.35, 0.82, stdMat({ color: col(pal.accent), roughness: 0.4 }), { p: [0, 1.62, 0.04] }))
  const scr = plane(0.6, 0.45, glowMat(glowC, 1.6), { p: [0, 1.28, 0.39], r: [-0.16, 0, 0], cast: false })
  g.add(scr)
  g.add(box(0.7, 0.1, 0.3, stdMat({ color: 0x1c1f28, roughness: 0.6 }), { p: [0, 1.02, 0.32], r: [-0.12, 0, 0] }))
  // 摇杆 + 按钮
  g.add(cyl(0.025, 0.025, 0.14, stdMat({ color: 0xd8dce6, roughness: 0.35, metalness: 0.5 }), { p: [-0.16, 1.14, 0.3], seg: 10 }))
  g.add(sphere(0.045, stdMat({ color: 0xe8384f, roughness: 0.3 }), { p: [-0.16, 1.21, 0.3], cast: false }))
  for (let i = 0; i < 3; i++) {
    g.add(cyl(0.035, 0.035, 0.03, glowMat(i === 0 ? 0x50e3c2 : 0xf5d020, 1.0), { p: [0.05 + i * 0.1, 1.1, 0.3], seg: 12 }))
  }
  return { obj: hoverable(ctx, g, 'arcade', '街机 · insert coin'), size: [1.0, 0.9] }
})

// 口香糖机：玻璃球 + 糖果
export const genIntGumball = reg('interior', 'intGumball', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const metal = stdMat({ color: 0xb8543a, roughness: 0.35, metalness: 0.6 })
  g.add(cyl(0.16, 0.2, 0.06, metal, { p: [0, 0.03, 0], seg: 18 }))
  g.add(cyl(0.045, 0.045, 0.68, metal, { p: [0, 0.38, 0], seg: 12 }))
  g.add(cyl(0.3, 0.34, 0.08, metal, { p: [0, 0.76, 0], seg: 18 }))
  const glass = sphere(0.3, glassMat(0xfff2f8, 0.22), { p: [0, 1.16, 0], cast: false })
  g.add(glass)
  // 糖果球
  for (let i = 0; i < 14; i++) {
    const a = i * 2.399, r = i === 0 ? 0 : 0.06 + (i / 14) * 0.2
    g.add(sphere(0.055, stdMat({ color: col([i * 47 % 360, 85, 62]), roughness: 0.25 }), {
      p: [Math.cos(a) * r, 1.03 + (i / 14) * 0.3, Math.sin(a) * r], cast: false,
    }))
  }
  g.add(box(0.14, 0.1, 0.1, stdMat({ color: col(pal.accent), roughness: 0.4 }), { p: [0, 0.7, 0.3] }))
  return { obj: hoverable(ctx, g, 'gumball', '口香糖机 · 五毛一颗'), size: [0.7, 0.7] }
})

// 墙式鱼缸：玻璃水族箱 + 游鱼 + 底柜
export const genIntAquarium = reg('interior', 'intAquarium', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  g.add(box(1.5, 0.62, 0.5, stdMat({ color: col(pal.trim, null, 0, 0, -16), roughness: 0.6 }), { p: [0, 0.31, 0] }))
  const glass = box(1.44, 0.72, 0.44, glassMat(0x9fe8e0, 0.24), { p: [0, 1.18, 0], cast: false })
  g.add(glass)
  g.add(box(1.44, 0.06, 0.44, stdMat({ color: col(pal.main), roughness: 0.4 }), { p: [0, 1.56, 0], cast: false }))
  // 水草 + 石 + 鱼
  for (let i = 0; i < 5; i++) {
    g.add(cyl(0.012, 0.03, 0.3, stdMat({ color: col([130, 55, 38]), roughness: 0.9 }), { p: [-0.55 + i * 0.28, 0.98, ctx.rand.f(-0.12, 0.12)], seg: 5 }))
  }
  for (let i = 0; i < 3; i++) {
    g.add(sphere(0.06, stdMat({ color: col([30, 15, 48]), roughness: 0.95 }), { p: [ctx.rand.f(-0.5, 0.5), 0.85, ctx.rand.f(-0.1, 0.1)], s: [1, 0.6, 1], cast: false }))
  }
  const fishM = []
  for (let i = 0; i < 4; i++) {
    const fish = group(
      sphere(0.06, stdMat({ color: col([(i * 80 + 20) % 360, 90, 60]), roughness: 0.4 }), { s: [1.4, 0.8, 0.5] }),
      cone(0.05, 0.09, stdMat({ color: col([(i * 80 + 20) % 360, 90, 50]), roughness: 0.4 }), { p: [0, 0, -0.09], r: [-Math.PI / 2, 0, 0], seg: 6 }),
    )
    fish.position.set(ctx.rand.f(-0.55, 0.55), 1.05 + i * 0.12, ctx.rand.f(-0.1, 0.1))
    g.add(fish)
    fishM.push(fish)
  }
  ctx.animate.push({
    update: (dt) => {
      for (let i = 0; i < fishM.length; i++) {
        const f = fishM[i]
        f.position.x += Math.sin(performance.now() * 0.001 * (0.5 + i * 0.17) + i * 2) * dt * 0.24
        f.rotation.y = Math.cos(performance.now() * 0.001 * (0.5 + i * 0.17) + i * 2) * 0.5
      }
    },
  })
  // 灯带
  g.add(box(1.3, 0.03, 0.03, glowMat(col(pal.glow).getHex(), 1.4), { p: [0, 1.52, 0.21], cast: false }))
  return { obj: hoverable(ctx, g, 'aquarium', '鱼缸 · 鱼在加班'), size: [1.6, 0.7] }
})

// 茶席：矮桌 + 茶壶茶杯 + 坐垫
export const genIntTeaTable = reg('interior', 'intTeaTable', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const wood = stdMat({ color: col([28, 42, 32]), roughness: 0.55 })
  g.add(cyl(0.55, 0.62, 0.06, wood, { p: [0, 0.34, 0], seg: 22 }))
  g.add(cyl(0.34, 0.4, 0.3, stdMat({ color: col([26, 35, 26]), roughness: 0.6 }), { p: [0, 0.17, 0], seg: 18 }))
  // 茶壶 + 杯
  const potM = stdMat({ color: col(pal.main, null, 0, 0, -6), roughness: 0.3 })
  g.add(sphere(0.11, potM, { p: [0, 0.46, 0], s: [1, 0.85, 1] }))
  g.add(cyl(0.04, 0.05, 0.05, potM, { p: [0, 0.56, 0], seg: 10 }))
  g.add(torus(0.09, 0.014, potM, { p: [0, 0.46, 0], r: [Math.PI / 2, 0, 0] }))
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + 0.4
    g.add(cyl(0.05, 0.035, 0.055, stdMat({ color: 0xf2ede2, roughness: 0.35 }), { p: [Math.cos(a) * 0.3, 0.4, Math.sin(a) * 0.3], seg: 12 }))
  }
  // 坐垫 ×3
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + 0.7
    g.add(cyl(0.26, 0.28, 0.09, stdMat({ color: col(pal.accent, null, 0, -10, -6), roughness: 0.95 }), { p: [Math.cos(a) * 0.95, 0.045, Math.sin(a) * 0.95], seg: 18 }))
  }
  return { obj: hoverable(ctx, g, 'tea', '茶席 · 慢下来'), size: [2.0, 2.0] }
})

// 寿司柜：玻璃转柜 + 寿司 + 传送带
export const genIntSushiCase = reg('interior', 'intSushiCase', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const L = 2.4
  g.add(box(L, 0.85, 0.85, stdMat({ color: col(pal.trim, null, 0, 0, -10), roughness: 0.45 }), { p: [0, 0.425, 0] }))
  g.add(box(L, 0.5, 0.78, glassMat(0xdff6f0, 0.18), { p: [0, 1.1, 0], cast: false }))
  g.add(box(L, 0.06, 0.78, stdMat({ color: col(pal.main), roughness: 0.35 }), { p: [0, 1.38, 0], cast: false }))
  // 寿司盘旋转
  const belt = group()
  const plates = []
  for (let i = 0; i < 5; i++) {
    const x = -L / 2 + 0.3 + i * (L - 0.6) / 4
    const plate = group(
      cyl(0.16, 0.18, 0.03, stdMat({ color: 0x181c22, roughness: 0.4 }), { p: [0, 0.88, 0], seg: 16 }),
      box(0.16, 0.05, 0.1, stdMat({ color: 0xf5efe0, roughness: 0.5 }), { p: [0, 0.92, 0] }),
      box(0.14, 0.035, 0.055, stdMat({ color: col([(i * 60 + 8) % 360, 82, 58]), roughness: 0.35 }), { p: [0, 0.96, 0] }),
    )
    plate.position.x = x
    belt.add(plate)
    plates.push(plate)
  }
  g.add(belt)
  ctx.animate.push({
    update: (dt) => {
      belt.position.x = (belt.position.x + dt * 0.32) % 0.48
      for (const p of plates) p.rotation.y = Math.sin(performance.now() * 0.001 + p.position.x) * 0.2
    },
  })
  return { obj: hoverable(ctx, g, 'sushi', '回转寿司 · 限时特供'), size: [L + 0.3, 1.0] }
})

// 奖杯架：阶梯展示台 + 金银铜杯
export const genIntTrophy = reg('interior', 'intTrophy', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const shelfM = stdMat({ color: col(pal.trim, null, 0, 0, -12), roughness: 0.5 })
  g.add(box(1.3, 0.06, 0.4, shelfM, { p: [0, 1.4, 0] }))
  g.add(box(1.0, 0.06, 0.4, shelfM, { p: [0, 1.0, 0] }))
  g.add(box(0.7, 0.06, 0.4, shelfM, { p: [0, 0.6, 0] }))
  g.add(box(1.3, 1.5, 0.05, stdMat({ color: col(pal.wall, null, 0, 0, -8), roughness: 0.7 }), { p: [0, 0.75, -0.2] }))
  // 奖杯：杯体+底座
  const mkTrophy = (x, y, s, metalC) => {
    const m = stdMat({ color: metalC, roughness: 0.22, metalness: 0.85 })
    return group(
      cyl(0.05, 0.07, 0.04, m, { p: [x, y + 0.02, 0], seg: 12 }),
      cyl(0.02, 0.03, 0.08, m, { p: [x, y + 0.08, 0], seg: 10 }),
      cyl(0.07 * s, 0.035, 0.12, m, { p: [x, y + 0.17, 0], seg: 14 }),
      torus(0.055, 0.014, m, { p: [x, y + 0.24, 0], r: [Math.PI / 2, 0, 0] }),
    )
  }
  g.add(mkTrophy(0, 1.44, 1, 0xe8b93c))
  for (const x of [-0.42, 0.42]) g.add(mkTrophy(x, 1.44, 0.8, 0xc8ccd6))
  for (const x of [-0.25, 0.25]) g.add(mkTrophy(x, 1.04, 0.7, 0xc98a4b))
  g.add(mkTrophy(0, 0.64, 0.6, 0xc98a4b))
  return { obj: hoverable(ctx, g, 'trophy', '荣誉墙 · 镇店之宝'), size: [1.4, 0.6] }
})

// 人台：服装店展示
export const genIntMannequin = reg('interior', 'intMannequin', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const skin = stdMat({ color: 0xd9c4ae, roughness: 0.65 })
  g.add(cyl(0.22, 0.26, 0.04, stdMat({ color: col(pal.trim, null, 0, 0, -14), roughness: 0.4, metalness: 0.4 }), { p: [0, 0.02, 0], seg: 16 }))
  g.add(cyl(0.025, 0.025, 0.75, stdMat({ color: 0x9aa2ae, roughness: 0.35, metalness: 0.6 }), { p: [0, 0.4, 0], seg: 10 }))
  g.add(sphere(0.1, skin, { p: [0, 0.82, 0], s: [1, 0.7, 1] }))
  // 躯干（穿着店里的衣服）
  const cloth = stdMat({ color: col(pal.main), roughness: 0.85 })
  g.add(sphere(0.19, cloth, { p: [0, 1.05, 0], s: [1, 1.35, 0.72] }))
  g.add(sphere(0.16, cloth, { p: [0, 1.32, 0], s: [1.05, 0.5, 0.7] }))
  // 头
  g.add(sphere(0.11, skin, { p: [0, 1.56, 0] }))
  // 展示手臂
  for (const side of [-1, 1]) {
    g.add(cyl(0.03, 0.025, 0.42, skin, { p: [side * 0.22, 1.08, 0.02], r: [0, 0, side * 1.15], seg: 8 }))
  }
  return { obj: hoverable(ctx, g, 'mannequin', '本月新品'), size: [0.6, 0.6] }
})

// 落地钟：高壳 + 钟面 + 摆锤
export const genIntGrandfatherClock = reg('interior', 'intGrandfatherClock', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const wood = stdMat({ color: col([28, 46, 26]), roughness: 0.5 })
  g.add(box(0.55, 2.1, 0.35, wood, { p: [0, 1.05, 0] }))
  g.add(box(0.62, 0.1, 0.42, stdMat({ color: col(pal.accent, null, 0, 0, -8), roughness: 0.4 }), { p: [0, 2.15, 0] }))
  // 钟面
  const face = canvasTexture(`clock-${ctx.dna.seed}`, 256, 256, (c, w, h) => {
    c.fillStyle = '#f3ead6'
    c.beginPath(); c.arc(w / 2, h / 2, 110, 0, 7); c.fill()
    c.strokeStyle = '#3a2e1e'; c.lineWidth = 7
    c.beginPath(); c.arc(w / 2, h / 2, 108, 0, 7); c.stroke()
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6
      c.beginPath()
      c.moveTo(w / 2 + Math.cos(a) * 88, h / 2 + Math.sin(a) * 88)
      c.lineTo(w / 2 + Math.cos(a) * 98, h / 2 + Math.sin(a) * 98)
      c.stroke()
    }
    c.lineWidth = 9; c.strokeStyle = '#22180c'
    c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 + 42, h / 2 - 32); c.stroke()
    c.lineWidth = 7
    c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 - 20, h / 2 - 55); c.stroke()
  })
  g.add(cyl(0.2, 0.2, 0.04, stdMat({ map: face, roughness: 0.4 }), { p: [0, 1.78, 0.18], r: [Math.PI / 2, 0, 0], seg: 24 }))
  // 摆
  const pendulum = group(
    cyl(0.012, 0.012, 1.0, stdMat({ color: 0xd8b45a, roughness: 0.3, metalness: 0.7 }), { p: [0, -0.5, 0], seg: 8 }),
    cyl(0.09, 0.09, 0.03, stdMat({ color: 0xd8b45a, roughness: 0.3, metalness: 0.7 }), { p: [0, -1.0, 0], seg: 16 }),
  )
  pendulum.position.set(0, 1.4, 0.12)
  g.add(pendulum)
  ctx.animate.push({
    update: () => { pendulum.rotation.z = Math.sin(performance.now() * 0.0016) * 0.22 },
  })
  return { obj: hoverable(ctx, g, 'clockG', '落地钟 · 滴答滴答'), size: [0.7, 0.6] }
})

// 壁炉：石砌 + 火光 + 柴堆
export const genIntFireplace = reg('interior', 'intFireplace', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const stone = stdMat({ color: col([24, 16, 42]), roughness: 0.9 })
  g.add(box(1.5, 1.5, 0.55, stone, { p: [0, 0.75, 0] }))
  g.add(box(1.0, 0.8, 0.6, stdMat({ color: 0x14100c, roughness: 0.95 }), { p: [0, 0.48, 0.03] }))
  g.add(box(1.66, 0.1, 0.62, stdMat({ color: col(pal.trim, null, 0, 0, -10), roughness: 0.5 }), { p: [0, 1.55, 0] }))
  // 柴 + 火
  for (let i = 0; i < 3; i++) {
    g.add(cyl(0.05, 0.06, 0.5, stdMat({ color: col([26, 50, 30]), roughness: 0.9 }), { p: [ctx.rand.f(-0.2, 0.2), 0.14 + i * 0.07, 0.05], r: [0, 0.3 + i, Math.PI / 2 - 0.14], seg: 8 }))
  }
  const fire = group()
  for (let i = 0; i < 5; i++) {
    const flame = cone(0.07 - i * 0.008, 0.34 - i * 0.04, glowMat(i % 2 ? 0xff9a2e : 0xffd24a, 1.8), {
      p: [(i - 2) * 0.09, 0.2 + i * 0.02, 0.05], seg: 8,
    })
    fire.add(flame)
  }
  g.add(fire)
  ctx.animate.push({
    update: (dt) => {
      fire.scale.y = 1 + Math.sin(performance.now() * 0.008) * 0.16
      fire.rotation.y += dt * 0.4
    },
  })
  g.add(box(0.36, 0.03, 0.36, glowMat(0xffb347, 0.8), { p: [0.5, 1.57, 0.1], cast: false }))
  return { obj: hoverable(ctx, g, 'fireplace', '壁炉 · 暖烘烘'), size: [1.7, 0.8], wall: true }
})

// 保险柜：金属柜 + 转盘
export const genIntSafe = reg('interior', 'intSafe', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const steel = stdMat({ color: 0x39404c, roughness: 0.38, metalness: 0.75 })
  g.add(box(0.8, 0.9, 0.65, steel, { p: [0, 0.45, 0] }))
  g.add(box(0.72, 0.82, 0.06, stdMat({ color: 0x4a5362, roughness: 0.32, metalness: 0.8 }), { p: [0, 0.45, 0.34] }))
  const dial = cyl(0.13, 0.13, 0.05, stdMat({ color: col(pal.accent), roughness: 0.3, metalness: 0.6 }), { p: [0, 0.5, 0.39], r: [Math.PI / 2, 0, 0], seg: 20 })
  g.add(dial)
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4
    g.add(box(0.015, 0.05, 0.015, stdMat({ color: 0x1c2028 }), { p: [Math.cos(a) * 0.1, 0.5 + Math.sin(a) * 0.1, 0.42], r: [0, 0, a], cast: false }))
  }
  g.add(cyl(0.045, 0.045, 0.12, stdMat({ color: 0xc8ccd6, roughness: 0.25, metalness: 0.9 }), { p: [0.24, 0.5, 0.38], r: [Math.PI / 2, 0, 0], seg: 10 }))
  ctx.animate.push({
    update: () => { dial.rotation.z = performance.now() * 0.0011 },
  })
  return { obj: hoverable(ctx, g, 'safe', '保险柜 · 里面很贵'), size: [1.0, 0.8] }
})

// 枝形吊灯（天花板槽位，由 buildInterior 挂装）
export const genIntChandelier = reg('interior', 'intChandelier', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const brass = stdMat({ color: 0xc9a24b, roughness: 0.3, metalness: 0.85 })
  const glowC = col(pal.glow).getHex()
  g.add(cyl(0.02, 0.02, 0.5, brass, { p: [0, -0.25, 0], seg: 8 }))
  const hub = group()
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3
    const arm = group(
      torus(0.3, 0.015, brass, { p: [Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3], r: [Math.PI / 2, 0, 0] }),
      cyl(0.028, 0.038, 0.1, brass, { p: [Math.cos(a) * 0.3, -0.14, Math.sin(a) * 0.3], seg: 10 }),
      cyl(0.018, 0.024, 0.16, glowMat(glowC, 1.9), { p: [Math.cos(a) * 0.3, -0.06, Math.sin(a) * 0.3], seg: 10 }),
    )
    hub.add(arm)
  }
  hub.position.y = -0.5
  g.add(hub)
  g.add(sphere(0.07, glowMat(glowC, 2.2), { p: [0, -0.48, 0], cast: false }))
  return { obj: g, size: [0.8, 0.8] }
})

// 吊扇（天花板槽位）
export const genIntCeilingFan = reg('interior', 'intCeilingFan', (ctx) => {
  const g = group()
  const fan = ken(ctx, 'ceilingFan', 1.15)
  const rotor = group()
  if (fan) {
    // Kenney 吊扇：分离桨叶旋转
    rotor.add(fan)
    g.add(rotor)
  } else {
    const wood = stdMat({ color: col([30, 40, 34]), roughness: 0.55 })
    g.add(cyl(0.018, 0.018, 0.42, stdMat({ color: 0x8b929e, roughness: 0.3, metalness: 0.7 }), { p: [0, -0.21, 0], seg: 8 }))
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2
      rotor.add(box(0.62, 0.015, 0.11, wood, { p: [Math.cos(a) * 0.31, -0.44, Math.sin(a) * 0.31], r: [0, -a, 0.06] }))
    }
    rotor.position.y = -0.44
    g.add(rotor)
  }
  const dir = ctx.rand.chance(0.5) ? 1 : -1
  ctx.animate.push({ update: (dt) => { rotor.rotation.y += dt * 2.6 * dir } })
  return { obj: g, size: [1.0, 1.0] }
})

// 室内霓虹墙：发光标语
export const genIntNeonInterior = reg('interior', 'intNeonInterior', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const text = ctx.dna.neonSub || ctx.dna.subtitle || 'OPEN'
  const tex = canvasTexture(`intneon-${ctx.dna.seed}`, 512, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h)
    c.font = `800 72px ${FONT}`
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.shadowColor = hsl(...pal.glow); c.shadowBlur = 28
    c.strokeStyle = hsl(...pal.glow); c.lineWidth = 3
    c.fillStyle = '#ffffff'
    c.fillText(text.slice(0, 8), w / 2, h / 2)
  })
  const mat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, emissive: 0xffffff, emissiveMap: tex,
    emissiveIntensity: 1.6, roughness: 0.5, side: THREE.DoubleSide,
  })
  g.add(plane(1.7, 0.42, mat, { cast: false }))
  g.add(cyl(0.02, 0.02, 0.9, stdMat({ color: 0x2a2f3a, roughness: 0.5, metalness: 0.6 }), { p: [0.7, 0.45, -0.02], seg: 8 }))
  return { obj: hoverable(ctx, g, 'neonInt', `店内霓虹 · ${text.slice(0, 6)}`), size: [1.8, 0.5], wall: true, elevation: 1.55 }
})

// 试衣间：隔断 + 帘 + 镜
export const genIntFittingRoom = reg('interior', 'intFittingRoom', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const wallM = stdMat({ color: col(pal.wall, null, 0, 0, -6), roughness: 0.8 })
  g.add(box(1.2, 2.0, 0.08, wallM, { p: [0, 1.0, -0.6] }))
  g.add(box(0.08, 2.0, 1.2, wallM, { p: [-0.6, 1.0, 0] }))
  // 镜子
  g.add(plane(0.5, 1.4, stdMat({ color: 0xcfe8f5, roughness: 0.08, metalness: 0.9 }), { p: [0.03, 1.05, -0.55], cast: false }))
  g.add(box(0.54, 1.44, 0.03, stdMat({ color: col(pal.trim), roughness: 0.4 }), { p: [0.02, 1.05, -0.57] }))
  // 帘
  const curtain = group()
  for (let i = 0; i < 6; i++) {
    curtain.add(box(0.19, 1.7, 0.03, stdMat({ color: col(pal.accent, null, 0, -15, -4), roughness: 0.95 }), {
      p: [-0.5 + i * 0.2, 1.1 + Math.sin(i * 1.3) * 0.05, 0.58], r: [0, 0, Math.sin(i * 2.1) * 0.06],
    }))
  }
  g.add(curtain)
  g.add(cyl(0.018, 0.018, 1.1, stdMat({ color: 0xc9a24b, roughness: 0.3, metalness: 0.8 }), { p: [0, 1.95, 0.58], r: [0, 0, Math.PI / 2], seg: 8 }))
  ctx.animate.push({
    update: () => { curtain.children.forEach((c, i) => { c.rotation.y = Math.sin(performance.now() * 0.0012 + i) * 0.08 }) },
  })
  return { obj: hoverable(ctx, g, 'fitting', '试衣间 · 正在变美'), size: [1.3, 1.3] }
})

// 饮水机：水桶 + 机身
export const genIntWaterCooler = reg('interior', 'intWaterCooler', (ctx) => {
  const g = group()
  const bodyM = stdMat({ color: 0xe8eaef, roughness: 0.4 })
  g.add(box(0.42, 1.0, 0.42, bodyM, { p: [0, 0.5, 0] }))
  // 蓝色水桶
  g.add(cyl(0.19, 0.16, 0.36, glassMat(0x8fd4ff, 0.4), { p: [0, 1.18, 0], seg: 16 }))
  g.add(cyl(0.08, 0.12, 0.1, stdMat({ color: 0x5ab4e8, roughness: 0.3 }), { p: [0, 1.42, 0], seg: 12 }))
  for (const [x, c] of [[-0.12, 0x50b4e8], [0.12, 0xe85850]]) {
    g.add(cyl(0.028, 0.028, 0.05, stdMat({ color: c, roughness: 0.3 }), { p: [x, 0.86, 0.2], r: [Math.PI / 2, 0, 0], seg: 10 }))
  }
  g.add(box(0.36, 0.24, 0.1, glowMat(0x9fd8ff, 0.5), { p: [0, 0.68, 0.18], cast: false }))
  // 纸杯
  g.add(cyl(0.03, 0.022, 0.07, stdMat({ color: 0xf5f2ea, roughness: 0.6 }), { p: [0.28, 0.14, 0.1], seg: 10 }))
  return { obj: hoverable(ctx, g, 'cooler', '饮水机 · 冷热两用'), size: [0.6, 0.6] }
})

// 靠墙梯子：货架取货用
export const genIntLadder = reg('interior', 'intLadder', (ctx) => {
  const g = group()
  const wood = stdMat({ color: col([32, 48, 36]), roughness: 0.6 })
  for (const x of [-0.2, 0.2]) {
    g.add(box(0.05, 2.1, 0.06, wood, { p: [x, 1.05, 0], r: [0.1, 0, 0] }))
  }
  for (let i = 0; i < 7; i++) {
    g.add(cyl(0.022, 0.022, 0.44, wood, { p: [0, 0.25 + i * 0.28, 0.11 + i * 0.02], r: [0, 0, Math.PI / 2], seg: 8 }))
  }
  g.add(box(0.05, 0.4, 0.06, wood, { p: [0, 1.9, -0.42], r: [-0.5, 0, 0] }))
  return { obj: g, size: [0.6, 0.7], wall: true }
})

// 躺椅角：休闲区（摸鱼专属）
export const genIntNapCorner = reg('interior', 'intNapCorner', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const lounger = ken(ctx, 'loungeChairRelax', 1)
  if (lounger) {
    g.add(lounger)
  } else {
    const cloth = stdMat({ color: col(pal.accent, null, 0, -10, -4), roughness: 0.9 })
    g.add(box(0.6, 0.14, 1.3, cloth, { p: [0, 0.32, 0] }))
    g.add(box(0.6, 0.14, 0.7, cloth, { p: [0, 0.55, -0.75], r: [-0.6, 0, 0] }))
    for (const [x, z] of [[-0.24, -0.5], [0.24, -0.5], [-0.24, 0.5], [0.24, 0.5]]) {
      g.add(box(0.05, 0.26, 0.05, stdMat({ color: 0x30343c, roughness: 0.5 }), { p: [x, 0.13, z] }))
    }
  }
  const side = ken(ctx, 'sideTable', 0.8)
  if (side) { side.position.set(0.75, 0, 0.15); g.add(side) }
  else g.add(cyl(0.22, 0.22, 0.04, stdMat({ color: col(pal.trim), roughness: 0.5 }), { p: [0.75, 0.5, 0.15], seg: 14 }))
  // 咖啡杯
  g.add(cyl(0.05, 0.04, 0.08, stdMat({ color: 0xf2ede2, roughness: 0.4 }), { p: [0.75, 0.56, 0.15], seg: 12 }))
  const plant = ken(ctx, 'pottedPlant', 1.1)
  if (plant) { plant.position.set(-0.85, 0, -0.3); g.add(plant) }
  return { obj: hoverable(ctx, g, 'nap', '躺椅角 · 摸鱼圣地'), size: [1.8, 1.6] }
})

// ---------- 业态布局表 ----------
const INTERIOR_SETS = {
  fastfood: { counter: 'intCounterDisplay', along: ['intStools', 'intTableSet', 'intMenuBoard', 'intRug', 'intPlantCorner', 'intTv', 'intGumball', 'intArcade'], pet: 0.5 },
  noodle: { counter: 'intCounterBar', along: ['intStools', 'intMenuBoard', 'intArtWall', 'intPlantCorner', 'intTeaTable', 'intNeonInterior', 'intSushiCase'], pet: 0.2 },
  cafe: { counter: 'intCounterBar', along: ['intCoffeeMachine', 'intTableSet', 'intSofaCorner', 'intArtWall', 'intPlantCorner', 'intRug', 'intJukebox', 'intNapCorner'], pet: 0.4 },
  books: { counter: 'intCounterBar', along: ['intShelfBooks', 'intShelfBooks', 'intTableSet', 'intWindowTable', 'intPlantCorner', 'intArtWall', 'intLadder', 'intFireplace'], pet: 0.3 },
  flower: { counter: 'intCounterDisplay', along: ['intShelfWall', 'intTableSet', 'intPlantCorner', 'intPlantCorner', 'intArtWall', 'intLadder'], pet: 0.2 },
  barber: { counter: 'intCounterBar', along: ['intBarberChair', 'intMirror', 'intPlantCorner', 'intArtWall', 'intJukebox', 'intTrophy'], pet: 0.3 },
  grocery: { counter: 'intCounterCheckout', along: ['intShelfGrocery', 'intShelfGrocery', 'intFridge', 'intShelfWall', 'intWaterCooler', 'intLadder'], pet: 0.1 },
  apothecary: { counter: 'intCounterBar', along: ['intShelfWall', 'intShelfBooks', 'intMystic', 'intPlantCorner', 'intGrandfatherClock', 'intLadder'], pet: 0.15 },
  workshop: { counter: 'intCounterBar', along: ['intShelfWall', 'intTv', 'intTableSet', 'intFridge', 'intSafe', 'intWaterCooler'], pet: 0.2 },
  toys: { counter: 'intCounterDisplay', along: ['intToyShelf', 'intToyShelf', 'intRug', 'intTableSet', 'intPet', 'intArcade', 'intGumball'], pet: 0.8 },
  records: { counter: 'intCounterBar', along: ['intRecordStation', 'intShelfWall', 'intSofaCorner', 'intArtWall', 'intPlantCorner', 'intJukebox', 'intNeonInterior'], pet: 0.25 },
  watch: { counter: 'intCounterDisplay', along: ['intClockWall', 'intShelfWall', 'intArtWall', 'intPlantCorner', 'intGrandfatherClock', 'intSafe'], pet: 0.1 },
  photo: { counter: 'intCounterBar', along: ['intPhotoStudio', 'intArtWall', 'intPlantCorner', 'intTrophy', 'intSofaCorner'], pet: 0.2 },
  mystic: { counter: 'intCounterBar', along: ['intMystic', 'intShelfWall', 'intArtWall', 'intGrandfatherClock', 'intNeonInterior'], pet: 0.3 },
  vintage: { counter: 'intCounterBar', along: ['intClothingRack', 'intClothingRack', 'intSofaCorner', 'intArtWall', 'intPlantCorner', 'intMannequin', 'intFittingRoom'], pet: 0.25 },
  smithy: { counter: 'intCounterBar', along: ['intAnvil', 'intShelfWall', 'intArtWall', 'intTrophy', 'intFireplace'], pet: 0.1 },
}

const GEN_MAP = {
  intCounterBar: genIntCounterBar, intCounterDisplay: genIntCounterDisplay,
  intCounterCheckout: genIntCounterCheckout,
  intStools: genIntStools, intTableSet: genIntTableSet, intSofaCorner: genIntSofaCorner,
  intShelfBooks: genIntShelfBooks, intShelfWall: genIntShelfWall, intShelfGrocery: genIntShelfGrocery,
  intFridge: genIntFridge, intCoffeeMachine: genIntCoffeeMachine, intStove: genIntStove,
  intTv: genIntTv, intLampCeiling: genIntLampCeiling, intRug: genIntRug, intArtWall: genIntArtWall,
  intPlantCorner: genIntPlantCorner, intMirror: genIntMirror, intBarberChair: genIntBarberChair,
  intPhotoStudio: genIntPhotoStudio, intAnvil: genIntAnvil, intRecordStation: genIntRecordStation,
  intClockWall: genIntClockWall, intMystic: genIntMystic, intClothingRack: genIntClothingRack,
  intToyShelf: genIntToyShelf, intMenuBoard: genIntMenuBoard, intWindowTable: genIntWindowTable,
  intPet: genIntPet,
  intJukebox: genIntJukebox, intArcade: genIntArcade, intGumball: genIntGumball,
  intAquarium: genIntAquarium, intTeaTable: genIntTeaTable, intSushiCase: genIntSushiCase,
  intTrophy: genIntTrophy, intMannequin: genIntMannequin, intGrandfatherClock: genIntGrandfatherClock,
  intFireplace: genIntFireplace, intSafe: genIntSafe, intNeonInterior: genIntNeonInterior,
  intFittingRoom: genIntFittingRoom, intWaterCooler: genIntWaterCooler, intLadder: genIntLadder,
  intNapCorner: genIntNapCorner,
}

// ---------- 主装配 ----------
export function buildInterior(ctx) {
  const { fp, H } = ctx
  const g = group()
  const rand = makeRng(ctx.dna.seed + '#int')
  const inner = insetPolygon(fp.pts, ctx.t + 0.02)

  // 地板
  const floor = extrudeUp(inner, 0.08, ctx.materials.floorInt, { y: 0 })
  g.add(floor)

  // 面积质心不会被圆角轮廓的顶点密度拉偏。
  const cent = centroid(inner)
  const twiceArea = fp.pts.reduce((sum, p, i) => {
    const next = fp.pts[(i + 1) % fp.pts.length]
    return sum + p[0] * next[1] - next[0] * p[1]
  }, 0)
  const inwardSide = twiceArea >= 0 ? 1 : -1

  // 内墙包覆（四周薄墙 + 墙纸）
  const wpKind = rand.pick(['stripes', 'dots', 'diamond', 'plaid', 'grid', 'plain'])
  const wpTex = wallpaperTex(ctx, wpKind)
  const wpMat = new THREE.MeshStandardMaterial({ map: wpTex, roughness: 0.92 })
  const wpH = H - 0.12
  for (let i = 0; i < fp.pts.length; i++) {
    const p1 = fp.pts[i], p2 = fp.pts[(i + 1) % fp.pts.length]
    const mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
    if (len < 0.8) continue
    const theta = Math.atan2(p2[1] - p1[1], p2[0] - p1[0])
    const n = [-(p2[1] - p1[1]) / len * inwardSide, (p2[0] - p1[0]) / len * inwardSide]
    // 判断是否前边（有门的那边不包，留出入口）
    const isFront = Math.abs(mid[0] - fp.front.mid[0]) < 0.01 && Math.abs(mid[1] - fp.front.mid[1]) < 0.01
    if (isFront) continue
    const ry = Math.atan2(n[0], n[1])
    const w = mesh(new THREE.PlaneGeometry(len, wpH), wpMat, {
      // 墙体占据轮廓内侧，墙纸贴在内表面并略微前移，避免埋进墙里。
      p: [mid[0] + n[0] * (ctx.t + 0.015), wpH / 2 + 0.02, mid[1] + n[1] * (ctx.t + 0.015)],
      r: [0, ry, 0],
    })
    w.receiveShadow = true
    w.castShadow = false
    g.add(w)
  }

  // 天花板
  const ceil = extrudeUp(inner, 0.1, ctx.materials.wallInner, { y: H - 0.1 })
  ceil.castShadow = false
  g.add(ceil)

  // 吊灯（强制 1 盏，位置在质心）
  const lamp = genIntLampCeiling(ctx)
  lamp.obj.position.set(cent.x, 0, cent.z)
  g.add(lamp.obj)
  ctx.manifest.push('interior:lampCeiling')

  // 天花板槽位：枝形吊灯 / 吊扇（随机其二）
  const pickCeilingPoint = () => {
    for (let i = 0; i < 24; i++) {
      const x = rand.f(fp.bbox.minX + 0.8, fp.bbox.maxX - 0.8)
      const z = rand.f(fp.bbox.minZ + 0.8, fp.bbox.maxZ - 0.8)
      if (orientedBoxInPolygon(x, z, 0.7, 0.7, 0, inner, 0.08)) return { x, z }
    }
    return cent
  }
  const ceilRoll = rand.f(0, 1)
  if (ceilRoll < 0.3) {
    const ch = genIntChandelier(ctx)
    const p = pickCeilingPoint()
    ch.obj.position.set(p.x, H - 0.12, p.z)
    g.add(ch.obj)
    ctx.manifest.push('interior:intChandelier')
  } else if (ceilRoll < 0.55) {
    const fan = genIntCeilingFan(ctx)
    const p = pickCeilingPoint()
    fan.obj.position.set(p.x, H - 0.1, p.z)
    g.add(fan.obj)
    ctx.manifest.push('interior:intCeilingFan')
  }

  // 后墙边（柜台线）：找离前边最远的边
  const backEdges = []
  for (let i = 0; i < fp.pts.length; i++) {
    const p1 = fp.pts[i], p2 = fp.pts[(i + 1) % fp.pts.length]
    const mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
    if (len < 2) continue
    const isFront = Math.abs(mid[0] - fp.front.mid[0]) < 0.01 && Math.abs(mid[1] - fp.front.mid[1]) < 0.01
    if (isFront) continue
    const dist = -(fp.front.normal[0] * mid[0] + fp.front.normal[1] * mid[1])
    backEdges.push({ p1, p2, mid, len, dist, theta: Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) })
  }
  backEdges.sort((a, b) => b.dist - a.dist)

  // 业态布局
  const set = INTERIOR_SETS[ctx.dna.business.interior] || INTERIOR_SETS.cafe
  const placed = []
  const projectedSize = (w, d, rotation) => {
    const cos = Math.abs(Math.cos(rotation)), sin = Math.abs(Math.sin(rotation))
    return [w * cos + d * sin, w * sin + d * cos]
  }
  const canPlace = (x, z, w, d, rotation = 0) => {
    if (!orientedBoxInPolygon(x, z, w, d, rotation, inner, 0.06)) return false
    const [pw, pd] = projectedSize(w, d, rotation)
    for (const [cx, cz, cw, cd] of placed) {
      if (Math.abs(cx - x) < (cw + pw) / 2 + 0.25 && Math.abs(cz - z) < (cd + pd) / 2 + 0.25) return false
    }
    return true
  }
  const rememberPlacement = (x, z, w, d, rotation = 0) => {
    const [pw, pd] = projectedSize(w, d, rotation)
    placed.push([x, z, pw, pd])
  }

  // 1. 柜台沿后墙
  if (backEdges.length) {
    const counterGen = GEN_MAP[set.counter] || genIntCounterBar
    const hoverStart = ctx.hoverables.length, animateStart = ctx.animate.length
    const counter = counterGen(ctx)
    const [cw, cd] = counter.size || [2.5, 0.9]
    let counterPose = null
    for (const edge of backEdges) {
      const n = [-(edge.p2[1] - edge.p1[1]) / edge.len * inwardSide, (edge.p2[0] - edge.p1[0]) / edge.len * inwardSide]
      const rotation = -edge.theta
      const x = edge.mid[0] + n[0] * (ctx.t + cd / 2 + 0.12)
      const z = edge.mid[1] + n[1] * (ctx.t + cd / 2 + 0.12)
      if (canPlace(x, z, cw, cd, rotation)) {
        counterPose = { x, z, rotation }
        break
      }
    }
    if (counterPose) {
      counter.obj.position.set(counterPose.x, 0.08, counterPose.z)
      counter.obj.rotation.y = counterPose.rotation
      g.add(counter.obj)
      rememberPlacement(counterPose.x, counterPose.z, cw, cd, counterPose.rotation)
      ctx.manifest.push(`interior:${set.counter}`)
    } else {
      ctx.hoverables.length = hoverStart
      ctx.animate.length = animateStart
      disposeObject(counter.obj)
    }
  }

  // 2. 沿排布其余家具（在可用区域内撒点）
  const bbox = fp.bbox
  const items = set.along.filter(k => GEN_MAP[k])
  const maxItems = Math.min(items.length, 5)
  for (let i = 0; i < maxItems; i++) {
    const gen = GEN_MAP[items[i]]
    const hoverStart = ctx.hoverables.length, animateStart = ctx.animate.length
    const obj = gen(ctx)
    const size = obj.size || [1.5, 1.5]
    let ok = false, rotation = 0, x = 0, z = 0
    for (let tryN = 0; tryN < 14 && !ok; tryN++) {
      if (obj.wall && backEdges.length) {
        const edge = rand.pick(backEdges)
        const usable = edge.len - size[0] - 0.5
        if (usable <= 0) continue
        const along = rand.f(-usable / 2, usable / 2)
        const dir = [(edge.p2[0] - edge.p1[0]) / edge.len, (edge.p2[1] - edge.p1[1]) / edge.len]
        const inward = [-dir[1] * inwardSide, dir[0] * inwardSide]
        x = edge.mid[0] + dir[0] * along + inward[0] * (ctx.t + size[1] / 2 + 0.12)
        z = edge.mid[1] + dir[1] * along + inward[1] * (ctx.t + size[1] / 2 + 0.12)
        rotation = -edge.theta
      } else {
        x = rand.f(bbox.minX + 1.1, bbox.maxX - 1.1)
        z = rand.f(bbox.minZ + 1.1, bbox.maxZ - 1.1)
        rotation = rand.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]) + rand.f(-0.1, 0.1)
      }
      if (!canPlace(x, z, size[0], size[1], rotation)) continue
      obj.obj.position.set(x, 0.08 + (obj.elevation || 0), z)
      obj.obj.rotation.y = rotation
      ok = true
    }
    if (ok) {
      g.add(obj.obj)
      rememberPlacement(x, z, size[0], size[1], rotation)
      ctx.manifest.push(`interior:${items[i]}`)
    } else {
      ctx.hoverables.length = hoverStart
      ctx.animate.length = animateStart
      disposeObject(obj.obj)
    }
  }

  // 3. 宠物概率
  const petChance = set.pet ?? 0.25
  if (ctx.dna.business.npc || rand.chance(petChance)) {
    for (let tryN = 0; tryN < 10; tryN++) {
      const x = rand.f(bbox.minX + 1, bbox.maxX - 1)
      const z = rand.f(bbox.minZ + 1, bbox.maxZ - 1)
      if (!canPlace(x, z, 0.9, 0.9)) continue
      const pet = genIntPet(ctx)
      pet.obj.position.set(x, 0.08, z)
      pet.obj.rotation.y = rand.f(0, Math.PI * 2)
      g.add(pet.obj)
      rememberPlacement(x, z, 0.9, 0.9)
      ctx.manifest.push('interior:intPet')
      break
    }
  }

  return { obj: g }
}
