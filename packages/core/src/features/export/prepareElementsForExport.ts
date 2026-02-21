import type { ExcalidrawElement } from "../elements/types";

function expandBoundIds(el: ExcalidrawElement, ids: Set<string>): void {
  // Add bound text elements (only type "text", not arrows)
  if (el.boundElements) {
    for (const bound of el.boundElements) {
      if (bound.type === "text") {
        ids.add(bound.id);
      }
    }
  }

  // If this is a text element with a container, add the container
  if (el.type === "text" && el.containerId) {
    ids.add(el.containerId);
  }
}

/**
 * Prepares elements for export by filtering based on selection and expanding
 * to include bound text elements and their containers.
 */
export function prepareElementsForExport(
  elements: readonly ExcalidrawElement[],
  selectedIds: ReadonlySet<string> | null,
): ExcalidrawElement[] {
  // When selectedIds is null or empty → return all non-deleted elements
  if (!selectedIds || selectedIds.size === 0) {
    return elements.filter((el) => !el.isDeleted);
  }

  // Build a map for O(1) lookup
  const elementMap = new Map<string, ExcalidrawElement>(elements.map((el) => [el.id, el]));

  // Build expanded ID set: start with selected, then add bound text + containers
  const expandedIds = new Set(selectedIds);

  for (const id of selectedIds) {
    const el = elementMap.get(id);
    if (!el) continue;
    expandBoundIds(el, expandedIds);
  }

  return elements.filter((el) => expandedIds.has(el.id) && !el.isDeleted);
}
