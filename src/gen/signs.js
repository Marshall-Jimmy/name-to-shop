// 招牌生成器：主招牌（强制构件）+ 副招牌 + 彩蛋招牌。
// 任何路径都保证输出至少一块发光名牌（名字 = 用户输入字符串）。
import * as THREE from 'three/webgpu'
import { reg } from './registry.js'
import { box, mesh, group, canvasTexture, cyl, torus, sphere, plane, hsl, col, stdMat, glowMat } from './helpers.js'
import { drawSignFace, drawSignVertical, neonText, fitFont } from './facade.js'

const FONT_STACK = '"PingFang SC","Microsoft YaHei","Noto Sans SC","Segoe UI Emoji",sans-serif'

function faceTex(ctx3d, key, w, h, kind, opts = {}) {
  return canvasTexture(key, w, h, (c, cw, ch) => {
    drawSignFace(c, cw, ch, ctx3d.dna, ctx3d.rand, { kind, ...opts })
  })
}

function eggOverlay(kind) {
  return {
    cat: '🐈', bearPaw: '🐾', bone: '🦴', panda: '🐼', dragonNeon: '🐉',
    foxMask: '🦊', snakeCoil: '🐍', flameNeon: '🔥', lightning: '⚡', smiley: '😄',
    broken404: '🚫', meaning42: '🌌', question: '❓', flameGlasses: '😎', heartSign: '💖',
    star: '⭐', money: '💰', fish: '🐟', coffee: '☕', burger: '🍔', book: '📖',
  }[kind] || null
}

// 招牌板通用：盒子 + 发光面 + 侧边。返回 {obj, faceMat}
function signBoard(ctx3d, key, W, H, D, kind, opts = {}) {
  const tex = faceTex(ctx3d, key, 1024, Math.max(160, Math.round(1024 * H / W)), kind, opts)
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  const glowI = opts.glowI ?? (['neonTube', 'ledMatrix', 'holo'].includes(kind) ? 2.2 : 1.15)
  const faceMat = new THREE.MeshStandardMaterial({
    map: tex, emissive: 0xffffff, emissiveMap: tex,
    emissiveIntensity: glowI + Math.min(ctx3d.dna.rarityMeta.glow, 1.4) * 0.28,
    roughness: 0.45, metalness: 0.1,
  })
  const sideMat = stdMat({ color: col(ctx3d.dna.palette.main, null, 0, 0, -26), roughness: 0.5, metalness: 0.3 })
  const geo = new THREE.BoxGeometry(W, H, D)
  const m = new THREE.Mesh(geo, [sideMat, sideMat, sideMat, sideMat, faceMat, sideMat])
  m.castShadow = true
  const g = group(m)
  // 背面铭刻（业态英文名）
  const backTex = canvasTexture(`${key}-back`, 512, 128, (c, w, h) => {
    c.fillStyle = hsl(...ctx3d.dna.palette.main.map(v => v))
    c.fillRect(0, 0, w, h)
    c.font = `800 52px ${FONT_STACK}`
    c.fillStyle = '#ffffff'
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillText(ctx3d.dna.business.en, w / 2, h / 2)
  })
  const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.6 })
  const back = plane(W, H, backMat, { p: [0, 0, -D / 2 - 0.01], r: [0, Math.PI, 0], cast: false })
  g.add(back)
  return { obj: g, faceMat }
}

// 金属吊架
function brackets(ctx3d, W, y, out) {
  const g = group()
  const mat = ctx3d.materials.trim
  for (const x of [-W / 2 + 0.3, W / 2 - 0.3]) {
    g.add(cyl(0.035, 0.035, 0.5, mat, { p: [x, y + 0.28, out - 0.18], r: [0.9, 0, 0] }))
    g.add(cyl(0.035, 0.035, 0.34, mat, { p: [x, y + 0.1, out - 0.35], r: [Math.PI / 2.4, 0, 0] }))
  }
  return g
}

// ============ 主招牌风格（挂前墙招牌带）============

export const genSignBox = reg('sign', 'signBox', (ctx) => {
  const { fp, layout, rand } = ctx
  const W = fp.front.L * rand.f(0.72, 0.9)
  const H = layout.signBand.h * 0.95
  const { obj, faceMat } = signBoard(ctx, `sign-${ctx.dna.seed}`, W, H, 0.22, 'box')
  const out = 0.42
  obj.position.set(fp.front.mid[0], layout.signBand.y + layout.signBand.h / 2, fp.front.mid[1] + fp.front.normal[1] * out)
  obj.rotation.y = -fp.front.theta
  const g = group(obj, brackets(ctx, W, layout.signBand.y + layout.signBand.h / 2, out))
  // 底缘灯带
  const strip = box(W * 0.9, 0.07, 0.07, ctx.materials.glow, { p: [0, -H / 2 - 0.08, 0.1] })
  g.add(strip)
  return { obj: g, meshes: [obj, strip], flicker: [{ mat: faceMat, base: faceMat.emissiveIntensity }] }
})

export const genSignNeonTube = reg('sign', 'signNeonTube', (ctx) => {
  const { fp, layout, rand } = ctx
  const W = fp.front.L * rand.f(0.68, 0.86)
  const H = layout.signBand.h * 0.92
  const { obj, faceMat } = signBoard(ctx, `sign-${ctx.dna.seed}`, W, H, 0.18, 'neonTube')
  const out = 0.4
  obj.position.set(fp.front.mid[0], layout.signBand.y + layout.signBand.h / 2, fp.front.mid[1] + fp.front.normal[1] * out)
  obj.rotation.y = -fp.front.theta
  const g = group(obj, brackets(ctx, W, layout.signBand.y + layout.signBand.h / 2, out))
  // 霓虹管外框（真 3D 管）
  const tube = glowMat(col(ctx.dna.palette.glow), 2.6, 0x0a0a12)
  g.add(box(W + 0.22, 0.05, 0.05, tube, { p: [0, H / 2 + 0.1, 0.02], cast: false }))
  g.add(box(W + 0.22, 0.05, 0.05, tube, { p: [0, -H / 2 - 0.1, 0.02], cast: false }))
  return { obj: g, meshes: [obj], flicker: [{ mat: faceMat, base: faceMat.emissiveIntensity, neon: true }] }
})

export const genSignLedMatrix = reg('sign', 'signLedMatrix', (ctx) => {
  const { fp, layout, rand } = ctx
  const W = fp.front.L * rand.f(0.7, 0.88)
  const H = layout.signBand.h * 0.95
  const { obj, faceMat } = signBoard(ctx, `sign-${ctx.dna.seed}`, W, H, 0.2, 'ledMatrix')
  const out = 0.4
  obj.position.set(fp.front.mid[0], layout.signBand.y + layout.signBand.h / 2, fp.front.mid[1] + fp.front.normal[1] * out)
  obj.rotation.y = -fp.front.theta
  const g = group(obj)
  // LED 像素点阵（发光小方块）
  const dotMat = glowMat(col(ctx.dna.palette.accent), 2.0)
  const n = Math.floor(W / 0.5)
  for (let i = 0; i < n; i++) {
    g.add(box(0.1, 0.1, 0.06, dotMat, { p: [-W / 2 + 0.25 + i * 0.5, -H / 2 - 0.14, 0.08], cast: false }))
  }
  return { obj: g, meshes: [obj], flicker: [{ mat: faceMat, base: faceMat.emissiveIntensity, neon: true }] }
})

export const genSignHolo = reg('sign', 'signHolo', (ctx) => {
  const { fp, layout, rand } = ctx
  const W = fp.front.L * rand.f(0.66, 0.84)
  const H = layout.signBand.h * 0.9
  const { obj, faceMat } = signBoard(ctx, `sign-${ctx.dna.seed}`, W, H, 0.12, 'holo')
  const out = 0.55
  obj.position.set(fp.front.mid[0], layout.signBand.y + layout.signBand.h / 2, fp.front.mid[1] + fp.front.normal[1] * out)
  obj.rotation.y = -fp.front.theta
  const g = group(obj, brackets(ctx, W, layout.signBand.y + layout.signBand.h / 2, out))
  // 全息悬浮上下扫描线
  const scanMat = glowMat(col(ctx.dna.palette.glow), 1.6)
  scanMat.transparent = true; scanMat.opacity = 0.65
  const scan = box(W * 1.04, 0.05, 0.04, scanMat, { p: [0, 0, 0.1], cast: false })
  g.add(scan)
  ctx.animate.push({
    t: rand.f(0, 6), update(dt) { this.t += dt; scan.position.y = Math.sin(this.t * 1.4) * H * 0.48 }
  })
  return { obj: g, meshes: [obj], flicker: [{ mat: faceMat, base: faceMat.emissiveIntensity, neon: true }] }
})

export const genSignMarquee = reg('sign', 'signMarquee', (ctx) => {
  const { fp, layout, rand } = ctx
  const W = fp.front.L * rand.f(0.74, 0.92)
  const H = layout.signBand.h * 0.98
  const { obj, faceMat } = signBoard(ctx, `sign-${ctx.dna.seed}`, W, H, 0.3, 'marquee')
  const out = 0.5
  obj.position.set(fp.front.mid[0], layout.signBand.y + layout.signBand.h / 2, fp.front.mid[1] + fp.front.normal[1] * out)
  obj.rotation.y = -fp.front.theta
  const g = group(obj, brackets(ctx, W, layout.signBand.y + layout.signBand.h / 2, out))
  // 跑马灯泡（真 3D 灯泡，交替闪烁）
  const bulbs = []
  const n = Math.floor(W / 0.42)
  for (let i = 0; i < n; i++) {
    const bm = glowMat(col(ctx.dna.palette.glow), 2.4)
    const b = sphere(0.06, bm, { p: [-W / 2 + 0.2 + i * 0.42, H / 2 + 0.12, 0.05], cast: false })
    bulbs.push({ m: bm, i })
    g.add(b)
  }
  ctx.animate.push({
    t: 0, update(dt) {
      this.t += dt
      for (const b of bulbs) b.m.emissiveIntensity = 1.2 + 1.4 * (Math.floor(this.t * 6 + b.i) % 2)
    }
  })
  return { obj: g, meshes: [obj], flicker: [] }
})

export const genSignChalkboard = reg('sign', 'signChalkboard', (ctx) => {
  const { fp, layout, rand } = ctx
  const W = fp.front.L * rand.f(0.6, 0.78)
  const H = layout.signBand.h * 0.9
  const { obj, faceMat } = signBoard(ctx, `sign-${ctx.dna.seed}`, W, H, 0.1, 'chalkboard')
  const out = 0.36
  obj.position.set(fp.front.mid[0], layout.signBand.y + layout.signBand.h / 2, fp.front.mid[1] + fp.front.normal[1] * out)
  obj.rotation.y = -fp.front.theta
  const g = group(obj, brackets(ctx, W, layout.signBand.y + layout.signBand.h / 2, out))
  return { obj: g, meshes: [obj], flicker: [{ mat: faceMat, base: 0.5 }] }
})

export const genSignRound = reg('sign', 'signRound', (ctx) => {
  const { fp, layout, rand } = ctx
  const R = layout.signBand.h * 0.62
  const pal = ctx.dna.palette
  const tex = canvasTexture(`sign-${ctx.dna.seed}`, 512, 512, (c, w, h) => {
    const grad = c.createRadialGradient(w / 2, h / 2, R * 0.2, w / 2, h / 2, w / 2)
    grad.addColorStop(0, hsl(...pal.main.map(v => v)))
    grad.addColorStop(1, hsl(...pal.main.map((v, i) => i === 2 ? v - 22 : v)))
    c.fillStyle = grad
    c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2); c.fill()
    c.strokeStyle = hsl(...pal.trim); c.lineWidth = 12
    c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 14, 0, Math.PI * 2); c.stroke()
    const name = ctx.dna.name
    const size = fitFont(c, name, w * 0.6, 96)
    c.font = `900 ${size}px ${FONT_STACK}`
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.lineWidth = 8; c.strokeStyle = hsl(...pal.main.map((v, i) => i === 2 ? v - 38 : v))
    c.strokeText(name, w / 2, h * 0.42)
    c.fillStyle = '#fffdf4'
    c.fillText(name, w / 2, h * 0.42)
    c.font = `700 34px ${FONT_STACK}`
    c.fillStyle = hsl(...pal.accent.map((v, i) => i === 2 ? v + 18 : v))
    c.fillText(ctx.dna.business.icon + ' ' + ctx.dna.subtitle, w / 2, h * 0.68)
  })
  const faceMat = new THREE.MeshStandardMaterial({
    map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.9, roughness: 0.5,
  })
  const disc = mesh(new THREE.CylinderGeometry(R, R, 0.12, 28), [
    ctx.materials.trim, ctx.materials.trim, faceMat, ctx.materials.trim, ctx.materials.trim, ctx.materials.trim,
  ], { r: [Math.PI / 2, 0, 0] })
  const out = 0.5
  const y = layout.signBand.y + layout.signBand.h / 2
  disc.position.set(fp.front.mid[0], y, fp.front.mid[1] + fp.front.normal[1] * out)
  disc.rotation.z = -fp.front.theta
  const g = group(disc, brackets(ctx, R * 2, y, out))
  return { obj: g, meshes: [disc], flicker: [{ mat: faceMat, base: 0.9 }] }
})

export const genSignVertical = reg('sign', 'signVertical', (ctx) => {
  const { fp, layout, rand } = ctx
  const H = rand.f(2.6, 3.6)
  const W = Math.min(1.15, layout.signBand.h * 0.9)
  const tex = canvasTexture(`signv-${ctx.dna.seed}`, 256, 768, (c, w, h) => drawSignVertical(c, w, h, ctx.dna, ctx.rand))
  const faceMat = new THREE.MeshStandardMaterial({
    map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.3 + ctx.dna.rarityMeta.glow * 0.3, roughness: 0.5,
  })
  const sideMat = stdMat({ color: col(ctx.dna.palette.main, null, 0, 0, -24) })
  const board = mesh(new THREE.BoxGeometry(W, H, 0.14), [sideMat, sideMat, sideMat, sideMat, faceMat, sideMat])
  const out = 0.4
  const x = fp.front.mid[0] + fp.front.L / 2 * Math.cos(fp.front.theta) * (rand.chance(0.5) ? 1 : -1) - fp.front.normal[0] * 0.1
  const z = fp.front.mid[1] + fp.front.L / 2 * Math.sin(fp.front.theta) * (x > fp.front.mid[0] ? 1 : -1) + fp.front.normal[1] * out
  board.position.set(x, layout.H - H / 2 - 0.4, fp.front.mid[1] + fp.front.normal[1] * out)
  board.rotation.y = -fp.front.theta
  // 吊杆
  const rod = cyl(0.03, 0.03, 0.5, ctx.materials.trim, { p: [x, layout.H - 0.2, fp.front.mid[1] + fp.front.normal[1] * (out - 0.15)] })
  const g = group(board, rod)
  // 微微摇摆
  ctx.animate.push({
    t: rand.f(0, 6), update(dt) { this.t += dt; board.rotation.z = Math.sin(this.t * 0.8) * 0.02 }
  })
  return { obj: g, meshes: [board], flicker: [{ mat: faceMat, base: faceMat.emissiveIntensity }] }
})

export const genSignHanging = reg('sign', 'signHanging', (ctx) => {
  const { fp, layout, rand } = ctx
  const W = rand.f(1.6, 2.2), H = rand.f(0.9, 1.3)
  const { obj, faceMat } = signBoard(ctx, `signh-${ctx.dna.seed}`, W, H, 0.14, rand.pick(['box', 'chalkboard']))
  const out = 0.75
  const y = layout.H - 0.5
  obj.position.set(fp.front.mid[0] - fp.front.L * 0.28 * Math.cos(fp.front.theta), y - H / 2, fp.front.mid[1] + fp.front.normal[1] * out)
  obj.rotation.y = -fp.front.theta + Math.PI / 2
  const g = group(obj)
  for (const dx of [-W / 2 + 0.15, W / 2 - 0.15]) {
    g.add(cyl(0.02, 0.02, 0.6, ctx.materials.trim, { p: [obj.position.x + dx, y + H / 2 + 0.3, obj.position.z] }))
  }
  ctx.animate.push({
    t: rand.f(0, 6), update(dt) { this.t += dt; obj.rotation.z = Math.sin(this.t) * 0.035 }
  })
  return { obj: g, meshes: [obj], flicker: [{ mat: faceMat, base: faceMat.emissiveIntensity }] }
})

export const genSignBlade = reg('sign', 'signBlade', (ctx) => {
  const { fp, layout, rand } = ctx
  const W = 0.7, H = rand.f(1.8, 2.4)
  const { obj, faceMat } = signBoard(ctx, `signb-${ctx.dna.seed}`, W, H, 0.12, 'neonTube')
  const out = 0.85
  obj.position.set(fp.front.mid[0] + fp.front.L * 0.3 * Math.cos(fp.front.theta), layout.H - 0.8, fp.front.mid[1] + fp.front.normal[1] * out)
  obj.rotation.y = -fp.front.theta + Math.PI / 2
  const g = group(obj)
  g.add(cyl(0.03, 0.03, 1.0, ctx.materials.trim, { p: [obj.position.x, layout.H - 0.25, obj.position.z - out * 0.4] }))
  return { obj: g, meshes: [obj], flicker: [{ mat: faceMat, base: faceMat.emissiveIntensity, neon: true }] }
})

export const genSignBanner = reg('sign', 'signBanner', (ctx) => {
  const { fp, layout, rand } = ctx
  const W = fp.front.L * rand.f(0.8, 0.95), H = rand.f(1.3, 1.8)
  const pal = ctx.dna.palette
  const tex = canvasTexture(`signbn-${ctx.dna.seed}`, 768, 384, (c, w, h) => {
    const grad = c.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, hsl(...pal.accent.map((v, i) => i === 2 ? v + 10 : v)))
    grad.addColorStop(1, hsl(...pal.accent.map((v, i) => i === 2 ? v - 12 : v)))
    c.fillStyle = grad
    c.fillRect(0, 0, w, h)
    c.strokeStyle = hsl(...pal.trim); c.lineWidth = 8
    c.strokeRect(8, 8, w - 16, h - 16)
    const size = fitFont(c, ctx.dna.name, w * 0.8, 110)
    c.font = `900 ${size}px ${FONT_STACK}`
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillStyle = '#fffef8'
    c.fillText(ctx.dna.name, w / 2, h * 0.4)
    c.font = `700 36px ${FONT_STACK}`
    c.fillStyle = hsl(...pal.main.map((v, i) => i === 2 ? Math.min(95, v + 30) : v))
    c.fillText(ctx.dna.neonSub || ctx.dna.subtitle, w / 2, h * 0.74)
  })
  const faceMat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.7, roughness: 0.8, side: THREE.DoubleSide })
  const geo = new THREE.PlaneGeometry(W, H, 16, 4)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, Math.sin(pos.getX(i) * 4) * 0.05)
  }
  geo.computeVertexNormals()
  const banner = mesh(geo, faceMat, { cast: false })
  const out = 0.35
  banner.position.set(fp.front.mid[0], layout.H - H / 2 - 0.3, fp.front.mid[1] + fp.front.normal[1] * out)
  banner.rotation.y = -fp.front.theta
  const g = group(banner)
  ctx.animate.push({
    t: rand.f(0, 6), update(dt) {
      this.t += dt
      const p = banner.geometry.attributes.position
      for (let i = 0; i < p.count; i++) {
        p.setZ(i, Math.sin(pos.getX(i) * 4 + this.t * 2.2) * 0.06)
      }
      p.needsUpdate = true
    }
  })
  return { obj: g, meshes: [banner], flicker: [{ mat: faceMat, base: 0.7 }] }
})

export const genSignGold = reg('sign', 'signGold', (ctx) => {
  const { fp, layout, rand } = ctx
  const W = fp.front.L * rand.f(0.6, 0.78)
  const H = layout.signBand.h * 0.88
  const tex = faceTex(ctx, `sign-${ctx.dna.seed}`, 1024, Math.round(1024 * H / W), 'box')
  const faceMat = new THREE.MeshStandardMaterial({
    map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.8,
    color: 0xffe9b0, metalness: 0.9, roughness: 0.22,
  })
  const sideMat = stdMat({ color: 0xc9a13b, metalness: 0.95, roughness: 0.25 })
  const board = mesh(new THREE.BoxGeometry(W, H, 0.2), [sideMat, sideMat, sideMat, sideMat, faceMat, sideMat])
  const out = 0.45
  board.position.set(fp.front.mid[0], layout.signBand.y + layout.signBand.h / 2, fp.front.mid[1] + fp.front.normal[1] * out)
  board.rotation.y = -fp.front.theta
  const g = group(board, brackets(ctx, W, layout.signBand.y + layout.signBand.h / 2, out))
  g.add(box(W + 0.3, 0.14, 0.3, sideMat, { p: [0, H / 2 + 0.1, 0] }))
  g.add(box(W + 0.3, 0.14, 0.3, sideMat, { p: [0, -H / 2 - 0.1, 0] }))
  return { obj: g, meshes: [board], flicker: [{ mat: faceMat, base: 0.8 }] }
})

export const genSignLantern = reg('sign', 'signLantern', (ctx) => {
  const { fp, layout, rand } = ctx
  const g = group()
  const pal = ctx.dna.palette
  const chars = [...ctx.dna.name].slice(0, 8)
  const n = chars.length
  const lanternR = Math.min(0.42, layout.signBand.h * 0.3)
  const spacing = Math.min(1.2, fp.front.L * 0.8 / n)
  const startX = fp.front.mid[0] - (n - 1) * spacing / 2 * Math.cos(fp.front.theta)
  const lanternMat = glowMat(col(pal.glow), 1.9, col(pal.accent).getHex())
  const meshes = []
  for (let i = 0; i < n; i++) {
    const x = fp.front.mid[0] - (n - 1) * spacing / 2 * Math.cos(fp.front.theta) + i * spacing * Math.cos(fp.front.theta)
    const z = fp.front.mid[1] + fp.front.normal[1] * 0.55 + i * spacing * Math.sin(fp.front.theta)
    const y = layout.signBand.y + layout.signBand.h / 2 + Math.sin(i * 1.3) * 0.1
    const body = mesh(new THREE.SphereGeometry(lanternR, 16, 12), lanternMat.clone(), { p: [x, y, z], s: [1, 1.15, 1] })
    // 灯笼上的字
    const chTex = canvasTexture(`lantern-${ctx.dna.seed}-${i}`, 128, 128, (c, w, h) => {
      c.fillStyle = 'rgba(0,0,0,0)'
      c.clearRect(0, 0, w, h)
      c.font = `900 84px ${FONT_STACK}`
      c.textAlign = 'center'; c.textBaseline = 'middle'
      c.fillStyle = '#fff8e8'
      c.fillText(chars[i], w / 2, h / 2)
    })
    const chMat = new THREE.MeshStandardMaterial({ map: chTex, transparent: true, emissive: 0xffefc0, emissiveMap: chTex, emissiveIntensity: 1.4 })
    const chPlane = plane(lanternR * 1.15, lanternR * 1.15, chMat, { p: [x, y, z + lanternR * 0.98], cast: false })
    chPlane.rotation.y = -fp.front.theta
    const capMat = ctx.materials.trim
    g.add(body, chPlane)
    g.add(cyl(lanternR * 0.5, lanternR * 0.5, 0.08, capMat, { p: [x, y + lanternR * 1.15, z] }))
    g.add(cyl(lanternR * 0.5, lanternR * 0.5, 0.08, capMat, { p: [x, y - lanternR * 1.15, z] }))
    g.add(cyl(0.015, 0.015, 0.4, capMat, { p: [x, y + lanternR * 1.35, z] }))
    meshes.push(body, chPlane)
  }
  return { obj: g, meshes, flicker: [{ mat: lanternMat, base: 1.9 }] }
})

// ============ 彩蛋招牌 ============

function eggSignGen(kind, baseKind) {
  return reg('sign', `signEgg_${kind}`, (ctx) => {
    const base = SIGN_GENS[baseKind](ctx)
    const pal = ctx.dna.palette
    // 彩蛋徽章（大号 emoji 悬浮牌）
    const icon = eggOverlay(kind)
    if (!icon) return base
    const tex = canvasTexture(`eggsign-${ctx.dna.seed}-${kind}`, 256, 256, (c, w, h) => {
      c.clearRect(0, 0, w, h)
      c.font = `180px ${FONT_STACK}`
      c.textAlign = 'center'; c.textBaseline = 'middle'
      c.shadowColor = hsl(...pal.glow); c.shadowBlur = 30
      c.fillText(icon, w / 2, h / 2 + 10)
    })
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.6 })
    const badge = plane(1.1, 1.1, mat, { p: [0, 0, 0.3], cast: false })
    badge.position.set(
      ctx.fp.front.mid[0] - ctx.fp.front.L / 2 * Math.cos(ctx.fp.front.theta) * 0.72,
      ctx.layout.signBand.y + ctx.layout.signBand.h / 2,
      ctx.fp.front.mid[1] + ctx.fp.front.normal[1] * 0.6
    )
    badge.rotation.y = -ctx.fp.front.theta
    ctx.animate.push({
      t: 0, update(dt) { this.t += dt; badge.rotation.z = Math.sin(this.t * 1.6) * 0.12 }
    })
    base.obj.add(badge)
    base.meshes.push(badge)
    return base
  })
}

export const genSignEggCat = eggSignGen('cat', 'box')
export const genSignEggBearPaw = eggSignGen('bearPaw', 'round')
export const genSignEggBone = eggSignGen('bone', 'box')
export const genSignEggPanda = eggSignGen('panda', 'box')
export const genSignEggDragon = eggSignGen('dragonNeon', 'neonTube')
export const genSignEggFox = eggSignGen('foxMask', 'hanging')
export const genSignEggSnake = eggSignGen('snakeCoil', 'neonTube')
export const genSignEggFlame = eggSignGen('flameNeon', 'neonTube')
export const genSignEggLightning = eggSignGen('lightning', 'blade')
export const genSignEggSmiley = eggSignGen('smiley', 'marquee')
export const genSignEgg404 = eggSignGen('broken404', 'box')
export const genSignEgg42 = eggSignGen('meaning42', 'neonTube')
export const genSignEggQuestion = eggSignGen('question', 'neonTube')
export const genSignEggGlasses = eggSignGen('flameGlasses', 'gold')

const SIGN_GENS = {
  box: genSignBox, neonTube: genSignNeonTube, ledMatrix: genSignLedMatrix, holo: genSignHolo,
  marquee: genSignMarquee, chalkboard: genSignChalkboard, round: genSignRound,
  vertical: genSignVertical, hanging: genSignHanging, blade: genSignBlade,
  banner: genSignBanner, gold: genSignGold, lantern: genSignLantern,
  cat: genSignEggCat, bearPaw: genSignEggBearPaw, bone: genSignEggBone, panda: genSignEggPanda,
  dragonNeon: genSignEggDragon, foxMask: genSignEggFox, snakeCoil: genSignEggSnake,
  flameNeon: genSignEggFlame, lightning: genSignEggLightning, smiley: genSignEggSmiley,
  broken404: genSignEgg404, meaning42: genSignEgg42, question: genSignEggQuestion,
  flameGlasses: genSignEggGlasses,
}

// 404 破损招牌：倾斜 + 裂纹
export const genSignBroken404 = reg('sign', 'signBroken404Full', (ctx) => {
  const r = SIGN_GENS.box(ctx)
  r.obj.rotation.z = 0.1
  const crack = canvasTexture(`crack-${ctx.dna.seed}`, 256, 256, (c, w, h) => {
    c.strokeStyle = 'rgba(20,20,20,0.9)'
    c.lineWidth = 6
    c.beginPath()
    c.moveTo(w * 0.3, 0)
    for (let i = 0; i < 6; i++) {
      c.lineTo(w * (0.3 + (i % 2) * 0.3 + Math.sin(i * 2.7) * 0.1), h * (i + 1) / 7)
    }
    c.stroke()
  })
  const crackMat = new THREE.MeshStandardMaterial({ map: crack, transparent: true, roughness: 0.9 })
  r.obj.add(plane(1.2, 1.2, crackMat, { p: [0, 0, 0.12], cast: false }))
  return r
})

// ============ 副招牌 / 招牌配件 ============

export const genSignNeonSubtitle = reg('sign', 'signNeonSubtitle', (ctx) => {
  const { fp, layout, rand } = ctx
  const pal = ctx.dna.palette
  const text = ctx.dna.neonSub || ctx.dna.subtitle
  const W = fp.front.L * 0.55, H = 0.42
  const tex = canvasTexture(`neonsub-${ctx.dna.seed}`, 1024, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h)
    neonText(c, text, w / 2, h / 2, hsl(...pal.glow), 62)
  })
  const mat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, emissive: 0xffffff, emissiveMap: tex,
    emissiveIntensity: 2.4 + ctx.dna.rarityMeta.glow, side: THREE.DoubleSide,
  })
  const strip = plane(W, H, mat, { cast: false })
  strip.position.set(fp.front.mid[0], layout.signBand.y - 0.35, fp.front.mid[1] + fp.front.normal[1] * 0.5)
  strip.rotation.y = -fp.front.theta
  const g = group(strip)
  ctx.animate.push({
    t: rand.f(0, 9), update(dt) { this.t += dt; mat.emissiveIntensity = (2.2 + ctx.dna.rarityMeta.glow) * (0.92 + 0.08 * Math.sin(this.t * 13)) }
  })
  return { obj: g, meshes: [strip], flicker: [{ mat, base: 2.4, neon: true }] }
})

export const genSignAwningStrip = reg('sign', 'signAwningStrip', (ctx) => {
  const { fp, layout, rand } = ctx
  const g = group()
  const stripMat = glowMat(col(ctx.dna.palette.accent), 1.7)
  const W = fp.front.L * 0.86
  const y = layout.windows[0] ? layout.windows[0].y + layout.windows[0].h + 0.55 : 3.2
  const strip = box(W, 0.06, 0.06, stripMat, { p: [fp.front.mid[0], y, fp.front.mid[1] + fp.front.normal[1] * 0.4] })
  strip.rotation.y = -fp.front.theta
  g.add(strip)
  // 小垂灯
  const n = Math.floor(W / 0.8)
  for (let i = 0; i < n; i++) {
    const x = fp.front.mid[0] - W / 2 * Math.cos(fp.front.theta) + (i + 0.5) * W / n * Math.cos(fp.front.theta)
    const z = fp.front.mid[1] + (i + 0.5) * W / n * Math.sin(fp.front.theta) + fp.front.normal[1] * 0.4
    g.add(sphere(0.05, glowMat(col(ctx.dna.palette.glow), 2.2), { p: [x, y - 0.14, z], cast: false }))
  }
  return { obj: g, meshes: [strip], flicker: [] }
})

export const genSignDoorPlate = reg('sign', 'signDoorPlate', (ctx) => {
  const { fp, layout, dna } = ctx
  const pal = dna.palette
  const W = 0.85, H = 0.32
  const tex = canvasTexture(`doorplate-${dna.seed}`, 512, 192, (c, w, h) => {
    c.fillStyle = hsl(...pal.trim.map((v, i) => i === 2 ? Math.min(92, v + 16) : v))
    roundRectFill(c, w, h)
    c.font = `800 60px ${FONT_STACK}`
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillStyle = '#1c1710'
    c.fillText(`NO.${hashDigits(dna.name)}`, w / 2, h * 0.36)
    c.font = `600 34px ${FONT_STACK}`
    c.fillText(dna.constellation.name, w / 2, h * 0.7)
  })
  const mat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.6, roughness: 0.35 })
  const plate = plane(W, H, mat, { cast: false })
  const dx = layout.door.x + layout.door.w / 2 + 0.55 - layout.L / 2
  plate.position.set(
    fp.front.mid[0] + dx * Math.cos(fp.front.theta),
    1.7,
    fp.front.mid[1] + dx * Math.sin(fp.front.theta) + fp.front.normal[1] * 0.02
  )
  plate.rotation.y = -fp.front.theta
  return { obj: group(plate), meshes: [plate], flicker: [] }
})

function roundRectFill(c, w, h) {
  c.beginPath()
  c.roundRect(6, 6, w - 12, h - 12, 14)
  c.fill()
}

function hashDigits(str) {
  let h = 7
  for (const ch of str) h = (h * 31 + ch.codePointAt(0)) % 100000
  return String(h % 1000).padStart(3, '0')
}

// ============ 总装 ============

export function createSigns(ctx) {
  let main = null
  const meshes = []
  const flicker = []
  try {
    const style = ctx.dna.signStyle
    const gen = SIGN_GENS[style] || SIGN_GENS.box
    main = gen(ctx)
  } catch (e) {
    console.error('[signs] main failed:', e)
  }
  if (!main || !main.meshes.length) {
    // 双保险：极简发光名牌（永不失败）
    try { main = genSignBox(ctx) } catch (e2) {
      const emergency = box(3, 1, 0.2, glowMat(col(ctx.dna.palette.glow), 2.0))
      emergency.position.set(ctx.fp.front.mid[0], ctx.layout.H - 0.9, ctx.fp.front.mid[1] + ctx.fp.front.normal[1] * 0.5)
      main = { obj: group(emergency), meshes: [emergency], flicker: [] }
    }
  }
  main.meshes.forEach(m => meshes.push(m))
  if (main.flicker) flicker.push(...main.flicker)

  const rand = ctx.rand
  // 副招牌 1：霓虹副标语（60% 或彩蛋必出）
  if (rand.chance(0.6) || ctx.dna.eggEffects.subtitle) {
    try {
      const sub = genSignNeonSubtitle(ctx)
      main.obj.add(sub.obj)
      sub.meshes.forEach(m => meshes.push(m)); flicker.push(...sub.flicker)
      ctx.push('sign', 'neonSubtitle')
    } catch (e) { console.error('[signs] subtitle failed:', e) }
  }
  // 副招牌 2：门牌
  if (rand.chance(0.75)) {
    try {
      const plate = genSignDoorPlate(ctx)
      main.obj.add(plate.obj)
      plate.meshes.forEach(m => meshes.push(m))
      ctx.push('sign', 'doorPlate')
    } catch (e) { console.error('[signs] plate failed:', e) }
  }
  // 副招牌 3：遮阳篷灯带
  if (rand.chance(0.5)) {
    try {
      const strip = genSignAwningStrip(ctx)
      main.obj.add(strip.obj)
      strip.meshes.forEach(m => meshes.push(m))
      ctx.push('sign', 'awningStrip')
    } catch (e) { console.error('[signs] strip failed:', e) }
  }
  // 副招牌 4：非 vertical 主招牌时 30% 加竖招牌
  if (!['vertical', 'lantern'].includes(ctx.dna.signStyle) && rand.chance(0.3)) {
    try {
      const v = genSignVertical(ctx)
      main.obj.add(v.obj)
      v.meshes.forEach(m => meshes.push(m)); flicker.push(...v.flicker)
      ctx.push('sign', 'verticalSecondary')
    } catch (e) { console.error('[signs] vertical failed:', e) }
  }
  // 霓虹闪烁动画
  ctx.animate.push({
    t: rand.f(0, 10), update(dt) {
      this.t += dt
      for (const f of flicker) {
        if (f.neon) {
          const n = Math.sin(this.t * 11 + 2.7) * Math.sin(this.t * 3.3)
          f.mat.emissiveIntensity = n > 0.93 ? f.base * 0.25 : f.base
        }
      }
    }
  })
  return { obj: main.obj, meshes, flicker }
}
