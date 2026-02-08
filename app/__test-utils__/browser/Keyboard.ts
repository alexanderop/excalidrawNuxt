import { userEvent } from 'vitest/browser'

export class Keyboard {
  async press(key: string): Promise<void> {
    await userEvent.keyboard(key)
  }
}
