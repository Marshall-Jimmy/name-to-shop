// CC0 资产加载：Kenney GLTF 模型 + ambientCG PBR 贴图 + PolyHaven HDRI
import * as THREE from 'three/webgpu'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { markObjectResourcesPersistent } from './model-library.js'

// BASE_URL 相对解析：dev server 根路径与 GitHub Pages 子路径均可用
const B = import.meta.env.BASE_URL || '/'
const FURNITURE_BASE = `${B}assets/models/furniture-kit/Models/GLTF format/`
const NATURE_BASE = `${B}assets/models/nature-kit/Models/GLTF format/`
const TEX_BASE = `${B}assets/textures/`

// 室内会用到的家具子集（控制内存与加载时间）
const FURNITURE_MODELS = [
  'kitchenBar', 'kitchenBarEnd', 'stoolBar', 'stoolBarSquare',
  'table', 'tableRound', 'tableCross', 'chair', 'chairCushion', 'chairModernCushion',
  'loungeSofa', 'loungeSofaCorner', 'sideTable',
  'bookcaseOpen', 'bookcaseOpenLow', 'bookcaseClosed',
  'kitchenFridge', 'kitchenFridgeLarge', 'kitchenCoffeeMachine', 'kitchenStove', 'kitchenStoveElectric',
  'televisionModern', 'televisionVintage', 'cabinetTelevision',
  'desk', 'tableCoffee',
  'rugRound', 'rugRectangle', 'rugRounded',
  'pottedPlant', 'plantSmall1', 'plantSmall2', 'plantSmall3',
  'pillow', 'laptop', 'radio', 'speaker', 'trashcan',
  'ceilingFan', 'bathtub', 'bear', 'coatRackStanding', 'lampRoundFloor',
  'loungeChair', 'loungeChairRelax', 'computerScreen', 'computerKeyboard',
  'stairs', 'kitchenMicrowave', 'washer', 'toilet',
]

const NATURE_MODELS = [
  'tree_small', 'tree_cone', 'plant_bushSmall', 'flower_redA', 'flower_yellowA',
  'rock_smallA', 'rock_smallB', 'grass', 'mushroom_redA', 'log', 'pot_small',
]

const PBR_SETS = {
  brick: { dir: 'Bricks074', has: ['map', 'normal', 'rough'] },
  concrete: { dir: 'Concrete034', has: ['map', 'normal', 'rough'] },
  metal: { dir: 'Metal026', has: ['map', 'normal', 'rough', 'metal'] },
  woodFloor: { dir: 'WoodFloor042', has: ['map', 'normal', 'rough'] },
}

const texLoader = new THREE.TextureLoader()
const gltfLoader = new GLTFLoader()

function loadTexture(url, srgb) {
  return new Promise((resolve) => {
    texLoader.load(url, (t) => {
      if (srgb) t.colorSpace = THREE.SRGBColorSpace
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.anisotropy = 4
      t.userData.keep = true
      resolve(t)
    }, undefined, () => resolve(null))
  })
}

function loadGLB(url) {
  return new Promise((resolve) => {
    gltfLoader.load(url, (g) => resolve(g.scene || g.scenes?.[0] || null), undefined, () => resolve(null))
  })
}

// Kenney 模型以米为单位偏大（~1 unit = 1m 但模型整体尺寸偏大），统一缩放归一
function normalizeModel(obj) {
  if (!obj) return null
  const box = new THREE.Box3().setFromObject(obj)
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  if (maxDim > 0 && Math.abs(maxDim - 1) > 0.001) {
    const s = 1 / maxDim
    obj.scale.setScalar(s)
  }
  // 底面贴地
  const box2 = new THREE.Box3().setFromObject(obj)
  obj.position.y -= box2.min.y
  const holder = new THREE.Group()
  holder.add(obj)
  return markObjectResourcesPersistent(holder)
}

export async function loadAssets(onProgress) {
  const assets = { pbr: {}, models: { furniture: {}, nature: {} }, hdri: {} }
  const tasks = []
  let done = 0
  const total = FURNITURE_MODELS.length + NATURE_MODELS.filter(Boolean).length + Object.keys(PBR_SETS).length
  const tick = () => { done++; onProgress?.(done / total) }

  // PBR 贴图
  for (const [key, set] of Object.entries(PBR_SETS)) {
    const load = async () => {
      const out = {}
      const mapUrl = `${TEX_BASE}${set.dir}/${set.dir}_1K-JPG_Color.jpg`
      const normalUrl = `${TEX_BASE}${set.dir}/${set.dir}_1K-JPG_NormalGL.jpg`
      const roughUrl = `${TEX_BASE}${set.dir}/${set.dir}_1K-JPG_Roughness.jpg`
      const metalUrl = `${TEX_BASE}${set.dir}/${set.dir}_1K-JPG_Metalness.jpg`
      const [map, normal, rough, metal] = await Promise.all([
        loadTexture(mapUrl, true), loadTexture(normalUrl, false), loadTexture(roughUrl, false),
        set.has.includes('metal') ? loadTexture(metalUrl, false) : Promise.resolve(null),
      ])
      if (map) assets.pbr[key] = { map, normal, rough, metal }
    }
    tasks.push(load().then(tick))
  }

  // Kenney 家具
  for (const name of FURNITURE_MODELS) {
    tasks.push(loadGLB(FURNITURE_BASE + name + '.glb').then((o) => {
      if (o) assets.models.furniture[name] = normalizeModel(o)
      tick()
    }))
  }

  // Kenney 自然
  for (const name of NATURE_MODELS.filter(Boolean)) {
    tasks.push(loadGLB(NATURE_BASE + name + '.glb').then((o) => {
      if (o) assets.models.nature[name] = normalizeModel(o)
      tick()
    }))
  }

  await Promise.all(tasks)
  assets.hdri = {
    night: `${B}assets/hdri/dikhololo_night_1k.hdr`,
    sunset: `${B}assets/hdri/venice_sunset_1k.hdr`,
  }
  return assets
}
