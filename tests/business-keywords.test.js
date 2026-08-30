import test from 'node:test'
import assert from 'node:assert/strict'

import { matchBusinessKeyword } from '../src/core/business-keywords.js'

test('specific shop keywords win over their generic substrings', () => {
  assert.equal(matchBusinessKeyword('猫猫咖啡'), 'catCafe')
  assert.equal(matchBusinessKeyword('猫咖'), 'catCafe')
  assert.equal(matchBusinessKeyword('魔法药水铺'), 'potion')
  assert.equal(matchBusinessKeyword('药水'), 'potion')
})

test('generic keywords still keep their original business mapping', () => {
  assert.equal(matchBusinessKeyword('咖啡骑士'), 'coffee')
  assert.equal(matchBusinessKeyword('感冒药店'), 'pharmacy')
  assert.equal(matchBusinessKeyword('深夜拉面'), 'ramen')
  assert.equal(matchBusinessKeyword('手工面馆'), 'noodle')
  assert.equal(matchBusinessKeyword('没有关键词'), null)
})
