import { effectScope } from 'vue'

export function withSetup<T>(composable: () => T): [T, () => void] {
  const scope = effectScope()
  const result = scope.run(composable)!
  return [result, () => scope.stop()]
}
