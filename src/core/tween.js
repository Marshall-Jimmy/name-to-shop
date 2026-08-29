// 极简确定性补间系统（无第三方依赖，不使用 Math.random）
export const Ease = {
  linear: t => t,
  inOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  outQuint: t => 1 - Math.pow(1 - t, 5),
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) },
  outElastic: t => {
    const c4 = (2 * Math.PI) / 3
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  },
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
}

const tweens = []

export function tween({ dur, ease = Ease.inOutCubic, onUpdate, onDone, delay = 0, tag = null }) {
  const tw = { t: -delay, dur, ease, onUpdate, onDone, done: false, tag }
  tweens.push(tw)
  return tw
}

export function killTweens(filter) {
  if (!filter) { tweens.length = 0; return }
  for (let i = tweens.length - 1; i >= 0; i--) {
    if (filter(tweens[i])) tweens.splice(i, 1)
  }
}

export function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i]
    tw.t += dt
    if (tw.t < 0) continue
    const p = Math.min(1, tw.t / tw.dur)
    tw.onUpdate?.(tw.ease(p), p)
    if (p >= 1) {
      tweens.splice(i, 1)
      tw.onDone?.()
    }
  }
}

export function debugTweens() {
  return tweens.map(t => ({ tag: t.tag, t: +t.t.toFixed(2), dur: t.dur }))
}

export function hasCameraTween() {
  return tweens.some(t => t.tag === 'camera')
}

// 数值补间
export function animateValue(from, to, dur, onUpdate, ease = Ease.inOutCubic, onDone) {
  return tween({
    dur, ease,
    onUpdate: (e) => onUpdate(from + (to - from) * e),
    onDone,
  })
}

// 相机电影运镜：position + lookAt target 同时插值。
// 独占 camera 通道：新运镜启动即终止上一个运镜（慢机器上上一个可能未跑完，避免两个 tween 争夺相机）。
// 运镜期间调用方应跳过 controls.update()（引擎 cinematic 标志），否则 min/maxDistance 钳制会与运镜对抗。
export function flyCamera(camera, controls, toPos, toTarget, dur, ease = Ease.inOutCubic, onDone) {
  killTweens(tw => tw.tag === 'camera')
  const p0 = camera.position.clone()
  const t0 = controls ? controls.target.clone() : new THREEVec3Like()
  return tween({
    dur, ease, tag: 'camera',
    onUpdate: (e) => {
      camera.position.lerpVectors(p0, toPos, e)
      if (controls) {
        controls.target.lerpVectors(t0, toTarget, e)
        camera.lookAt(controls.target)
      } else {
        camera.lookAt(toTarget)
      }
    },
    onDone,
  })
}

class THREEVec3Like {
  clone() { return this }
  lerpVectors() { return this }
}
