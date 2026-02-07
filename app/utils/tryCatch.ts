export type Result<T> = [Error, null] | [null, T]

export async function tryCatch<T>(promise: Promise<T>): Promise<Result<T>> {
  return promise
    .then<[null, T]>((data) => [null, data])
    .catch<[Error, null]>((error: unknown) => [
      error instanceof Error ? error : new Error(String(error)),
      null,
    ])
}

export function tryCatchSync<T>(fn: () => T): Result<T> {
  let result: T
  // eslint-disable-next-line no-restricted-syntax -- tryCatch utility itself needs try/catch
  try {
    result = fn()
  }
  catch (caughtError: unknown) {
    return [
      caughtError instanceof Error ? caughtError : new Error(String(caughtError)),
      null,
    ]
  }

  return [null, result]
}
