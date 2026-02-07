function noop() {}

interface DirtyFlagImpl {
  markStaticDirty: () => void
  markInteractiveDirty: () => void
  markNewElementDirty: () => void
}

export function createDirtyFlags() {
  let _static = noop
  let _interactive = noop
  let _newElement = noop

  return {
    markStaticDirty: () => _static(),
    markInteractiveDirty: () => _interactive(),
    markNewElementDirty: () => _newElement(),
    bind(impl: DirtyFlagImpl) {
      _static = impl.markStaticDirty
      _interactive = impl.markInteractiveDirty
      _newElement = impl.markNewElementDirty
    },
  }
}
