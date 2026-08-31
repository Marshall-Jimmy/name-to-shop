import test from 'node:test'
import assert from 'node:assert/strict'

import { computeFootprint } from '../src/gen/building.js'
import { insetPolygon, orientedBoxInPolygon, pointInPolygon } from '../src/gen/helpers.js'

const TYPES = ['rect', 'lshape', 'rounded', 'hexagon', 'trapezoid']

function orient(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}

function intersects(a, b, c, d) {
  const o1 = orient(a, b, c), o2 = orient(a, b, d)
  const o3 = orient(c, d, a), o4 = orient(c, d, b)
  return o1 * o2 < -1e-9 && o3 * o4 < -1e-9
}

function assertSimplePolygon(points, label) {
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === points.length - 1)) continue
      assert.equal(
        intersects(points[i], points[(i + 1) % points.length], points[j], points[(j + 1) % points.length]),
        false,
        `${label}: edges ${i} and ${j} intersect`,
      )
    }
  }
}

test('every random footprint is simple and its entrance leads inside', () => {
  for (const footprintType of TYPES) {
    for (let i = 0; i < 500; i++) {
      const fp = computeFootprint({ seed: `footprint-${footprintType}-${i}`, footprintType })
      assertSimplePolygon(fp.pts, `${footprintType}-${i}`)

      const inward = [-fp.front.normal[0], -fp.front.normal[1]]
      const inside = [fp.front.mid[0] + inward[0] * 1.2, fp.front.mid[1] + inward[1] * 1.2]
      assert.equal(pointInPolygon(inside[0], inside[1], fp.pts), true, `${footprintType}-${i}: entrance points outside`)
    }
  }
})

test('interior insets stay inside every convex and concave footprint', () => {
  for (const footprintType of TYPES) {
    for (let i = 0; i < 500; i++) {
      const fp = computeFootprint({ seed: `inset-${footprintType}-${i}`, footprintType })
      for (const distance of [0.3, 0.8]) {
        const inner = insetPolygon(fp.pts, distance)
        assertSimplePolygon(inner, `${footprintType}-${i}-inset-${distance}`)
        for (const [x, z] of inner) {
          assert.equal(pointInPolygon(x, z, fp.pts), true, `${footprintType}-${i}: inset escaped footprint`)
        }
      }
    }
  }
})

test('furniture footprint validation rejects wall and concave-notch overlaps', () => {
  const lShape = [[-5, -5], [5, -5], [5, 5], [0, 5], [0, 0], [-5, 0]]
  assert.equal(orientedBoxInPolygon(2.5, 2.5, 2, 2, 0, lShape, 0.1), true)
  assert.equal(orientedBoxInPolygon(1, 1, 4, 1, 0, lShape), false)
  assert.equal(orientedBoxInPolygon(4.5, -2, 2, 2, Math.PI / 4, lShape), false)
})
