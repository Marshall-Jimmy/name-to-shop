// 组件生成器注册表：所有 gen 函数在此登记（自检页统计用）
const REG = new Map()

export function reg(slot, name, fn) {
  if (REG.has(name)) throw new Error(`duplicate generator: ${name}`)
  REG.set(name, { slot, name, fn })
  return fn
}

export function getGen(name) {
  return REG.get(name)
}

export function gensBySlot(slot) {
  return [...REG.values()].filter(g => g.slot === slot)
}

export function allGens() {
  return [...REG.values()]
}

export function registryStats() {
  const bySlot = {}
  for (const { slot } of REG.values()) bySlot[slot] = (bySlot[slot] || 0) + 1
  return { total: REG.size, bySlot }
}
