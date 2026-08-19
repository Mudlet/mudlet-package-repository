/**
 * Mudlet stores key bindings as raw Qt enum values (Qt::Key in <keyCode> and
 * Qt::KeyboardModifiers in <keyModifier>), so 16777275 / 67108864 has to be
 * turned back into something a reader recognises - "Ctrl+F12".
 */

// Qt::KeyboardModifier, in the order they are conventionally written.
const MODIFIERS: [number, string][] = [
  [0x04000000, 'Ctrl'],
  [0x08000000, 'Alt'],
  [0x02000000, 'Shift'],
  [0x10000000, 'Meta'],
  [0x20000000, 'Keypad'],
]

// Qt::Key values that are not simply their character.
const NAMED_KEYS: Record<number, string> = {
  0x01000000: 'Esc',
  0x01000001: 'Tab',
  0x01000002: 'Backtab',
  0x01000003: 'Backspace',
  0x01000004: 'Return',
  0x01000005: 'Enter',
  0x01000006: 'Insert',
  0x01000007: 'Delete',
  0x01000008: 'Pause',
  0x01000009: 'Print',
  0x0100000a: 'SysReq',
  0x0100000b: 'Clear',
  0x01000010: 'Home',
  0x01000011: 'End',
  0x01000012: 'Left',
  0x01000013: 'Up',
  0x01000014: 'Right',
  0x01000015: 'Down',
  0x01000016: 'PageUp',
  0x01000017: 'PageDown',
  0x01000020: 'Shift',
  0x01000021: 'Ctrl',
  0x01000022: 'Meta',
  0x01000023: 'Alt',
  0x01000024: 'CapsLock',
  0x01000025: 'NumLock',
  0x01000026: 'ScrollLock',
  0x01000055: 'Menu',
  0x01001103: 'AltGr',
  0x20: 'Space',
}

const F1 = 0x01000030
const F35 = 0x01000052

function keyName(keyCode: number): string | null {
  if (NAMED_KEYS[keyCode]) return NAMED_KEYS[keyCode]
  if (keyCode >= F1 && keyCode <= F35) return `F${keyCode - F1 + 1}`
  // Printable ASCII is stored as the character's own code point.
  if (keyCode > 0x20 && keyCode < 0x7f) return String.fromCharCode(keyCode).toUpperCase()
  return null
}

/** "Ctrl+F12", or null when the binding is unset or unrecognised. */
export function describeKeyCombination(
  keyCode: string | number | null,
  keyModifier: string | number | null
): string | null {
  const code = Number(keyCode)
  const modifiers = Number(keyModifier)
  if (!Number.isFinite(code) || code <= 0) return null

  const parts = MODIFIERS.filter(([flag]) => Number.isFinite(modifiers) && (modifiers & flag) === flag).map(
    ([, name]) => name
  )

  const name = keyName(code)
  if (!name) return parts.length ? `${parts.join('+')}+key ${code}` : null

  return [...parts, name].join('+')
}
