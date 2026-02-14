import { withDrawVue } from "../../../__test-utils__/withDrawVue";
import type { ActionDefinition } from "../../../shared/useActionRegistry";
import { useContextMenu } from "./useContextMenu";

function registerTestActions(ctx: ReturnType<typeof withDrawVue>): void {
  const { register } = ctx.drawVue.actionRegistry;
  const actions: ActionDefinition[] = [
    {
      id: "clipboard:cut",
      label: "Cut",
      icon: "i-lucide-scissors",
      kbds: ["meta", "X"],
      handler: vi.fn(),
    },
    {
      id: "clipboard:copy",
      label: "Copy",
      icon: "i-lucide-copy",
      kbds: ["meta", "C"],
      handler: vi.fn(),
    },
    {
      id: "clipboard:paste",
      label: "Paste",
      icon: "i-lucide-clipboard",
      kbds: ["meta", "V"],
      handler: vi.fn(),
    },
    {
      id: "style:copy-styles",
      label: "Copy styles",
      icon: "i-lucide-paintbrush",
      kbds: ["meta", "alt", "C"],
      handler: vi.fn(),
    },
    {
      id: "style:paste-styles",
      label: "Paste styles",
      icon: "i-lucide-clipboard-paste",
      kbds: ["meta", "alt", "V"],
      handler: vi.fn(),
      enabled: () => false,
    },
    {
      id: "action:duplicate",
      label: "Duplicate",
      icon: "i-lucide-copy",
      kbds: ["meta", "D"],
      handler: vi.fn(),
    },
    {
      id: "action:delete",
      label: "Delete",
      icon: "i-lucide-trash-2",
      kbds: ["delete"],
      handler: vi.fn(),
    },
    {
      id: "layer:bring-to-front",
      label: "Bring to front",
      icon: "i-lucide-bring-to-front",
      kbds: ["meta", "shift", "]"],
      handler: vi.fn(),
    },
    {
      id: "layer:bring-forward",
      label: "Bring forward",
      icon: "i-lucide-move-up",
      kbds: ["meta", "]"],
      handler: vi.fn(),
    },
    {
      id: "layer:send-backward",
      label: "Send backward",
      icon: "i-lucide-move-down",
      kbds: ["meta", "["],
      handler: vi.fn(),
    },
    {
      id: "layer:send-to-back",
      label: "Send to back",
      icon: "i-lucide-send-to-back",
      kbds: ["meta", "shift", "["],
      handler: vi.fn(),
    },
    {
      id: "action:group",
      label: "Group",
      icon: "i-lucide-group",
      kbds: ["meta", "G"],
      handler: vi.fn(),
    },
    {
      id: "action:ungroup",
      label: "Ungroup",
      icon: "i-lucide-ungroup",
      kbds: ["meta", "shift", "G"],
      handler: vi.fn(),
      enabled: () => false,
    },
    {
      id: "flip:horizontal",
      label: "Flip horizontal",
      icon: "i-lucide-flip-horizontal",
      kbds: ["shift", "H"],
      handler: vi.fn(),
    },
    {
      id: "flip:vertical",
      label: "Flip vertical",
      icon: "i-lucide-flip-vertical",
      kbds: ["shift", "V"],
      handler: vi.fn(),
    },
    {
      id: "action:select-all",
      label: "Select all",
      icon: "i-lucide-box-select",
      kbds: ["meta", "A"],
      handler: vi.fn(),
    },
    {
      id: "settings:toggle-grid",
      label: "Toggle grid",
      icon: "i-lucide-grid",
      kbds: ["meta", "'"],
      handler: vi.fn(),
    },
  ];
  register(actions);
}

function setup() {
  const ctx = withDrawVue((drawVue) => useContextMenu(drawVue.actionRegistry));
  registerTestActions(ctx);
  return ctx;
}

describe("useContextMenu", () => {
  it("defaults to canvas menu type", () => {
    using result = setup();
    expect(result.menuType.value).toBe("canvas");
  });

  it("returns canvas menu items initially", () => {
    using result = setup();
    const labels = result.items.value.filter((i) => i.label).map((i) => i.label);
    expect(labels).toContain("Paste");
    expect(labels).toContain("Select all");
  });

  it("returns element menu items when menuType is set to element", () => {
    using result = setup();
    result.menuType.value = "element";

    const labels = result.items.value.filter((i) => i.label).map((i) => i.label);
    expect(labels).toContain("Cut");
    expect(labels).toContain("Copy");
    expect(labels).toContain("Delete");
  });

  it("items include separator entries", () => {
    using result = setup();
    result.menuType.value = "element";
    const separators = result.items.value.filter((i) => i.type === "separator");
    expect(separators.length).toBeGreaterThan(0);
  });

  it("items have labels and kbds", () => {
    using result = setup();
    result.menuType.value = "element";

    const actionItems = result.items.value.filter((i) => i.label);
    expect(actionItems.length).toBeGreaterThan(0);

    const cutItem = actionItems.find((i) => i.label === "Cut");
    expect(cutItem).toBeDefined();
    expect(cutItem!.kbds).toBeDefined();
    expect(cutItem!.kbds!.length).toBeGreaterThan(0);
  });

  it("excludes actions whose enabled() returns false", () => {
    using result = setup();
    result.menuType.value = "element";

    const labels = result.items.value.filter((i) => i.label).map((i) => i.label);
    expect(labels).not.toContain("Ungroup");
    expect(labels).not.toContain("Paste styles");
  });

  it("has no consecutive separators", () => {
    using result = setup();
    result.menuType.value = "element";

    const items = result.items.value;
    const hasConsecutive = items.some(
      (item, i) => i > 0 && item.type === "separator" && items[i - 1]!.type === "separator",
    );
    expect(hasConsecutive).toBe(false);
  });

  it("does not start or end with separators", () => {
    using result = setup();
    result.menuType.value = "element";

    const items = result.items.value;
    expect(items[0]!.type).not.toBe("separator");
    expect(items.at(-1)!.type).not.toBe("separator");
  });

  it("onSelect calls execute on the registry", () => {
    using result = setup();

    const pasteItem = result.items.value.find((i) => i.label === "Paste");
    expect(pasteItem).toBeDefined();
    expect(pasteItem!.onSelect).toBeDefined();
    expect(() => pasteItem!.onSelect!(new Event("select"))).not.toThrow();
  });

  it("silently skips unregistered action IDs", () => {
    using result = setup();
    const labels = result.items.value.filter((i) => i.label).map((i) => i.label);
    expect(labels.length).toBeGreaterThan(0);
  });
});
