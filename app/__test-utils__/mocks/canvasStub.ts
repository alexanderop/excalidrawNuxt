export function createCanvasStub(): HTMLCanvasElement {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test stub requires casting
  return {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
  } as unknown as HTMLCanvasElement
}
