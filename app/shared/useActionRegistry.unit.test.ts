import { useActionRegistry, type ActionDefinition, type ActionId } from "./useActionRegistry";

/** Cast a test-only string to ActionId — avoids repeating `as ActionId` everywhere. */
const id = (s: string): ActionId => s as ActionId;

function makeAction(overrides: Partial<ActionDefinition> = {}): ActionDefinition {
  return {
    id: id("test:action"),
    label: "Test Action",
    icon: "i-lucide-check",
    handler: vi.fn(),
    ...overrides,
  };
}

describe("useActionRegistry", () => {
  it("registers and retrieves actions", () => {
    const { register, get } = useActionRegistry();
    const action = makeAction({ id: id("reg:test-1") });
    register([action]);

    expect(get(id("reg:test-1"))).toBe(action);
  });

  it("returns undefined for unregistered IDs", () => {
    const { get } = useActionRegistry();
    expect(get(id("nonexistent:xyz"))).toBeUndefined();
  });

  it("executes a registered action handler", () => {
    const { register, execute } = useActionRegistry();
    const handler = vi.fn();
    register([makeAction({ id: id("exec:test-1"), handler })]);

    execute(id("exec:test-1"));

    expect(handler).toHaveBeenCalledOnce();
  });

  it("does nothing when executing an unregistered ID", () => {
    const { execute } = useActionRegistry();
    expect(() => execute(id("missing:action"))).not.toThrow();
  });

  it("skips handler when enabled() returns false", () => {
    const { register, execute } = useActionRegistry();
    const handler = vi.fn();
    register([makeAction({ id: id("guard:test-1"), handler, enabled: () => false })]);

    execute(id("guard:test-1"));

    expect(handler).not.toHaveBeenCalled();
  });

  it("calls handler when enabled() returns true", () => {
    const { register, execute } = useActionRegistry();
    const handler = vi.fn();
    register([makeAction({ id: id("guard:test-2"), handler, enabled: () => true })]);

    execute(id("guard:test-2"));

    expect(handler).toHaveBeenCalledOnce();
  });

  it("isEnabled returns true when no enabled predicate", () => {
    const { register, isEnabled } = useActionRegistry();
    register([makeAction({ id: id("enabled:test-1") })]);

    expect(isEnabled(id("enabled:test-1"))).toBe(true);
  });

  it("isEnabled returns false for unregistered ID", () => {
    const { isEnabled } = useActionRegistry();
    expect(isEnabled(id("enabled:missing"))).toBe(false);
  });

  it("isEnabled reflects the enabled predicate", () => {
    const { register, isEnabled } = useActionRegistry();
    let flag = false;
    register([makeAction({ id: id("enabled:test-2"), enabled: () => flag })]);

    expect(isEnabled(id("enabled:test-2"))).toBe(false);

    flag = true;
    expect(isEnabled(id("enabled:test-2"))).toBe(true);
  });

  it("overwrites existing action on re-register", () => {
    const { register, get } = useActionRegistry();
    const first = makeAction({ id: id("overwrite:test") });
    const second = makeAction({ id: id("overwrite:test"), label: "Updated" });

    register([first]);
    register([second]);

    expect(get(id("overwrite:test"))!.label).toBe("Updated");
  });
});
