function noop(): void {}

interface DirtyFlagImpl {
  markStaticDirty: () => void;
  markInteractiveDirty: () => void;
  markNewElementDirty: () => void;
}

export interface DirtyFlags {
  markStaticDirty: () => void;
  markInteractiveDirty: () => void;
  markNewElementDirty: () => void;
  bind: (impl: DirtyFlagImpl) => void;
}

export function createDirtyFlags(): DirtyFlags {
  let _static = noop;
  let _interactive = noop;
  let _newElement = noop;

  return {
    markStaticDirty: () => _static(),
    markInteractiveDirty: () => _interactive(),
    markNewElementDirty: () => _newElement(),
    bind(impl: DirtyFlagImpl) {
      _static = impl.markStaticDirty;
      _interactive = impl.markInteractiveDirty;
      _newElement = impl.markNewElementDirty;
    },
  };
}
