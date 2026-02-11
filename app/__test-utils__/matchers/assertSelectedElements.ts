import { expect } from "vitest";
import { API } from "../browser/api";

export function assertSelectedElements(...ids: string[]): void {
  const selected = API.getSelectedElements().map((e) => e.id);
  expect(selected.length).toBe(ids.length);
  expect(selected.toSorted()).toEqual([...ids].toSorted());
}
