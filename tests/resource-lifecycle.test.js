import test from 'node:test'
import assert from 'node:assert/strict'

import { disposeObject } from '../src/gen/helpers.js'

function resource({ keep = false } = {}) {
  return {
    count: 0,
    userData: keep ? { keep: true } : {},
    dispose() { this.count++ },
  }
}

function rootOf(...nodes) {
  return { traverse(visitor) { nodes.forEach(visitor) } }
}

test('shared persistent asset resources are never disposed with a generated shop', () => {
  const geometry = resource({ keep: true })
  const map = resource({ keep: true })
  const material = { ...resource({ keep: true }), map }

  disposeObject(rootOf({ geometry, material }))

  assert.equal(geometry.count, 0)
  assert.equal(material.count, 0)
  assert.equal(map.count, 0)
})

test('owned resources shared by several meshes are disposed exactly once', () => {
  const geometry = resource()
  const map = resource()
  const material = { ...resource(), map }
  const mesh = { geometry, material }

  disposeObject(rootOf(mesh, mesh))

  assert.equal(geometry.count, 1)
  assert.equal(material.count, 1)
  assert.equal(map.count, 1)
})

test('cache-owned textures are released by the cache, not by each material', () => {
  const geometry = resource()
  const map = resource()
  map.userData.cacheOwned = true
  const material = { ...resource(), map }

  disposeObject(rootOf({ geometry, material }))

  assert.equal(geometry.count, 1)
  assert.equal(material.count, 1)
  assert.equal(map.count, 0)
})
