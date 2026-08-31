const EPSILON = 1e-6

function normalizedFront(front) {
  const length = Math.hypot(front.normal[0], front.normal[1])
  if (length < EPSILON) throw new Error('Front normal must not be zero')

  return {
    normal: [front.normal[0] / length, front.normal[1] / length],
    tangent: [Math.cos(front.theta), Math.sin(front.theta)],
  }
}

export function offsetFromFacade(front, along, outward) {
  const { normal, tangent } = normalizedFront(front)
  return {
    x: front.mid[0] + tangent[0] * along + normal[0] * outward,
    z: front.mid[1] + tangent[1] * along + normal[1] * outward,
  }
}

export function computeFacadeCameraPose(front, bbox, topY) {
  const { normal, tangent } = normalizedFront(front)
  const distance = Math.max(9, bbox.d * 0.9 + 5, front.L * 0.72 + 4, topY * 1.1 + 3)
  const lateral = Math.min(front.L * 0.16, distance * 0.16)
  const targetInset = 0.55
  const target = {
    x: front.mid[0] - normal[0] * targetInset,
    y: topY * 0.44,
    z: front.mid[1] - normal[1] * targetInset,
  }

  return {
    position: {
      x: target.x + normal[0] * distance + tangent[0] * lateral,
      y: topY * 0.62 + 1.2,
      z: target.z + normal[1] * distance + tangent[1] * lateral,
    },
    target,
  }
}
