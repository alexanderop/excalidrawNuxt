import { TestDrawVue, waitForPaint, API } from "~/__test-utils__/browser";
import { createElement, mutateElement, routeElbowArrow, pointFrom } from "@drawvue/core";
import type { ExcalidrawArrowElement } from "@drawvue/core";
import type { LocalPoint } from "@drawvue/core";

/** Check that every consecutive point pair differs in only x OR only y. */
function isOrthogonal(points: readonly (readonly [number, number])[]): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i]!;
    const [x2, y2] = points[i + 1]!;
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    if (dx > 0.5 && dy > 0.5) return false;
  }
  return true;
}

/** Create an elbowed arrow via createElement + mutateElement (arrow-specific props need mutation). */
function createElbowedArrow(
  x: number,
  y: number,
  endX: number,
  endY: number,
  extra: Record<string, unknown> = {},
): ExcalidrawArrowElement {
  const arrow = createElement("arrow", x, y);
  mutateElement(arrow, {
    elbowed: true,
    points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(endX - x, endY - y)],
    width: Math.abs(endX - x),
    height: Math.abs(endY - y),
    ...extra,
  });
  return arrow as ExcalidrawArrowElement;
}

describe("elbow arrow routing", () => {
  it("produces orthogonal segments", async () => {
    const td = await TestDrawVue.create();

    const arrow = createElbowedArrow(50, 50, 250, 150);
    API.h.addElement(arrow);
    await td.flush();

    routeElbowArrow(arrow, API.elements);
    await td.flush();

    expect(arrow.points.length).toBeGreaterThanOrEqual(2);
    expect(isOrthogonal(arrow.points)).toBe(true);
  });

  it("routes around rectangle obstacle", async () => {
    const td = await TestDrawVue.create();

    // Place obstacle in the middle
    const obstacle = createElement("rectangle", 100, 20, { width: 60, height: 80 });
    API.h.addElement(obstacle);

    const arrow = createElbowedArrow(30, 50, 230, 50);
    API.h.addElement(arrow);
    await td.flush();

    routeElbowArrow(arrow, API.elements);
    await td.flush();

    // Path should route around obstacle — more than 2 points
    expect(arrow.points.length).toBeGreaterThan(2);
    expect(isOrthogonal(arrow.points)).toBe(true);
  });

  it("no obstacles produces simple path", async () => {
    const td = await TestDrawVue.create();

    const arrow = createElbowedArrow(50, 50, 250, 150);
    API.h.addElement(arrow);
    await td.flush();

    routeElbowArrow(arrow, []);
    await td.flush();

    // Simple path with no obstacles: typically 3-5 points
    expect(arrow.points.length).toBeGreaterThanOrEqual(2);
    expect(arrow.points.length).toBeLessThanOrEqual(6);
    expect(isOrthogonal(arrow.points)).toBe(true);
  });

  it("bound elbowed arrow produces orthogonal path", async () => {
    const td = await TestDrawVue.create();

    const rect1 = createElement("rectangle", 50, 80, { width: 60, height: 60 });
    const rect2 = createElement("rectangle", 300, 80, { width: 60, height: 60 });
    API.h.addElement(rect1);
    API.h.addElement(rect2);

    const arrow = createElbowedArrow(110, 110, 300, 110, {
      startBinding: { elementId: rect1.id, focus: 0, gap: 5, fixedPoint: null },
      endBinding: { elementId: rect2.id, focus: 0, gap: 5, fixedPoint: null },
    });
    API.h.addElement(arrow);
    await td.flush();

    routeElbowArrow(arrow, API.elements);
    await td.flush();

    expect(arrow.points.length).toBeGreaterThanOrEqual(2);
    expect(isOrthogonal(arrow.points)).toBe(true);
  });

  it("moving bound shape triggers re-route", async () => {
    const td = await TestDrawVue.create();

    const rect = await td.createElement("rectangle", [2, 3], [4, 5]);
    const arrow = await td.createElement("arrow", [3, 4], [10, 4]);
    const arrowEl = arrow.get() as ExcalidrawArrowElement;

    const pointsBefore = arrowEl.points.map(([px, py]) => [px, py]);

    // Drag the rectangle
    await td.clickElement(td.getElement(rect.id));
    await td.drag([3, 4], [3, 7]);
    await waitForPaint();

    const arrowAfter = arrow.get() as ExcalidrawArrowElement;
    const pointsAfter = arrowAfter.points;

    const pointsChanged =
      pointsAfter.length !== pointsBefore.length ||
      pointsAfter.some((pt, i) => {
        const before = pointsBefore[i];
        if (!before) return true;
        return Math.abs(pt[0] - before[0]!) > 1 || Math.abs(pt[1] - before[1]!) > 1;
      });
    expect(pointsChanged).toBe(true);
  });
});
