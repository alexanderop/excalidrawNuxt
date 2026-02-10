import { userEvent } from 'vitest/browser'
import type { ModifierKeys } from './Pointer'

export class Keyboard {
  async press(key: string): Promise<void> {
    await userEvent.keyboard(key)
  }

  /** Modifier key context (Excalidraw pattern). */
  async withModifierKeys(mods: ModifierKeys, fn: () => Promise<void>): Promise<void> {
    const keys: Array<{ down: string; up: string }> = []
    if (mods.shiftKey) keys.push({ down: '{Shift>}', up: '{/Shift}' })
    if (mods.ctrlKey) keys.push({ down: '{Control>}', up: '{/Control}' })
    if (mods.altKey) keys.push({ down: '{Alt>}', up: '{/Alt}' })
    if (mods.metaKey) keys.push({ down: '{Meta>}', up: '{/Meta}' })

    for (const key of keys) await userEvent.keyboard(key.down)
    await fn()
    for (const key of keys.toReversed()) await userEvent.keyboard(key.up)
  }

  async undo(): Promise<void> {
    await userEvent.keyboard('{Control>}z{/Control}')
  }

  async redo(): Promise<void> {
    await userEvent.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
  }
}
