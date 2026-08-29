// DNA 掷取系统：名字 → 业态/风格/配色/材质/光照/骨架/彩蛋/稀有度
import { makeRng, hash32 } from './rng.js'
import businesses from '../data/businesses.json'
import styles from '../data/styles.json'
import lightingPresets from '../data/lighting.json'
import materials from '../data/materials.json'
import zodiacData from '../data/zodiac.json'
import eggsData from '../data/eggs.json'

const EGG_PALETTE_OVERRIDES = {
  gold:      { main: [45, 85, 55],  wall: [40, 60, 88],  trim: [45, 90, 62],  accent: [45, 95, 65],  glow: [48, 100, 68],  ground: [40, 35, 55], label: '金色暴富' },
  pinkLove:  { main: [340, 80, 70],  wall: [345, 70, 88], trim: [330, 75, 72], accent: [350, 90, 75], glow: [345, 100, 75], ground: [340, 50, 82], label: '粉红心动' },
  black404:  { main: [0, 0, 12],     wall: [220, 10, 16], trim: [0, 0, 30],    accent: [0, 70, 45],   glow: [0, 90, 55],    ground: [220, 8, 14],  label: '404虚空' },
  rainbow:   { main: [280, 75, 68],  wall: [50, 55, 88],  trim: [190, 75, 60], accent: [340, 80, 70], glow: [50, 100, 70],  ground: [120, 45, 62], label: '多巴胺彩虹' },
  maillard:  { main: [25, 60, 38],   wall: [30, 45, 80],  trim: [20, 55, 45],  accent: [35, 75, 55],  glow: [30, 95, 60],   ground: [30, 30, 45],  label: '美拉德焦糖' },
  oldMoney:  { main: [150, 45, 28],  wall: [40, 25, 84],  trim: [45, 60, 55],  accent: [45, 70, 60],  glow: [45, 90, 62],   ground: [150, 25, 35], label: '老钱鎏金' },
  panda:     { main: [0, 0, 14],     wall: [0, 0, 92],    trim: [0, 0, 16],    accent: [120, 40, 45], glow: [120, 80, 60],  ground: [110, 35, 40], label: '熊猫黑白' },
  iceSnow:   { main: [200, 55, 80],  wall: [195, 45, 88], trim: [210, 60, 70], accent: [190, 70, 78], glow: [195, 100, 78], ground: [200, 30, 85], label: '冰雪奇缘' },
  cat:       { main: [35, 55, 78],   wall: [35, 45, 86],  trim: [30, 40, 40],  accent: [340, 60, 70], glow: [340, 90, 68],  ground: [35, 25, 65],  label: '猫猫奶油' },
  darkGoth:  { main: [270, 25, 14],  wall: [270, 20, 18], trim: [345, 50, 40], accent: [345, 75, 48], glow: [345, 95, 58],  ground: [270, 18, 14], label: '哥特暗夜' },
  camo:      { main: [80, 25, 28],   wall: [70, 20, 32],  trim: [50, 20, 38],  accent: [30, 35, 40],  glow: [60, 80, 55],   ground: [75, 25, 38],  label: '迷彩战术' },
  aurora:    { main: [160, 65, 45],  wall: [200, 40, 22], trim: [270, 60, 60], accent: [190, 80, 60], glow: [180, 100, 65], ground: [200, 35, 18], label: '极光秘境' },
}

const RARITY_TIERS = ['N', 'R', 'SR', 'SSR', 'UR']
const RARITY_THRESHOLDS = [45, 75, 90, 97, 100]
const RARITY_META = {
  N:   { label: '普通', color: [220, 10, 60],  glow: 0.5, particleBoost: 0 },
  R:   { label: '稀有', color: [210, 80, 60],  glow: 0.9, particleBoost: 1 },
  SR:  { label: '超稀有', color: [275, 80, 62], glow: 1.3, particleBoost: 2 },
  SSR: { label: '传说', color: [45, 95, 58],   glow: 1.8, particleBoost: 3 },
  UR:  { label: '神话', color: [0, 90, 60],    glow: 2.4, particleBoost: 4 },
}

function matchEggs(name, lower) {
  const hits = []
  for (const e of eggsData.eggs) {
    const t = e.t
    let matched = false
    if (e.re) matched = new RegExp(e.re).test(lower)
    else if (/^[0-9]+$/.test(t)) matched = name.includes(t)
    else matched = lower.includes(t.toLowerCase())
    if (matched) hits.push(e)
  }
  hits.sort((a, b) => (b.p || 0) - (a.p || 0))
  return hits
}

function rollRarity(name, bonus) {
  const h = hash32(name + '#rarity')
  const roll = h % 100
  let tier = 0
  for (let i = 0; i < RARITY_THRESHOLDS.length; i++) {
    if (roll < RARITY_THRESHOLDS[i]) { tier = i; break }
  }
  tier = Math.min(4, tier + Math.min(bonus, 4 - tier))
  return RARITY_TIERS[tier]
}

export function rollShop(name) {
  const rng = makeRng(name)
  const lower = name.toLowerCase()

  // 生肖 / 星座（含强制命中）
  const animals = zodiacData.animals
  const forcedAnimal = animals.find(a => name.includes(a.char))
  const zodiac = forcedAnimal || animals[hash32(name + '#zodiac') % 12]
  const constellations = zodiacData.constellations
  const constellation = constellations[hash32(name + '#const') % 12]

  // 第一层：业态（名字含业态关键词优先）
  const keywordMap = [
    ['burger', /汉堡|堡|burger/i], ['ramen', /拉面|ramen/i], ['coffee', /咖啡|coffee|咖/i],
    ['bubbletea', /奶茶|boba|珍珠/i], ['bookstore', /书|book/i], ['flower', /花|flor/i],
    ['barber', /理发|剪|barber|发/i], ['grocery', /杂货|超市|market/i], ['pharmacy', /药|pharm/i],
    ['cyberRepair', /修|repair|fix/i], ['catCafe', /猫咖|猫/i], ['vintage', /古着|vintage|古/i],
    ['toyshop', /玩具|toy/i], ['record', /唱片|音乐|record/i], ['watchmaker', /钟|表|watch/i],
    ['photo', /照|相|photo/i], ['fortune', /占卜|塔罗|fortune/i], ['potion', /药水|魔法|potion/i],
    ['weapon', /武器|锻造|weapon|剑/i], ['noodle', /面|noodle/i],
  ]
  let business = null
  for (const [id, re] of keywordMap) {
    if (re.test(name)) { business = businesses.find(b => b.id === id); break }
  }
  if (!business) business = rng.pick(businesses)

  // 第二层：风格流派
  let style = rng.weighted(styles.map(s => [s, s.weight]))
  // 第三层：配色（含抖动标记）
  const paletteIdx = rng.i(0, style.palettes.length - 1)
  const palette = { ...style.palettes[paletteIdx] }
  const hueShift = rng.f(-14, 14)
  for (const k of ['main', 'wall', 'trim', 'accent', 'glow', 'ground']) {
    if (palette[k]) palette[k] = [palette[k][0] + hueShift, palette[k][1], palette[k][2]]
  }
  // 第四层：材质
  const material = rng.weighted(
    materials.map(m => [m, style.materials.includes(m.id) ? m.weight * 3 : m.weight * 0.3])
  )
  // 第五层：光照
  const allowedLight = lightingPresets.filter(l => style.lighting.includes(l.id))
  const lighting = allowedLight.length
    ? rng.weighted(allowedLight.map(l => [l, l.weight]))
    : rng.weighted(lightingPresets.map(l => [l, l.weight]))

  // 彩蛋（先于骨架：骨架会引用 eggEffects）
  const eggHits = matchEggs(name, lower)
  const eggBonus = eggHits.reduce((s, e) => s + (e.rar || 0), 0)
  const rarity = rollRarity(name, eggBonus)
  const eggEffects = { sign: null, window: null, roof: null, decor: [], particle: null, palette: null, flight: null, subtitle: null, lighting: null, footprint: null }
  for (const e of eggHits) {
    const fx = e.fx || {}
    if (fx.sign) eggEffects.sign = fx.sign
    if (fx.window) eggEffects.window = fx.window
    if (fx.roof) eggEffects.roof = fx.roof
    if (fx.decor) eggEffects.decor.push(...fx.decor)
    if (fx.particle) eggEffects.particle = fx.particle
    if (fx.palette) eggEffects.palette = fx.palette
    if (fx.flight) eggEffects.flight = fx.flight
    if (fx.subtitle) eggEffects.subtitle = fx.subtitle
    if (fx.lighting) eggEffects.lighting = fx.lighting
    if (fx.footprint) eggEffects.footprint = fx.footprint
  }

  // 骨架
  const footprints = ['rect', 'rect', 'rect', 'lshape', 'rounded', 'hexagon', 'trapezoid']
  const footprintType = eggEffects.footprint || rng.pick(footprints)
  const roofPool = style.roofBias.length ? style.roofBias : ['gable', 'flatParapet']
  let roofType = rng.pick(roofPool)
  if (footprintType !== 'rect' && ['gable', 'hip', 'japanese', 'folded'].includes(roofType)) {
    roofType = rng.pick(['flatParapet', 'flatMarquee', 'dome', 'pagoda', 'turret'])
  }
  // 彩蛋屋顶覆盖（龙脊/兔耳/爱心/冰雪）
  if (eggEffects.roof && ['dragonRidge', 'rabbitEars', 'heart', 'ice'].includes(eggEffects.roof)) {
    roofType = 'flatParapet'
  }

  // 招牌样式
  const signPool = business.signBias.filter(s => style.signStyles.includes(s))
  const signStyle = eggEffects.sign || (signPool.length ? rng.pick(signPool) : rng.pick(business.signBias.concat(style.signStyles)))

  // 彩蛋配色覆盖
  const eggPalette = eggEffects.palette ? EGG_PALETTE_OVERRIDES[eggEffects.palette] : null
  const finalPalette = eggPalette || palette
  const eggLighting = eggEffects.lighting
    ? lightingPresets.find(l => l.id === eggEffects.lighting)
    : null

  const dna = {
    name,
    seed: name,
    rng,
    business, style, palette: finalPalette, paletteSource: eggPalette ? eggPalette.label : `${style.name}·${paletteIdx + 1}号配色`,
    material, lighting: eggLighting || lighting,
    rarity, rarityMeta: RARITY_META[rarity], eggBonus,
    footprintType, roofType, signStyle,
    eggs: eggHits,
    eggEffects, zodiac, constellation,
    subtitle: business.slogans[hash32(name + '#slogan') % business.slogans.length],
    neonSub: eggEffects.subtitle || zodiac.subtitle,
    hueShift,
    manifest: null,
  }
  dna.manifest = JSON.stringify({
    b: business.id, s: style.id, pi: paletteIdx, hs: Math.round(hueShift * 10),
    m: material.id, l: (eggLighting || lighting).id, f: footprintType, r: roofType,
    sg: signStyle, rar: rarity, z: zodiac.id, c: constellation.id,
    e: eggHits.map(e => e.t),
  })
  return dna
}

export { RARITY_TIERS, RARITY_META, EGG_PALETTE_OVERRIDES, businesses, styles, materials, lightingPresets, zodiacData, eggsData }
