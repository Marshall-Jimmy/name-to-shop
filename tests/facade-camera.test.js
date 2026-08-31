import test from 'node:test'
import assert from 'node:assert/strict'

import { computeFacadeCameraPose, offsetFromFacade } from '../src/gen/facade-camera.js'

const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1]

for (const [label, front] of [
  ['axis-aligned facade', { mid: [0, 5], L: 10, theta: 0, normal: [0, 1] }],
  ['angled facade', { mid: [2, 3], L: 8, theta: Math.PI / 4, normal: [-Math.SQRT1_2, Math.SQRT1_2] }],
]) {
  test(`${label} hero camera stays in front of the entrance`, () => {
    const pose = computeFacadeCameraPose(front, { w: 12, d: 9 }, 7)
    const fromTarget = [pose.position.x - pose.target.x, pose.position.z - pose.target.z]
    const tangent = [Math.cos(front.theta), Math.sin(front.theta)]
    const outward = dot2(fromTarget, front.normal)
    const lateral = Math.abs(dot2(fromTarget, tangent))

    assert.ok(outward >= 9)
    assert.ok(lateral / outward <= 0.161)
    assert.ok(dot2([pose.target.x - front.mid[0], pose.target.z - front.mid[1]], front.normal) < 0)
  })
}

test('door offset follows both components of an angled facade normal', () => {
  const front = { mid: [3, 4], theta: Math.PI / 4, normal: [-Math.SQRT1_2, Math.SQRT1_2] }
  const onFacade = offsetFromFacade(front, 0, 0)
  const outside = offsetFromFacade(front, 0, 0.2)

  assert.ok(Math.abs((outside.x - onFacade.x) - front.normal[0] * 0.2) < 1e-9)
  assert.ok(Math.abs((outside.z - onFacade.z) - front.normal[1] * 0.2) < 1e-9)
})
