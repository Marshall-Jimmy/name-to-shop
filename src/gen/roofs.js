// 屋顶生成器：10 种基础屋顶 + 彩蛋屋顶改装
import * as THREE from 'three/webgpu'
import { reg } from './registry.js'
import { box, cyl, cone, mesh, group, canvasTexture, cloneRepeat, hsl, sphere, torus } from './helpers.js'
import { paintRoofTiles, paintShingles, paintThatch, paintMetalSeam } from './textures.js'

function roofTexture(ctx0, dna, rand, painterKey) {
  const pal = dna.palette
  return canvasTexture(`roof-${dna.seed}-${painterKey}`, 512, 512, (ctx, w, h) => {
    const painter = { tiles: paintRoofTiles, shingles: paintShingles, thatch: paintThatch, seam: paintMetalSeam }[painterKey] || paintRoofTiles
    painter(ctx, w, h, { ...pal, main: pal.main }, rand)
  })
}

function roofMatFor(ctx, painterKey) {
  const tex = roofTexture(null, ctx.dna, ctx.rand, painterKey)
  return new THREE.MeshStandardMaterial({
    map: cloneRepeat(tex, ctx.fp.bbox.w / 4, ctx.fp.bbox.d / 4),
    roughness: 0.8, metalness: 0.05,
  })
}

function hipGeometry(w, d, hr, ridgeRatio = 0.5) {
  const hw = w / 2, hd = d / 2
  const rl = w * ridgeRatio / 2
  const pts = []
  const tri = (a, b, c) => { for (const p of [a, b, c]) pts.push(p[0], p[1], p[2]) }
  const quad = (a, b, c, e) => { tri(a, b, c); tri(a, c, e) }
  // 前坡 (-z)
  quad([-hw, 0, -hd], [hw, 0, -hd], [rl, hr, 0], [-rl, hr, 0])
  // 后坡 (+z)
  quad([hw, 0, hd], [-hw, 0, hd], [-rl, hr, 0], [rl, hr, 0])
  // 左坡
  tri([-hw, 0, hd], [-hw, 0, -hd], [-rl, hr, 0])
  // 右坡
  tri([hw, 0, -hd], [hw, 0, hd], [rl, hr, 0])
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  geo.computeVertexNormals()
  const uv = []
  for (let i = 0; i < pts.length; i += 3) uv.push((pts[i] / w + 0.5) * 2, (pts[i + 2] / d + 0.5) * 2)
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return geo
}

export const genRoofGable = reg('roof', 'roofGable', (ctx) => {
  const { fp, rand } = ctx
  const ov = rand.f(0.3, 0.55)
  const hr = rand.f(1.3, 2.2)
  const L = fp.front.L + ov * 2
  const D = fp.bbox.d + ov * 2
  const slopeLen = Math.hypot(D / 2, hr)
  const painter = rand.pick(['tiles', 'shingles', 'seam'])
  const mat = roofMatFor(ctx, painter)
  const g = group()
  for (const side of [-1, 1]) {
    const slope = box(L, 0.14, slopeLen, mat, {
      p: [0, ctx.H + hr / 2 - 0.02, side * D / 4],
      r: [side * Math.atan2(hr, D / 2), 0, 0],
    })
    g.add(slope)
  }
  // 山墙
  const gableMat = ctx.materials.wallSide
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape()
    shape.moveTo(-D / 2, 0); shape.lineTo(D / 2, 0); shape.lineTo(0, hr); shape.closePath()
    const gm = mesh(new THREE.ShapeGeometry(shape), gableMat, { r: [0, Math.PI / 2, 0], p: [side * (fp.front.L / 2 - 0.01), ctx.H, 0], cast: false })
    g.add(gm)
  }
  g.add(box(L + 0.15, 0.16, 0.3, ctx.materials.trim, { p: [0, ctx.H + hr, 0] }))
  return { obj: g, top: ctx.H + hr }
})

export const genRoofHip = reg('roof', 'roofHip', (ctx) => {
  const { fp, rand } = ctx
  const ov = rand.f(0.35, 0.6)
  const hr = rand.f(1.2, 2.0)
  const w = fp.bbox.w + ov * 2, d = fp.bbox.d + ov * 2
  const mat = roofMatFor(ctx, rand.pick(['tiles', 'shingles']))
  const g = group(mesh(hipGeometry(w, d, hr, rand.f(0.4, 0.7)), mat, { p: [0, ctx.H, 0] }))
  g.add(box(w * 0.5, 0.14, 0.24, ctx.materials.trim, { p: [0, ctx.H + hr, 0] }))
  return { obj: g, top: ctx.H + hr }
})

export const genRoofFlatParapet = reg('roof', 'roofFlatParapet', (ctx) => {
  const { fp, rand } = ctx
  const g = group()
  const outer = fp.pts.map(([x, z]) => [x * 1.03, z * 1.03])
  const inner = fp.pts.map(([x, z]) => [x * 1.03 - Math.sign(x) * 0.18, z * 1.03 - Math.sign(z) * 0.18])
  // 顶板
  const slabGeo = new THREE.ShapeGeometry(new THREE.Shape(outer.map(p => new THREE.Vector2(p[0], -p[1]))))
  const slab = mesh(slabGeo, ctx.materials.roofFlat, { r: [-Math.PI / 2, 0, 0], p: [0, ctx.H + 0.02, 0] })
  g.add(slab)
  // 女儿墙（每边）
  for (let i = 0; i < outer.length; i++) {
    const p1 = outer[i], p2 = outer[(i + 1) % outer.length]
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
    const theta = Math.atan2(p2[1] - p1[1], p2[0] - p1[0])
    g.add(box(len, rand.f(0.35, 0.6), 0.16, ctx.materials.trim, {
      p: [(p1[0] + p2[0]) / 2, ctx.H + 0.25, (p1[1] + p2[1]) / 2],
      r: [0, -theta, 0],
    }))
  }
  return { obj: g, top: ctx.H + 0.6 }
})

export const genRoofFlatMarquee = reg('roof', 'roofFlatMarquee', (ctx) => {
  const { fp, rand } = ctx
  const g = genRoofFlatParapet(ctx).obj
  // 大雨棚招牌框（前侧）
  const L = fp.front.L
  const mh = rand.f(1.1, 1.6)
  const canopy = box(L * 0.92, 0.12, rand.f(1.2, 1.8), ctx.materials.accent, {
    p: [0, ctx.H + 0.9, fp.bbox.d / 2 + 0.7],
    r: [-0.12, 0, 0],
  })
  g.add(canopy)
  const fascia = box(L * 0.95, mh, 0.18, ctx.materials.main, { p: [0, ctx.H + mh / 2 + 0.35, fp.bbox.d / 2 + 1.45] })
  fascia.userData.signStrip = true
  g.add(fascia)
  for (const x of [-L * 0.42, L * 0.42]) {
    g.add(cyl(0.05, 0.05, 1.4, ctx.materials.trim, { p: [x, ctx.H + 0.3, fp.bbox.d / 2 + 1.2], r: [0.12, 0, 0] }))
  }
  return { obj: g, top: ctx.H + 1.2 }
})

export const genRoofDome = reg('roof', 'roofDome', (ctx) => {
  const { fp, rand } = ctx
  const g = group()
  const r = Math.min(fp.bbox.w, fp.bbox.d) * 0.52
  const hr = rand.f(0.8, 1.4)
  const dome = mesh(new THREE.SphereGeometry(r, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2), ctx.materials.dome, {
    p: [0, ctx.H - 0.05, 0], s: [1, hr / r * 1.8, 1],
  })
  g.add(dome)
  g.add(cyl(r * 1.04, r * 1.04, 0.22, ctx.materials.trim, { p: [0, ctx.H + 0.02, 0] }))
  g.add(cyl(0.06, 0.06, 0.5, ctx.materials.glowMetal, { p: [0, ctx.H + hr * 1.8 + 0.2, 0] }))
  g.add(sphere(0.12, ctx.materials.glowMetal, { p: [0, ctx.H + hr * 1.8 + 0.5, 0] }))
  return { obj: g, top: ctx.H + hr * 1.8 }
})

export const genRoofFolded = reg('roof', 'roofFolded', (ctx) => {
  const { fp, rand } = ctx
  const ov = 0.4
  const L = fp.front.L + ov * 2
  const D = fp.bbox.d + ov * 2
  const n = rand.i(3, 5)
  const seg = D / n
  const hr = rand.f(0.5, 0.9)
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  for (let i = 0; i < n; i++) {
    shape.lineTo(seg * i + seg / 2, hr * (i % 2 === 0 ? 1 : 0.45))
    shape.lineTo(seg * (i + 1), 0)
  }
  shape.lineTo(D, -0.2); shape.lineTo(0, -0.2); shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false })
  const m = mesh(geo, roofMatFor(ctx, rand.pick(['seam', 'tiles'])), {
    r: [0, Math.PI / 2, 0], p: [-L / 2, ctx.H, D / 2],
  })
  const g = group(m)
  return { obj: g, top: ctx.H + hr }
})

export const genRoofJapanese = reg('roof', 'roofJapanese', (ctx) => {
  const { fp, rand } = ctx
  const ov = rand.f(0.7, 1.0)
  const hr = rand.f(0.9, 1.5)
  const w = fp.bbox.w + ov * 2, d = fp.bbox.d + ov * 2
  const g = group(mesh(hipGeometry(w, d, hr, rand.f(0.55, 0.8)), ctx.materials.japanRoof, { p: [0, ctx.H, 0] }))
  g.add(box(w * 0.62, 0.22, 0.3, ctx.materials.trim, { p: [0, ctx.H + hr + 0.02, 0] }))
  // 檐口横木
  g.add(box(w + 0.1, 0.16, 0.2, ctx.materials.trim, { p: [0, ctx.H - 0.05, -d / 2 + 0.06] }))
  g.add(box(w + 0.1, 0.16, 0.2, ctx.materials.trim, { p: [0, ctx.H - 0.05, d / 2 - 0.06] }))
  return { obj: g, top: ctx.H + hr + 0.3 }
})

export const genRoofPagoda = reg('roof', 'roofPagoda', (ctx) => {
  const { fp, rand } = ctx
  const g = group()
  const tiers = rand.i(2, 3)
  let y = ctx.H
  const base = Math.min(fp.bbox.w, fp.bbox.d)
  for (let i = 0; i < tiers; i++) {
    const scale = 1 - i * 0.22
    const w = fp.bbox.w * scale, d = fp.bbox.d * scale
    const hr = rand.f(0.7, 1.1) * scale
    g.add(mesh(hipGeometry(w, d, hr, 0.6), ctx.materials.japanRoof, { p: [0, y, 0] }))
    y += hr
    if (i < tiers - 1) {
      g.add(box(w * 0.55, 0.5, d * 0.55, ctx.materials.wallSide, { p: [0, y + 0.25, 0] }))
      y += 0.5
    }
  }
  g.add(cyl(0.05, 0.05, 0.8, ctx.materials.glowMetal, { p: [0, y + 0.4, 0] }))
  g.add(sphere(0.1, ctx.materials.glowMetal, { p: [0, y + 0.85, 0] }))
  return { obj: g, top: y + 0.9 }
})

export const genRoofTurret = reg('roof', 'roofTurret', (ctx) => {
  const { fp, rand } = ctx
  const g = group()
  const flat = genRoofFlatParapet(ctx)
  g.add(flat.obj)
  const r = rand.f(1.0, 1.5)
  const th = rand.f(1.6, 2.6)
  const corner = fp.pts[rand.i(0, fp.pts.length - 1)]
  const cx = corner[0] * 0.7, cz = corner[1] * 0.7
  g.add(cyl(r, r, th, ctx.materials.wallSide, { p: [cx, ctx.H + th / 2, cz] }))
  g.add(cone(r * 1.15, rand.f(1.2, 2.0), ctx.materials.turretRoof, { p: [cx, ctx.H + th + 0.7, cz], seg: 10 }))
  g.add(torus(r * 1.02, 0.06, ctx.materials.trim, { p: [cx, ctx.H + th, cz], r: [Math.PI / 2, 0, 0] }))
  return { obj: g, top: ctx.H + th + 2 }
})

export const genRoofTarp = reg('roof', 'roofTarp', (ctx) => {
  const { fp, rand } = ctx
  const g = group()
  const w = fp.bbox.w * 1.05, d = fp.bbox.d * 1.05
  const geo = new THREE.PlaneGeometry(w, d, 12, 12)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i)
    const sag = Math.sin(x / w * Math.PI) * Math.cos(y / d * Math.PI) * rand.f(0.15, 0.45)
    pos.setZ(i, -sag - Math.abs(Math.sin(x * 3)) * 0.06)
  }
  geo.computeVertexNormals()
  const tarp = mesh(geo, ctx.materials.tarp, { r: [-Math.PI / 2, 0, 0], p: [0, ctx.H + 0.3, 0] })
  g.add(tarp)
  for (const [px, pz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) {
    g.add(cyl(0.05, 0.06, 1.1, ctx.materials.trim, { p: [px, ctx.H + 0.6, pz], r: [rand.f(-0.15, 0.15), 0, rand.f(-0.15, 0.15)] }))
  }
  return { obj: g, top: ctx.H + 0.8 }
})

export const ROOF_GENS = {
  gable: genRoofGable, hip: genRoofHip, flatParapet: genRoofFlatParapet,
  flatMarquee: genRoofFlatMarquee, dome: genRoofDome, folded: genRoofFolded,
  japanese: genRoofJapanese, pagoda: genRoofPagoda, turret: genRoofTurret, tarp: genRoofTarp,
}

// ---------- 彩蛋屋顶改装 ----------
export const ROOF_MODS = {
  dragonRide: null,
}

export const genEggRoofMod = reg('roof', 'eggRoofMod', (ctx) => {
  // 通用屋顶彩蛋挂件（在 eggs3d 中进一步分发）
  const mods = { obj: group(), top: 0 }
  return mods
})

// 屋顶脊兽（生肖）
export const genZodiacBeast = reg('roof', 'zodiacBeast', (ctx) => {
  const { dna, rand } = ctx
  const g = group()
  const n = rand.i(3, 5)
  for (let i = 0; i < n; i++) {
    const t = canvasTexture(`beast-${dna.seed}-${i}`, 128, 128, (c, w, h) => {
      c.font = '96px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText(dna.zodiac.glyph, w / 2, h / 2 + 6)
    })
    const m = mesh(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshStandardMaterial({
      map: t, transparent: true, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.25, side: THREE.DoubleSide,
    }), { p: [rand.f(-1, 1), 0.32, -i * 0.5 + (n - 1) * 0.25], cast: false })
    m.userData.billboard = true
    g.add(m)
    g.add(cyl(0.16, 0.2, 0.22, ctx.materials.trim, { p: [m.position.x, 0.08, m.position.z] }))
  }
  return { obj: g, top: 0.6 }
})
