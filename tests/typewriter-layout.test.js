import test from 'node:test'
import assert from 'node:assert/strict'

import { computeFunctionKeyLayout, computeTypingCameraPose, fitTextSize } from '../src/ui/typewriter-layout.js'

const KEYBOARD_WIDTH = 10 * 0.36 + 9 * 0.048

test('typewriter function keys fit the keyboard without overlap', () => {
  const keys = computeFunctionKeyLayout(KEYBOARD_WIDTH)
  const leftEdge = keys[0].x - keys[0].width / 2
  const last = keys.at(-1)
  const rightEdge = last.x + last.width / 2

  assert.ok(leftEdge >= -KEYBOARD_WIDTH / 2)
  assert.ok(rightEdge <= KEYBOARD_WIDTH / 2)
  for (let i = 1; i < keys.length; i++) {
    const previousRight = keys[i - 1].x + keys[i - 1].width / 2
    const currentLeft = keys[i].x - keys[i].width / 2
    assert.ok(currentLeft > previousRight)
  }
})

test('typewriter function layout retains all actions in order', () => {
  assert.deepEqual(
    computeFunctionKeyLayout(KEYBOARD_WIDTH).map(key => key.id),
    ['clear', 'back', 'dice', 'space'],
  )
})

test('portrait typing camera backs away enough to keep the physical computer in frame', () => {
  const desktop = computeTypingCameraPose(16 / 9)
  const portrait = computeTypingCameraPose(9 / 16)

  assert.ok(portrait.distance > desktop.distance * 2)
  assert.ok(portrait.minDistance < portrait.distance)
  assert.ok(portrait.maxDistance > portrait.distance)
})

test('display text size is based on measured width instead of character count', () => {
  const size = fitTextSize(candidate => candidate * 12, 720, { maxSize: 100, minSize: 40, step: 2 })
  assert.equal(size, 60)
})
