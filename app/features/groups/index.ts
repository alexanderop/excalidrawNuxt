export {
  getElementsInGroup,
  isElementInGroup,
  getOutermostGroupId,
  addToGroup,
  removeFromGroups,
  expandSelectionToGroups,
  isSelectedViaGroup,
  elementsAreInSameGroup,
  reorderElementsForGroup,
  cleanupAfterDelete,
} from "./groupUtils";

export type { GroupExpansionResult } from "./groupUtils";
export type { GroupId } from "./types";
