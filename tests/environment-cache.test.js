import test from 'node:test'
import assert from 'node:assert/strict'

import { getCachedEnvironment } from '../src/scene/environment-cache.js'

test('an environment preset is created once and then reused', () => {
  const cache = new Map()
  let builds = 0
  const create = () => ({ build: ++builds })

  const first = getCachedEnvironment(cache, 'dusk', create)
  const second = getCachedEnvironment(cache, 'dusk', create)

  assert.equal(first, second)
  assert.equal(builds, 1)
})

test('different lighting presets keep separate environments', () => {
  const cache = new Map()
  const dusk = getCachedEnvironment(cache, 'dusk', () => ({ id: 'dusk' }))
  const night = getCachedEnvironment(cache, 'night', () => ({ id: 'night' }))

  assert.notEqual(dusk, night)
  assert.equal(cache.size, 2)
})
