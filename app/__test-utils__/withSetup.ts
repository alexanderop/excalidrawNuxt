import { effectScope } from "vue";

export function withSetup<T extends object>(composable: () => T): T & Disposable {
  const scope = effectScope();
  const result = scope.run(composable)!;
  return Object.assign({}, result, {
    [Symbol.dispose]() {
      scope.stop();
    },
  });
}
