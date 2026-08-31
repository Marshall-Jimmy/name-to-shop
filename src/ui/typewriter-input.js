export function resolveTypingKeyboardInput({ key, altKey = false, ctrlKey = false, metaKey = false, editable = false }) {
  if (editable || altKey || ctrlKey || metaKey) return null
  if (key === 'Enter') return { type: 'confirm' }
  if (key === 'Backspace') return { type: 'backspace' }
  if (key === ' ') return { type: 'character', value: ' ' }
  if (typeof key === 'string' && key.length === 1) return { type: 'character', value: key }
  return null
}
