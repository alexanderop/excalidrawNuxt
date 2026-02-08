import type { ExcalidrawElement, GroupId } from '~/features/elements/types'
import { mutateElement } from '~/features/elements/mutateElement'

export interface GroupExpansionResult {
  elementIds: ReadonlySet<string>
  groupIds: ReadonlySet<GroupId>
}

export function getElementsInGroup(
  elements: readonly ExcalidrawElement[],
  groupId: GroupId,
): ExcalidrawElement[] {
  return elements.filter(el => el.groupIds.includes(groupId))
}

export function isElementInGroup(
  element: ExcalidrawElement,
  groupId: GroupId,
): boolean {
  return element.groupIds.includes(groupId)
}

export function getOutermostGroupId(element: ExcalidrawElement): GroupId | null {
  return element.groupIds.at(-1) ?? null
}

export function addToGroup(
  prevGroupIds: readonly GroupId[],
  newGroupId: GroupId,
): readonly GroupId[] {
  return [...prevGroupIds, newGroupId]
}

export function removeFromGroups(
  groupIds: readonly GroupId[],
  groupIdsToRemove: ReadonlySet<GroupId>,
): readonly GroupId[] {
  return groupIds.filter(id => !groupIdsToRemove.has(id))
}

export function expandSelectionToGroups(
  elements: readonly ExcalidrawElement[],
  selectedElementIds: ReadonlySet<string>,
): GroupExpansionResult {
  const expandedIds = new Set<string>(selectedElementIds)
  const activeGroupIds = new Set<GroupId>()

  for (const el of elements) {
    if (!selectedElementIds.has(el.id)) continue
    const groupId = getOutermostGroupId(el)
    if (!groupId) continue
    activeGroupIds.add(groupId)
  }

  for (const el of elements) {
    if (el.isDeleted) continue
    const groupId = getOutermostGroupId(el)
    if (groupId && activeGroupIds.has(groupId)) {
      expandedIds.add(el.id)
    }
  }

  return { elementIds: expandedIds, groupIds: activeGroupIds }
}

export function isSelectedViaGroup(
  element: ExcalidrawElement,
  selectedGroupIds: ReadonlySet<GroupId>,
): boolean {
  return element.groupIds.some(id => selectedGroupIds.has(id))
}

export function elementsAreInSameGroup(
  elements: readonly ExcalidrawElement[],
): boolean {
  if (elements.length < 2) return false

  const first = elements[0]
  if (!first || first.groupIds.length === 0) return false

  return first.groupIds.some(groupId =>
    elements.every(el => el.groupIds.includes(groupId)),
  )
}

export function reorderElementsForGroup(
  elements: readonly ExcalidrawElement[],
  groupElementIds: ReadonlySet<string>,
): readonly ExcalidrawElement[] {
  let highestIndex = -1
  for (const [i, el] of elements.entries()) {
    if (el && groupElementIds.has(el.id)) {
      highestIndex = i
    }
  }

  if (highestIndex === -1) return elements

  const nonGroup: ExcalidrawElement[] = []
  const group: ExcalidrawElement[] = []

  for (const el of elements) {
    if (groupElementIds.has(el.id)) {
      group.push(el)
      continue
    }
    nonGroup.push(el)
  }

  // Insert group elements at the position of the topmost member
  // Count how many non-group elements come before the highest index
  let nonGroupBefore = 0
  for (let i = 0; i <= highestIndex; i++) {
    const el = elements[i]
    if (el && !groupElementIds.has(el.id)) {
      nonGroupBefore++
    }
  }

  return [
    ...nonGroup.slice(0, nonGroupBefore),
    ...group,
    ...nonGroup.slice(nonGroupBefore),
  ]
}

function isActiveElement(el: ExcalidrawElement, deletedIds: ReadonlySet<string>): boolean {
  return !deletedIds.has(el.id) && !el.isDeleted
}

function findOrphanGroups(
  elements: readonly ExcalidrawElement[],
  deletedIds: ReadonlySet<string>,
): ReadonlySet<GroupId> {
  const groupMemberCounts = new Map<GroupId, number>()

  for (const el of elements) {
    if (!isActiveElement(el, deletedIds)) continue
    for (const groupId of el.groupIds) {
      groupMemberCounts.set(groupId, (groupMemberCounts.get(groupId) ?? 0) + 1)
    }
  }

  const orphans = new Set<GroupId>()
  for (const [groupId, count] of groupMemberCounts) {
    if (count < 2) orphans.add(groupId)
  }
  return orphans
}

export function cleanupAfterDelete(
  elements: readonly ExcalidrawElement[],
  deletedIds: ReadonlySet<string>,
): void {
  const groupsToRemove = findOrphanGroups(elements, deletedIds)
  if (groupsToRemove.size === 0) return

  for (const el of elements) {
    if (!isActiveElement(el, deletedIds)) continue
    if (!el.groupIds.some(id => groupsToRemove.has(id))) continue
    mutateElement(el, {
      groupIds: removeFromGroups(el.groupIds, groupsToRemove),
    })
  }
}
