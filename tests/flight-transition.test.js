import test from 'node:test'
import assert from 'node:assert/strict'

import { flightAmplitudeAt } from '../src/core/flight-transition.js'

test('landing continues from the current altitude instead of jumping to full height', () => {
  const current = 0.08
  const samples = [0, 0.1, 0.25, 0.5, 0.75, 1].map(t => flightAmplitudeAt(current, 0, t))

  assert.equal(samples[0], current)
  assert.equal(samples.at(-1), 0)
  assert.ok(samples.every(value => value >= 0 && value <= current))
  assert.ok(samples.every((value, index) => index === 0 || value <= samples[index - 1]))
})

test('takeoff continues from the current altitude without a reset', () => {
  assert.equal(flightAmplitudeAt(0.35, 1, 0), 0.35)
  assert.equal(flightAmplitudeAt(0.35, 1, 1), 1)
})
