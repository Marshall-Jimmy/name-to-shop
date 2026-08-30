import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const hudSource = await readFile(new URL('../src/ui/hud.js', import.meta.url), 'utf8')

test('long shop titles are constrained inside the top card', () => {
  assert.match(hudSource, /\.nts-top > div:last-child\s*\{[^}]*min-width:\s*0/s)
  assert.match(hudSource, /\.nts-top \.nm\s*\{[^}]*white-space:\s*nowrap[^}]*overflow:\s*hidden[^}]*text-overflow:\s*ellipsis/s)
})

test('small screens use a five-column dock instead of a four-row shrink-to-fit dock', () => {
  assert.match(hudSource, /@media \(max-width: 640px\)[\s\S]*?\.nts-dock\s*\{[^}]*width:\s*min\(360px,\s*calc\(100vw - 16px\)\)[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(hudSource, /@media \(max-width: 640px\)[\s\S]*?\.nts-dock \.sep\s*\{[^}]*display:\s*none/)
})

test('small-screen toasts sit below the shop title card', () => {
  assert.match(hudSource, /@media \(max-width: 640px\)[\s\S]*?\.nts-toasts\s*\{[^}]*top:\s*calc\(env\(safe-area-inset-top,\s*0px\) \+ 104px\)/)
})

test('typing input stays above the physical function keys', () => {
  assert.match(hudSource, /\.nts-input\s*\{[^}]*top:\s*calc\(env\(safe-area-inset-top,\s*0px\) \+ 126px\)/s)
  assert.match(hudSource, /@media \(max-height: 560px\) and \(min-width: 641px\)[\s\S]*?\.nts-input\s*\{[^}]*left:\s*14px[^}]*top:\s*calc\(env\(safe-area-inset-top,\s*0px\) \+ 14px\)/)
})
