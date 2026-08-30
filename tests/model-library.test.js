import test from 'node:test'
import assert from 'node:assert/strict'

import { findAssetModel } from '../src/assets/model-library.js'

test('decor can resolve both furniture and nature models from the loaded asset library', () => {
  const chair = { id: 'chair' }
  const tree = { id: 'tree' }
  const legacy = { id: 'legacy' }
  const assets = {
    models: {
      furniture: { chair },
      nature: { tree_small: tree },
      legacy,
    },
  }

  assert.equal(findAssetModel(assets, 'chair'), chair)
  assert.equal(findAssetModel(assets, 'tree_small'), tree)
  assert.equal(findAssetModel(assets, 'legacy'), legacy)
  assert.equal(findAssetModel(assets, 'missing'), null)
})
