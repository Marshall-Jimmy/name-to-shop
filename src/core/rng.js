// 种子系统：字符串 → cyrb128 → sfc32 → 确定性随机。全项目禁止 Math.random()。

export function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i)
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0]
}

export function sfc32(a, b, c, d) {
  return function () {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0
    let t = (a + b) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = (c << 21) | (c >>> 11)
    d = (d + 1) | 0
    t = (t + d) | 0
    c = (c + t) | 0
    return (t >>> 0) / 4294967296
  }
}

// 稳定 32 位散列（用于稀有度档位 / manifest 对比）
export function hash32(str) {
  const h = cyrb128(str)
  return h[0]
}

export function makeRng(seedStr, stream = 0) {
  const parts = cyrb128(String(seedStr))
  const s = [...parts]
  for (let i = 0; i < stream; i++) s[i & 3] = (s[i & 3] + 0x9e3779b9 * (i + 1)) >>> 0
  const rand = sfc32(s[0], s[1], s[2], s[3])

  const rng = {
    seed: String(seedStr),
    stream,
    rand,
    f(a, b) { return a + (b - a) * rand() },
    i(a, b) { return Math.floor(a + (b - a + 1) * rand()) },
    chance(p) { return rand() < p },
    pick(arr) { return arr[Math.floor(rand() * arr.length)] },
    picks(arr, n) {
      const pool = [...arr], out = []
      while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0])
      return out
    },
    shuffle(arr) {
      const a = [...arr]
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    },
    weighted(pairs) {
      let total = 0
      for (const [, w] of pairs) total += w
      let r = rand() * total
      for (const [v, w] of pairs) {
        r -= w
        if (r <= 0) return v
      }
      return pairs[pairs.length - 1][0]
    },
    sign() { return rand() < 0.5 ? -1 : 1 },
    // 派生子流（粒子/动画各自独立确定性序列）
    child(tag) { return makeRng(seedStr + '//' + tag, stream + 1) },
  }
  return rng
}

// HSL 颜色工具（配色抖动用）
export function hsl(h, s, l, a = 1) {
  return { h: ((h % 360) + 360) % 360, s: Math.min(100, Math.max(0, s)), l: Math.min(100, Math.max(0, l)), a }
}
export function hslCss(c) {
  return c.a !== undefined && c.a < 1
    ? `hsla(${c.h},${c.s}%,${c.l}%,${c.a})`
    : `hsl(${c.h},${c.s}%,${c.l}%)`
}
