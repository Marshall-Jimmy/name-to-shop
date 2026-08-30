import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveTypingKeyboardInput } from '../src/ui/typewriter-input.js'

test('hardware keyboard controls the physical typewriter when no editor has focus', () => {
  assert.deepEqual(resolveTypingKeyboardInput({ key: 'A' }), { type: 'character', value: 'A' })
  assert.deepEqual(resolveTypingKeyboardInput({ key: ' ' }), { type: 'character', value: ' ' })
  assert.deepEqual(resolveTypingKeyboardInput({ key: 'Backspace' }), { type: 'backspace' })
  assert.deepEqual(resolveTypingKeyboardInput({ key: 'Enter' }), { type: 'confirm' })
})

test('hardware shortcuts and editable DOM fields retain their native behavior', () => {
  assert.equal(resolveTypingKeyboardInput({ key: 'A', ctrlKey: true }), null)
  assert.equal(resolveTypingKeyboardInput({ key: 'A', editable: true }), null)
  assert.equal(resolveTypingKeyboardInput({ key: 'ArrowLeft' }), null)
})
