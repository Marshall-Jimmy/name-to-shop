// 建筑骨架：轮廓 → 地基 → 挤出墙体(门/窗真挖洞) → 屋顶 → 校验兜底
import * as THREE from 'three/webgpu'
import { makeRng } from '../core/rng.js'
import {
  box, mesh, group, canvasTexture, cloneRepeat, col, glassMat, stdMat,
  extrudeUp, insetPolygon, centroid, cyl,
} from './helpers.js'
import { paintWall, paintFloorWood, paintFloorTile, paintRoofFlat } from './textures.js'
import { drawFacade } from './facade.js'
import { ROOF_GENS, genZodiacBeast } from './roofs.js'
import { createSigns } from './signs.js'
import { placeDecor } from './decor.js'
import { buildInterior } from './interior.js'
import { createFlightRig } from './flight.js'
import { createParticles } from './effects.js'
import { createGround } from './ground.js'
import { applyEggRoof, applyEggDecor } from './eggs3d.js'

const WALL_T = 0.28

// ---------- 轮廓 ----------
export function computeFootprint(dna) {
  const rand = makeRng(dna.seed + '#fp')
  const w = rand.f(8, 12.5)
  const d = rand.f(6.5, 10)
  let pts
  switch (dna.footprintType) {
    case 'lshape': {
      const cut = rand.f(3.5, w * 0.42)
      pts = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2 + cut, d / 2], [-w / 2 + cut, -d / 2 + cut], [-w / 2, -d / 2 + cut]]
      break
    }
    case 'rounded': {
      const r = w * 0.16
      const arc = (cx, cz, a0, a1) => {
        const out = []
        for (let a = a0; a < a1; a += Math.PI / 8) out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r])
        return out
      }
      pts = [[-w / 2, d / 2], [w / 2, d / 2]]
      pts.push(...arc(w / 2 - r, d / 2 - r, 0, Math.PI / 2))
      pts.push(...arc(-w / 2 + r, d / 2 - r, Math.PI / 2, Math.PI))
      pts.push([-w / 2, -d / 2 + r], ...arc(-w / 2 + r, -d / 2 + r, Math.PI, Math.PI * 1.5))
      pts.push(...arc(w / 2 - r, -d / 2 + r, Math.PI * 1.5, Math.PI * 2))
      break
    }
    case 'hexagon': {
      const wf = w * 0.72
      pts = [[-wf / 2, d / 2], [wf / 2, d / 2], [w / 2, 0], [wf / 2, -d / 2], [-wf / 2, -d / 2], [-w / 2, 0]]
      break
    }
    case 'trapezoid': {
      const wb = w * 0.68
      pts = [[-w / 2, d / 2], [w / 2, d / 2], [wb / 2, -d / 2], [-wb / 2, -d / 2]]
      break
    }
    default:
      pts = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]
  }
  // 前边（法线朝 +Z 的最长边）
  let frontIdx = 0, bestZ = -Infinity, bestLen = 0
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i], p2 = pts[(i + 1) % pts.length]
    const midZ = (p1[1] + p2[1]) / 2
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
    if (midZ > bestZ + 0.01 || (Math.abs(midZ - bestZ) < 0.01 && len > bestLen)) {
      bestZ = midZ; bestLen = len; frontIdx = i
    }
  }
  let [fp1, fp2] = [pts[frontIdx], pts[(frontIdx + 1) % pts.length]]
  if (fp1[0] > fp2[0]) [fp1, fp2] = [fp2, fp1]
  const front = {
    p1: fp1, p2: fp2,
    mid: [(fp1[0] + fp2[0]) / 2, (fp1[1] + fp2[1]) / 2],
    L: Math.hypot(fp2[0] - fp1[0], fp2[1] - fp1[1]),
    theta: Math.atan2(fp2[1] - fp1[1], fp2[0] - fp1[0]),
    normal: [-(fp2[1] - fp1[1]) / Math.hypot(fp2[0] - fp1[0], fp2[1] - fp1[1]), (fp2[0] - fp1[0]) / Math.hypot(fp2[0] - fp1[0], fp2[1] - fp1[1])],
  }
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (const [x, z] of pts) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x)
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z)
  }
  return { pts, front, bbox: { w: maxX - minX, d: maxZ - minZ, minX, maxX, minZ, maxZ } }
}

// ---------- 立面布局（米，x 以墙左端为 0）----------
export function computeLayout(dna, L, H) {
  const rand = makeRng(dna.seed + '#layout')
  const twoFloors = H > 6.5
  const doorW = Math.min(rand.f(1.1, 1.5), L * 0.24)
  const doorH = rand.f(2.1, 2.4)
  const doorXc = rand.f(-L * 0.08, L * 0.08) + L / 2
  const margin = rand.f(0.5, 0.7)
  const winY = rand.f(0.5, 0.75), winTop = Math.min(rand.f(2.3, 2.8), H - 1.6)
  const windows = []
  const dl = doorXc - doorW / 2, dr = doorXc + doorW / 2
  if (dl - margin >= 1.05) windows.push({ x: margin, w: dl - 0.32 - margin, y: winY, h: winTop - winY })
  if (L - margin - dr >= 1.05) windows.push({ x: dr + 0.32, w: L - margin - dr, y: winY, h: winTop - winY })
  if (!windows.length) {
    // 兜底：门头横窗（保证展示窗存在）
    windows.push({ x: doorXc - doorW / 2 - 0.15, w: doorW + 0.3, y: doorH + 0.28, h: Math.min(0.75, H - doorH - 1.7) })
  }
  const bandH = rand.f(1.15, 1.5)
  const layout = {
    L, H, door: { x: doorXc - doorW / 2, w: doorW, h: doorH }, windows,
    signBand: { y: H - bandH - 0.18, h: bandH }, twoFloors,
  }
  if (twoFloors) {
    layout.upperWindows = []
    const uwY = 4.0, uwH = Math.min(1.3, H - bandH - 1.9 - uwY)
    const n = Math.max(2, Math.floor(L / 2.6))
    for (let i = 0; i < n; i++) {
      const cx = L * (i + 0.5) / n
      layout.upperWindows.push({ x: cx - 0.5, w: 1.0, y: uwY, h: Math.max(0.6, uwH) })
    }
  }
  return layout
}

// ---------- 共享材质 ----------
function createMaterials(dna, assets) {
  const pal = dna.palette
  const rand = makeRng(dna.seed + '#mat')
  const texKey = dna.material.tex
  const wallTex = canvasTexture(`wall-${dna.seed}`, 512, 512, (c, w, h) => paintWall(c, w, h, pal, rand, texKey))
  const woodTex = canvasTexture(`floorw-${dna.seed}`, 512, 512, (c, w, h) => paintFloorWood(c, w, h, pal, rand))
  const tileTex = canvasTexture(`floort-${dna.seed}`, 512, 512, (c, w, h) => paintFloorTile(c, w, h, pal, rand))
  const flatRoofTex = canvasTexture(`rooff-${dna.seed}`, 512, 512, (c, w, h) => paintRoofFlat(c, w, h, pal, rand))

  const m = {
    wallSide: new THREE.MeshStandardMaterial({ map: cloneRepeat(wallTex, 2, 1.4), roughness: dna.material.roughness, metalness: dna.material.metalness }),
    wallInner: new THREE.MeshStandardMaterial({ color: col(pal.wall, null, 0, 0, 12), roughness: 0.9 }),
    trim: new THREE.MeshStandardMaterial({ color: col(pal.trim), roughness: 0.6, metalness: 0.15 }),
    main: new THREE.MeshStandardMaterial({ color: col(pal.main), roughness: 0.55, metalness: 0.1 }),
    accent: new THREE.MeshStandardMaterial({ color: col(pal.accent), roughness: 0.6 }),
    glow: stdMat({ color: 0x14141c, emissive: col(pal.glow), emissiveIntensity: 1.15 + Math.min(dna.rarityMeta.glow, 1.4) * 0.28, roughness: 0.4 }),
    glowMetal: stdMat({ color: 0x3a2e10, emissive: 0xffc23d, emissiveIntensity: 1.4, roughness: 0.3, metalness: 0.8 }),
    glass: glassMat(),
    floorInt: new THREE.MeshStandardMaterial({ map: cloneRepeat(woodTex, 3, 3), roughness: 0.55 }),
    wallPaper: null,
    roofFlat: new THREE.MeshStandardMaterial({ map: cloneRepeat(flatRoofTex, 3, 3), roughness: 0.9 }),
    japanRoof: new THREE.MeshStandardMaterial({ color: col(pal.main, null, 0, 0, -22), roughness: 0.65 }),
    turretRoof: new THREE.MeshStandardMaterial({ color: col(pal.accent, null, 0, -10, -6), roughness: 0.5, metalness: 0.4 }),
    dome: stdMat({ color: col(pal.trim), roughness: 0.25, metalness: 0.7 }),
    tarp: stdMat({ color: col(pal.accent, null, 0, -20, 0), roughness: 0.95 }),
    foundation: null,
  }
  // 地基：PBR 砖贴图（若有）
  if (assets?.pbr?.brick) {
    m.foundation = new THREE.MeshStandardMaterial({
      map: assets.pbr.brick.map, normalMap: assets.pbr.brick.normal,
      roughnessMap: assets.pbr.brick.rough,
      color: col(pal.ground, null, 0, -30, -6), roughness: 1,
    })
    assets.pbr.brick.map.userData.keep = true
  } else {
    m.foundation = new THREE.MeshStandardMaterial({ color: col(pal.ground, null, 0, 0, -14), roughness: 0.95 })
  }
  // 室内地板：PBR 木地板（若有）
  if (assets?.pbr?.woodFloor) {
    m.floorInt = new THREE.MeshStandardMaterial({
      map: assets.pbr.woodFloor.map, normalMap: assets.pbr.woodFloor.normal,
      roughnessMap: assets.pbr.woodFloor.rough,
      color: col(pal.trim, null, 0, -30, 4), roughness: 0.7,
    })
    assets.pbr.woodFloor.map.userData.keep = true
  }
  return m
}

// ---------- 前墙（带门/窗真洞）+ 立面贴图 ----------
function buildFrontWall(ctx) {
  const { fp, layout, dna } = ctx
  const L = fp.front.L, H = layout.H
  const px = Math.min(140, Math.floor(2048 / L))
  const cw = Math.ceil(L * px), ch = Math.ceil(H * px)
  const randF = makeRng(dna.seed + '#facade')
  const facadeTex = canvasTexture(`facade-${dna.seed}`, cw, ch, (c, w, h) => {
    drawFacade(c, w, h, dna, layout, randF, px)
  })
  facadeTex.wrapS = facadeTex.wrapT = THREE.ClampToEdgeWrapping
  facadeTex.repeat.set(1 / L, 1 / H)
  facadeTex.offset.set(0.5, 0)

  const shape = new THREE.Shape()
  shape.moveTo(-L / 2, 0); shape.lineTo(L / 2, 0); shape.lineTo(L / 2, H); shape.lineTo(-L / 2, H); shape.closePath()
  const hole = (x0, y0, x1, y1) => {
    const p = new THREE.Path()
    p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x1, y1); p.lineTo(x0, y1); p.closePath()
    shape.holes.push(p)
  }
  const d = layout.door
  hole(d.x - L / 2, 0, d.x + d.w - L / 2, d.h)
  for (const w2 of layout.windows) {
    if (w2.h > 0.3) hole(w2.x - L / 2, w2.y, w2.x + w2.w - L / 2, w2.y + w2.h)
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: WALL_T, bevelEnabled: false })
  const facadeMat = new THREE.MeshStandardMaterial({
    map: facadeTex, roughness: ctx.dna.material.roughness, metalness: ctx.dna.material.metalness * 0.6,
  })
  const wall = new THREE.Mesh(geo, [facadeMat, ctx.materials.wallSide])
  wall.castShadow = true; wall.receiveShadow = true
  wall.rotation.y = -fp.front.theta
  wall.position.set(
    fp.front.mid[0] - fp.front.normal[0] * WALL_T, 0,
    fp.front.mid[1] - fp.front.normal[1] * WALL_T
  )
  return wall
}

// ---------- 其余边墙 ----------
function buildSideWalls(ctx) {
  const { fp, layout } = ctx
  const g = group()
  const H = layout.H
  for (let i = 0; i < fp.pts.length; i++) {
    const p1 = fp.pts[i], p2 = fp.pts[(i + 1) % fp.pts.length]
    const mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
    const theta = Math.atan2(p2[1] - p1[1], p2[0] - p1[0])
    // 跳过前边
    if (Math.abs(mid[0] - ctx.fp.front.mid[0]) < 0.01 && Math.abs(mid[1] - ctx.fp.front.mid[1]) < 0.01) continue
    const mat = ctx.materials.wallSide.clone()
    mat.map = cloneRepeat(ctx.materials.wallSide.map, len / 4, H / 4)
    const n = [-(p2[1] - p1[1]) / len, (p2[0] - p1[0]) / len]
    const w = box(len + WALL_T * 0.98, H, WALL_T, mat, {
      p: [mid[0] - n[0] * WALL_T / 2, H / 2, mid[1] - n[1] * WALL_T / 2],
      r: [0, -theta, 0],
    })
    g.add(w)
  }
  return g
}

// ---------- 主生成 ----------
export function buildShop(dna, assets) {
  const shopRoot = group()
  const groundRoot = group()
  const manifest = []
  const push = (slot, name, params = '') => manifest.push(`${slot}:${name}${params ? ':' + params : ''}`)

  try {
    const fp = computeFootprint(dna)
    const randS = makeRng(dna.seed + '#struct')
    const twoFloors = randS.chance(0.22)
    const H = twoFloors ? randS.f(6.8, 8.6) : randS.f(4.6, 6.4)
    const layout = computeLayout(dna, fp.front.L, H)
    const materials = createMaterials(dna, assets)

    const ctx = {
      dna, fp, layout, H, t: WALL_T, materials, assets, manifest, push,
      rand: makeRng(dna.seed + '#shop'),
      shopRoot, groundRoot,
      animate: [], hoverables: [],
    }

    // 1. 地基
    const foundPts = fp.pts.map(([x, z]) => [x * 1.045, z * 1.045])
    const foundation = extrudeUp(foundPts, 0.35, materials.foundation, { y: -0.35 })
    foundation.receiveShadow = true
    shopRoot.add(foundation)
    push('structure', 'foundation', dna.footprintType)

    // 台阶
    const stepMat = materials.trim
    const doorMidX = layout.door.x + layout.door.w / 2 - layout.L / 2
    const steps = group()
    for (let i = 0; i < 3; i++) {
      steps.add(box(layout.door.w + 0.5 + i * 0.32, 0.12, 0.3, stepMat, {
        p: [fp.front.mid[0] + doorMidX * Math.cos(fp.front.theta), -0.35 + 0.06 + i * 0.115, fp.front.mid[1] + fp.front.normal[1] * (0.15 + i * 0.3) + doorMidX * Math.sin(fp.front.theta)],
      }))
    }
    shopRoot.add(steps)

    // 2. 墙体
    const frontWall = buildFrontWall(ctx)
    shopRoot.add(frontWall)
    shopRoot.add(buildSideWalls(ctx))
    push('structure', 'walls', `${Math.round(fp.front.L)}x${Math.round(fp.bbox.d)}m H${H.toFixed(1)}`)

    // 3. 屋顶
    const roofGen = ROOF_GENS[dna.roofType] || ROOF_GENS.gable
    const roof = roofGen(ctx)
    shopRoot.add(roof.obj)
    let topY = roof.top
    push('roof', dna.roofType)

    // 彩蛋屋顶改装
    if (dna.eggEffects.roof) {
      const mod = applyEggRoof(ctx)
      if (mod) { shopRoot.add(mod.obj); topY = Math.max(topY, ctx.H + (mod.top || 0)) }
    }

    // 4. 招牌（强制构件）
    const signs = createSigns(ctx)
    shopRoot.add(signs.obj)
    ctx.signMeshes = signs.meshes
    ctx.flickerSigns = signs.flicker
    push('sign', dna.eggEffects.sign || dna.signStyle)

    // 5. 门窗玻璃与门板
    const openings = buildOpenings(ctx)
    shopRoot.add(openings.obj)
    ctx.doorMesh = openings.door
    push('facade', 'door+' + openings.kind)

    // 6. 室内
    const interior = buildInterior(ctx)
    shopRoot.add(interior.obj)
    ctx.interior = interior

    // 7. 外部装饰
    placeDecor(ctx)

    // 8. 飞行件
    const flight = createFlightRig(ctx)
    if (flight) {
      flight.obj.position.y = topY
      shopRoot.add(flight.obj)
      ctx.flight = flight
      push('flight', flight.kind)
    }

    // 9. 粒子特效
    const particles = createParticles(ctx)
    if (particles) {
      particles.obj.position.y = topY
      shopRoot.add(particles.obj)
      ctx.particles = particles
      push('effects', particles.kind)
    }

    // 10. 地面
    const ground = createGround(ctx)
    groundRoot.add(ground.obj)
    push('ground', ground.kind)

    // 11. 生肖脊兽（80% 概率，立于屋脊）
    if (randS.chance(0.8)) {
      try {
        const beast = genZodiacBeast(ctx)
        beast.obj.position.set(0, topY, 0)
        shopRoot.add(beast.obj)
        push('roof', 'zodiac:' + dna.zodiac.id)
      } catch (e) { console.warn('[buildShop] zodiac beast failed:', e) }
    }

    // ---- 校验 ----
    const checks = {
      foundation: !!foundation,
      walls: !!frontWall,
      roof: !!roof.obj,
      door: !!openings.door,
      window: layout.windows.length > 0,
      sign: signs.meshes.length > 0,
    }
    ctx.checks = checks
    ctx.valid = Object.values(checks).every(Boolean)

    // 门的世界坐标（相机飞入用）
    const doorWorld = new THREE.Vector3(
      fp.front.mid[0] + doorMidX * Math.cos(fp.front.theta),
      1.2,
      fp.front.mid[1] + doorMidX * Math.sin(fp.front.theta) + fp.front.normal[1] * 0.2
    )
    const inward = new THREE.Vector3(-fp.front.normal[0], 0, -fp.front.normal[1])
    const c = centroid(fp.pts)
    const meta = {
      bounds: { w: fp.bbox.w, d: fp.bbox.d, h: topY + 0.35 },
      doorWorld,
      enterPoint: doorWorld.clone().add(inward.clone().multiplyScalar(2.2)).setY(1.55),
      exitPoint: doorWorld.clone().add(inward.clone().multiplyScalar(-2.6)).setY(1.5),
      interiorCenter: new THREE.Vector3(c.x, 1.5, c.z),
      roofTop: topY,
      flightAnchor: new THREE.Vector3(0, topY + 0.6, 0),
      cameraHero: new THREE.Vector3(fp.bbox.w * 0.72, topY * 0.62 + 1.2, fp.bbox.d * 0.95 + 6.5),
      shopName: dna.name,
    }
    return { shopRoot, groundRoot, meta, ctx, manifest, dna }
  } catch (err) {
    console.error('[buildShop] fallback:', err)
    return buildFallbackShop(dna, assets)
  }
}

// ---------- 兜底安全小屋 ----------
function buildFallbackShop(dna, assets) {
  const shopRoot = group()
  const groundRoot = group()
  const manifest = ['fallback:safehouse']
  const pal = dna.palette
  const randS = makeRng(dna.seed + '#fallback')
  const materials = createMaterials({ ...dna, material: { tex: 'plaster', roughness: 0.8, metalness: 0 } }, assets)
  const L = 9, D = 7, H = 5.2
  const fp = computeFootprint({ ...dna, footprintType: 'rect' })
  const layout = computeLayout(dna, L, H)
  const ctx = {
    dna: { ...dna, roofType: 'gable', signStyle: 'box' }, fp, layout, H, t: WALL_T,
    materials, assets, manifest, push: (s, n) => manifest.push(`${s}:${n}`),
    rand: randS, shopRoot, groundRoot, animate: [], hoverables: [],
  }
  const foundPts = fp.pts.map(([x, z]) => [x * 1.045, z * 1.045])
  shopRoot.add(extrudeUp(foundPts, 0.35, materials.foundation, { y: -0.35 }))
  shopRoot.add(buildFrontWall(ctx))
  shopRoot.add(buildSideWalls(ctx))
  const roof = ROOF_GENS.gable(ctx)
  shopRoot.add(roof.obj)
  const signs = createSigns(ctx)
  shopRoot.add(signs.obj)
  ctx.signMeshes = signs.meshes
  ctx.flickerSigns = signs.flicker
  const openings = buildOpenings(ctx)
  shopRoot.add(openings.obj)
  ctx.doorMesh = openings.door
  const interior = buildInterior(ctx)
  shopRoot.add(interior.obj)
  ctx.interior = interior
  try {
    placeDecor(ctx)
  } catch (e) {
    console.warn('[fallback] decor skipped:', e)
  }
  const ground = createGround(ctx)
  groundRoot.add(ground.obj)
  const doorMidX = layout.door.x + layout.door.w / 2 - layout.L / 2
  const doorWorld = new THREE.Vector3(doorMidX, 1.2, fp.bbox.d / 2)
  ctx.checks = { foundation: true, walls: true, roof: true, door: true, window: true, sign: true }
  ctx.valid = true
  return {
    shopRoot, groundRoot, manifest, ctx, dna,
    meta: {
      bounds: { w: L, d: D, h: H + 2.4 },
      doorWorld,
      enterPoint: new THREE.Vector3(doorMidX, 1.55, D / 2 - 2.2),
      exitPoint: new THREE.Vector3(doorMidX, 1.5, D / 2 + 2.6),
      interiorCenter: new THREE.Vector3(0, 1.5, 0),
      roofTop: H + 2.2,
      flightAnchor: new THREE.Vector3(0, H + 2.8, 0),
      cameraHero: new THREE.Vector3(8, 4.6, 13),
      shopName: dna.name,
    },
  }
}

// 门窗构件（门板 / 玻璃 / 窗框）——单独导出供兜底复用
export function buildOpenings(ctx) {
  const { fp, layout, materials, dna } = ctx
  const L = fp.front.L
  const g = group()
  const rand = makeRng(dna.seed + '#opening')
  const cosT = Math.cos(fp.front.theta), sinT = Math.sin(fp.front.theta)
  const toWorld = (lx, ly, out = 0) => new THREE.Vector3(
    fp.front.mid[0] + lx * cosT + fp.front.normal[0] * out,
    ly,
    fp.front.mid[1] + lx * sinT + fp.front.normal[1] * out
  )

  // 门板（微开）
  const d = layout.door
  const doorC = toWorld(d.x + d.w / 2 - L / 2, 0, 0.02)
  const doorMat = new THREE.MeshStandardMaterial({
    color: col(dna.palette.accent, null, 0, 0, -4), roughness: 0.5, metalness: 0.2,
  })
  const door = box(d.w - 0.06, d.h - 0.05, 0.07, doorMat, { p: [doorC.x, (d.h - 0.05) / 2, doorC.z] })
  door.rotation.y = -fp.front.theta + rand.f(0.12, 0.3) * (rand.chance(0.5) ? 1 : -1)
  // 门把手
  const handle = cyl(0.025, 0.025, 0.22, materials.glowMetal, {
    p: [doorC.x, d.h * 0.48, doorC.z + 0.06], r: [Math.PI / 2, 0, 0],
  })
  g.add(door, handle)
  door.userData.interact = { type: 'door', label: '进店逛逛' }
  ctx.hoverables.push(door)

  // 展示窗玻璃 + 窗框
  for (const win of layout.windows) {
    if (win.h < 0.3) continue
    const wc = toWorld(win.x + win.w / 2 - L / 2, win.y + win.h / 2, 0)
    const glass = box(win.w - 0.1, win.h - 0.1, 0.03, materials.glass, {
      p: [wc.x, wc.y, wc.z], r: [0, -fp.front.theta, 0], cast: false,
    })
    glass.userData.interact = { type: 'window', label: `${dna.business.name}的橱窗` }
    g.add(glass)
    // 中梃
    if (win.w > 1.6) {
      const mullX = toWorld(win.x + win.w / 2 - L / 2, win.y + win.h / 2, 0)
      g.add(box(0.06, win.h - 0.1, 0.06, materials.trim, { p: [mullX.x, mullX.y, mullX.z], r: [0, -fp.front.theta, 0] }))
    }
    // 橱窗道具剪影（半透明发光小物）
    const propsN = Math.min(4, Math.floor(win.w / 0.8))
    for (let i = 0; i < propsN; i++) {
      const pc = toWorld(win.x + win.w * (i + 0.5) / propsN - L / 2, win.y + 0.35, -0.35)
      const s = rand.f(0.16, 0.3)
      g.add(box(s, s * rand.f(0.8, 1.8), s, materials.glow, {
        p: [pc.x, pc.y + s * 0.5, pc.z], r: [0, rand.f(0, 3), 0], cast: false,
      }))
    }
  }
  return { obj: g, door, kind: 'panel' }
}
