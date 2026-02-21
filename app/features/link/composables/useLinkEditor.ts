import type { Ref, ShallowRef } from "vue";
import { ref, computed, watch, nextTick } from "vue";
import { onClickOutside } from "@vueuse/core";
import type { DrawVueContext, HistorySlice, DirtySlice, LinkSlice } from "@drawvue/core";
import { getElementBounds, mutateElement } from "@drawvue/core";
import { normalizeLink } from "../normalizeLink";

interface UseLinkEditorOptions {
  inputRef: Readonly<ShallowRef<HTMLInputElement | null>>;
  popoverRef: Readonly<ShallowRef<HTMLDivElement | null>>;
}

function requireSlice<T>(slice: Ref<T | null> | ShallowRef<T | null>, name: string): T {
  const val = slice.value;
  if (!val) throw new Error(`[LinkEditor] ${name} slice not available`);
  return val;
}

export function useLinkEditor(ctx: DrawVueContext, { inputRef, popoverRef }: UseLinkEditorOptions) {
  const findElement = ctx.elements.getElementById;
  const linkSlice = computed(() => ctx.link.value);
  const editingId = computed(() => linkSlice.value?.editingLinkElementId.value ?? null);

  const linkValue = ref("");

  const editingElement = computed(() => {
    const id = editingId.value;
    if (!id) return null;
    return findElement(id) ?? null;
  });

  const position = computed(() => {
    const el = editingElement.value;
    const vp = ctx.viewport.value;
    if (!el || !vp) return null;

    const [x1, y1, x2] = getElementBounds(el);
    const midX = (x1 + x2) / 2;
    const screenPos = vp.toScreen(midX, y1);

    return {
      x: screenPos[0],
      y: screenPos[1] - 12,
    };
  });

  const hasExistingLink = computed(() => Boolean(editingElement.value?.link));

  watch(editingId, async (id) => {
    if (!id) return;
    const el = findElement(id);
    linkValue.value = el?.link ?? "";
    await nextTick();
    inputRef.value?.focus();
    inputRef.value?.select();
  });

  function requireHistory(): HistorySlice {
    return requireSlice(ctx.history, "history");
  }

  function requireDirty(): DirtySlice {
    return requireSlice(ctx.dirty, "dirty");
  }

  function requireLink(): LinkSlice {
    return requireSlice(ctx.link, "link");
  }

  function saveAndClose(): void {
    const el = editingElement.value;
    if (!el) return;

    const normalized = normalizeLink(linkValue.value);
    const oldLink = el.link ?? "";

    if (normalized !== oldLink) {
      const history = requireHistory();
      const dirty = requireDirty();
      history.recordAction(() => {
        mutateElement(el, { link: normalized || null });
        dirty.markStaticDirty();
      });
    }

    requireLink().closeLinkEditor();
  }

  function removeLink(): void {
    const el = editingElement.value;
    if (!el) return;

    const history = requireHistory();
    const dirty = requireDirty();
    history.recordAction(() => {
      mutateElement(el, { link: null });
      dirty.markStaticDirty();
    });

    requireLink().closeLinkEditor();
  }

  function handleKeydown(e: KeyboardEvent): void {
    e.stopPropagation();

    if (e.key === "Enter") {
      e.preventDefault();
      saveAndClose();
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      requireLink().closeLinkEditor();
    }
  }

  onClickOutside(popoverRef, () => {
    if (!editingId.value) return;
    saveAndClose();
  });

  return {
    editingId,
    position,
    linkValue,
    hasExistingLink,
    saveAndClose,
    removeLink,
    handleKeydown,
  };
}
