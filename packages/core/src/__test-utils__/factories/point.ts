import { pointFrom } from "../../shared/math";
import type { GlobalPoint, LocalPoint } from "../../shared/math";

export function createTestPoint(x = 0, y = 0): GlobalPoint {
  return pointFrom<GlobalPoint>(x, y);
}

export function createTestLocalPoint(x = 0, y = 0): LocalPoint {
  return pointFrom<LocalPoint>(x, y);
}
