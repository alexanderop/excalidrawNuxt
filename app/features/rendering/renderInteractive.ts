import type { ExcalidrawElement, ExcalidrawLinearElement } from "~/features/elements/types";
import { isLinearElement } from "~/features/elements/types";
import type { GlobalPoint } from "~/shared/math";
import type { Theme } from "~/features/theme/types";
import {
  SELECTION_COLORS,
  SELECTION_LINE_WIDTH,
  SELECTION_PADDING,
} from "~/features/selection/constants";
import { getTransformHandles } from "~/features/selection/transformHandles";
import type { TransformHandles } from "~/features/selection/transformHandles";
import {
  renderRubberBand,
  renderPointHandles,
  renderMidpointIndicator,
} from "~/features/linear-editor/renderLinearEditor";
import { renderSuggestedBinding } from "~/features/binding/renderBindingHighlight";
import { getCommonBounds, getElementBounds } from "~/features/selection/bounds";

export interface LinearEditorRenderState {
  element: ExcalidrawLinearElement;
  selectedPointIndices: ReadonlySet<number>;
  hoveredMidpointIndex: number | null;
}

export interface MultiPointRenderState {
  element: ExcalidrawLinearElement;
  cursorPoint: GlobalPoint;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function applySelectionStroke(ctx: CanvasRenderingContext2D, zoom: number, theme: Theme): void {
  ctx.strokeStyle = SELECTION_COLORS[theme].selection;
  ctx.lineWidth = SELECTION_LINE_WIDTH / zoom;
  ctx.setLineDash([8 / zoom, 4 / zoom]);
}

function renderLinearSelectionBorder(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawLinearElement,
  zoom: number,
  theme: Theme,
): void {
  const padding = SELECTION_PADDING / zoom;
  const [x1, y1, x2, y2] = getElementBounds(element);

  ctx.save();
  applySelectionStroke(ctx, zoom, theme);
  ctx.strokeRect(x1 - padding, y1 - padding, x2 - x1 + 2 * padding, y2 - y1 + 2 * padding);
  ctx.restore();
}

export function renderSelectionBorder(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement,
  zoom: number,
  theme: Theme,
): void {
  if (isLinearElement(element)) {
    renderLinearSelectionBorder(ctx, element, zoom, theme);
    return;
  }

  const padding = SELECTION_PADDING / zoom;

  ctx.save();
  applySelectionStroke(ctx, zoom, theme);

  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;

  ctx.translate(cx, cy);
  ctx.rotate(element.angle);

  ctx.strokeRect(
    -element.width / 2 - padding,
    -element.height / 2 - padding,
    element.width + padding * 2,
    element.height + padding * 2,
  );

  ctx.restore();
}

function renderGroupSelectionBorder(
  ctx: CanvasRenderingContext2D,
  groupElements: readonly ExcalidrawElement[],
  zoom: number,
  theme: Theme,
): void {
  const bounds = getCommonBounds(groupElements);
  if (!bounds) return;

  const [x1, y1, x2, y2] = bounds;
  const padding = SELECTION_PADDING / zoom;

  ctx.save();
  applySelectionStroke(ctx, zoom, theme);
  ctx.strokeRect(x1 - padding, y1 - padding, x2 - x1 + 2 * padding, y2 - y1 + 2 * padding);
  ctx.restore();
}

function traceHandlePath(
  ctx: CanvasRenderingContext2D,
  type: string,
  x: number,
  y: number,
  w: number,
  h: number,
  cornerRadius: number,
): void {
  ctx.beginPath();
  if (type === "rotation") {
    ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
    return;
  }
  ctx.roundRect(x, y, w, h, cornerRadius);
}

export function renderTransformHandles(
  ctx: CanvasRenderingContext2D,
  handles: TransformHandles,
  zoom: number,
  theme: Theme,
): void {
  const lineWidth = 1 / zoom;
  const cornerRadius = 2 / zoom;
  const colors = SELECTION_COLORS[theme];

  ctx.save();
  ctx.fillStyle = colors.handleFill;
  ctx.strokeStyle = colors.handleStroke;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([]);

  for (const [type, handle] of Object.entries(handles)) {
    if (!handle) continue;
    const [x, y, w, h] = handle;
    traceHandlePath(ctx, type, x, y, w, h, cornerRadius);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

export function renderSelectionBox(
  ctx: CanvasRenderingContext2D,
  box: Box,
  zoom: number,
  theme: Theme,
): void {
  const colors = SELECTION_COLORS[theme];

  ctx.save();
  ctx.fillStyle = colors.selectionFill;
  ctx.strokeStyle = colors.selection;
  ctx.lineWidth = 1 / zoom;
  ctx.setLineDash([]);

  ctx.fillRect(box.x, box.y, box.width, box.height);
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.restore();
}

function isElementInSelectedGroup(
  element: ExcalidrawElement,
  selectedGroupIds: ReadonlySet<string> | undefined,
): boolean {
  if (!selectedGroupIds) return false;
  return element.groupIds.some((gid) => selectedGroupIds.has(gid));
}

function renderSelectedElements(
  ctx: CanvasRenderingContext2D,
  selectedElements: readonly ExcalidrawElement[],
  zoom: number,
  linearEditorState: LinearEditorRenderState | null | undefined,
  selectedGroupIds: ReadonlySet<string> | undefined,
  theme: Theme,
): void {
  for (const el of selectedElements) {
    if (linearEditorState && el.id === linearEditorState.element.id) continue;
    if (isElementInSelectedGroup(el, selectedGroupIds)) continue;
    renderSelectionBorder(ctx, el, zoom, theme);
    renderTransformHandles(ctx, getTransformHandles(el, zoom), zoom, theme);
  }

  if (!selectedGroupIds || selectedGroupIds.size === 0) return;
  for (const groupId of selectedGroupIds) {
    const groupElements = selectedElements.filter((el) => el.groupIds.includes(groupId));
    renderGroupSelectionBorder(ctx, groupElements, zoom, theme);
  }
}

function renderLinearEditorOverlays(
  ctx: CanvasRenderingContext2D,
  state: LinearEditorRenderState,
  zoom: number,
  theme: Theme,
): void {
  renderSelectionBorder(ctx, state.element, zoom, theme);
  renderPointHandles(ctx, state.element, state.selectedPointIndices, zoom, theme);
  if (state.hoveredMidpointIndex !== null) {
    renderMidpointIndicator(ctx, state.element, state.hoveredMidpointIndex, zoom, theme);
  }
}

export interface InteractiveSceneOptions {
  ctx: CanvasRenderingContext2D;
  selectedElements: readonly ExcalidrawElement[];
  zoom: number;
  selectionBox: Box | null;
  theme: Theme;
  linearEditorState?: LinearEditorRenderState | null;
  multiPointState?: MultiPointRenderState | null;
  suggestedBindings?: readonly ExcalidrawElement[] | null;
  selectedGroupIds?: ReadonlySet<string>;
}

export function renderInteractiveScene(options: InteractiveSceneOptions): void {
  const {
    ctx,
    selectedElements,
    zoom,
    selectionBox,
    theme,
    linearEditorState,
    multiPointState,
    suggestedBindings,
    selectedGroupIds,
  } = options;

  if (suggestedBindings) {
    for (const el of suggestedBindings) {
      renderSuggestedBinding(ctx, el, zoom, theme);
    }
  }

  renderSelectedElements(ctx, selectedElements, zoom, linearEditorState, selectedGroupIds, theme);

  if (selectionBox) {
    renderSelectionBox(ctx, selectionBox, zoom, theme);
  }

  if (linearEditorState) {
    renderLinearEditorOverlays(ctx, linearEditorState, zoom, theme);
  }

  if (multiPointState) {
    renderRubberBand(ctx, multiPointState.element, multiPointState.cursorPoint, zoom, theme);
  }
}
