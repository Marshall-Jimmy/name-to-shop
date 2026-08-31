import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import '../src/gen/decor.js'
import { getGen } from '../src/gen/registry.js'

test('every configured egg decor effect resolves to a registered generator', async () => {
  const json = JSON.parse(await readFile(new URL('../src/data/eggs.json', import.meta.url), 'utf8'))
  const keys = [...new Set(json.eggs.flatMap(egg => egg.fx?.decor || []))]
  const missing = keys.filter(key => !getGen(`egg_${key}`))

  assert.deepEqual(missing, [])
})
