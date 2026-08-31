export function computeFunctionKeyLayout(totalWidth) {
  const gap = 0.08
  const specs = [
    { id: 'clear', label: '清空', width: 0.84 },
    { id: 'back', label: '删除', width: 0.84 },
    { id: 'dice', label: '骰子', width: 0.84 },
    { id: 'space', label: '空格', width: 1.25 },
  ]
  const requiredWidth = specs.reduce((sum, item) => sum + item.width, 0) + gap * (specs.length - 1)
  if (requiredWidth > totalWidth) throw new Error('Function keys do not fit the keyboard width')

  let cursor = -requiredWidth / 2
  return specs.map(item => {
    const result = { ...item, x: cursor + item.width / 2 }
    cursor += item.width + gap
    return result
  })
}

export function fitTextSize(measureAtSize, maxWidth, { maxSize = 100, minSize = 40, step = 2 } = {}) {
  let size = maxSize
  while (size > minSize && measureAtSize(size) > maxWidth) size -= step
  return Math.max(minSize, size)
}

export function computeTypingCameraPose(aspect) {
  const safeAspect = Math.max(0.35, Number.isFinite(aspect) ? aspect : 1)
  const verticalHalfFov = 25 * Math.PI / 180
  const horizontalHalfTangent = Math.tan(verticalHalfFov) * safeAspect
  const baseTarget = [0, 1.1, 0]
  const baseOffset = [0, 1.8, 5.4]
  const baseDistance = Math.hypot(...baseOffset)
  const requiredDistance = 3.25 / (horizontalHalfTangent * 0.9)
  const distance = Math.max(baseDistance, requiredDistance)
  const direction = baseOffset.map(value => value / baseDistance)

  return {
    position: [
      baseTarget[0] + direction[0] * distance,
      baseTarget[1] + direction[1] * distance,
      baseTarget[2] + direction[2] * distance,
    ],
    target: baseTarget,
    distance,
    minDistance: distance * 0.86,
    maxDistance: distance * 1.28,
  }
}
