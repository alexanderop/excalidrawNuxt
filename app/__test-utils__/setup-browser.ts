import { expect, beforeAll } from "vitest";
import { page } from "vitest/browser";
import { config } from "vitest-browser-vue";
import { defineComponent, h, ref, onUnmounted, watch } from "vue";
import "~/assets/css/main.css";

// Stub Nuxt UI components (UButton, UTooltip, etc.) that aren't available
// in the browser test environment. Each stub renders a plain <div> with its
// default slot so the rest of the component tree works normally.
const NuxtUiStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h("div", attrs, slots.default?.());
  },
});

// UModal stub — conditionally renders its #content slot based on `open` prop.
// Listens for Escape on document (like real UModal) to emit update:open.
const UModalStub = defineComponent({
  props: { open: { type: Boolean, default: false } },
  emits: ["update:open"],
  setup(props, { slots, emit }) {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && props.open) emit("update:open", false);
    };
    watch(
      () => props.open,
      (isOpen) => {
        if (isOpen) document.addEventListener("keydown", onKeydown);
        if (!isOpen) document.removeEventListener("keydown", onKeydown);
      },
      { immediate: true },
    );
    onUnmounted(() => document.removeEventListener("keydown", onKeydown));
    return () =>
      props.open
        ? h(
            "div",
            { role: "dialog", style: "position:fixed;inset:0;z-index:9999" },
            slots.content?.(),
          )
        : null;
  },
});

// UCommandPalette stub — renders a search input and option list from groups.
const UCommandPaletteStub = defineComponent({
  props: {
    groups: { type: Array, default: () => [] },
    placeholder: { type: String, default: "" },
    close: { type: Boolean, default: false },
  },
  emits: ["update:open"],
  setup(props, { emit }) {
    return () =>
      h("div", { role: "listbox" }, [
        h("input", {
          type: "text",
          placeholder: props.placeholder,
          onInput: (e: Event) => {
            const el = e.target as HTMLInputElement;
            el.dataset.filter = el.value;
          },
        }),
        ...(
          props.groups as Array<{
            id: string;
            items: Array<{ id: string; label: string; onSelect?: () => void }>;
          }>
        ).flatMap((group) =>
          group.items
            .filter((item) => {
              const input = document.querySelector<HTMLInputElement>(
                `input[placeholder="${props.placeholder}"]`,
              );
              const filter = input?.dataset.filter ?? "";
              return !filter || item.label.toLowerCase().includes(filter.toLowerCase());
            })
            .map((item) =>
              h(
                "div",
                {
                  role: "option",
                  onClick: () => {
                    item.onSelect?.();
                    emit("update:open", false);
                  },
                },
                item.label,
              ),
            ),
        ),
      ]);
  },
});

// UContextMenu stub — shows items on right-click (contextmenu event).
// The real Nuxt UI UContextMenu intercepts contextmenu events on its trigger area
// and displays a menu with the provided items. This stub replicates that behavior.
const UContextMenuStub = defineComponent({
  props: {
    items: { type: Array, default: () => [] },
  },
  setup(props, { slots }) {
    const isOpen = ref(false);

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      isOpen.value = true;
    };

    return () =>
      h("div", { onContextmenu: handleContextMenu, style: "height:100%;width:100%" }, [
        slots.default?.(),
        ...(isOpen.value
          ? (props.items as Array<{ label?: string; type?: string; onSelect?: (e: Event) => void }>)
              .filter((item) => item.type !== "separator" && item.label)
              .map((item) =>
                h(
                  "div",
                  {
                    role: "menuitem",
                    onClick: (e: Event) => {
                      item.onSelect?.(e);
                      isOpen.value = false;
                    },
                  },
                  item.label,
                ),
              )
          : []),
      ]);
  },
});

config.global.stubs = {
  UButton: NuxtUiStub,
  UTooltip: NuxtUiStub,
  UPopover: NuxtUiStub,
  UContextMenu: UContextMenuStub,
  USlider: NuxtUiStub,
  UModal: UModalStub,
  UCommandPalette: UCommandPaletteStub,
};

// Desktop-sized viewport for all browser tests (screenshots are resolution-dependent)
beforeAll(async () => {
  await page.viewport(1280, 800);
});

// vitest-browser-vue mounts components into a <div> under <body>.
// main.css sizes html/body/#__nuxt to 100%, but there is no #__nuxt in tests
// and Tailwind v4 processing may reorder the rules. We explicitly ensure the
// full height/width chain so useElementSize returns the viewport dimensions
// and the canvas renderer can bootstrap properly.
const style = document.createElement("style");
style.textContent = [
  "html, body { height: 100%; width: 100%; margin: 0; padding: 0; overflow: hidden; }",
  "body > div, body > div > div { height: 100%; width: 100%; }",
].join("\n");
document.head.append(style);

// Float snapshot serializer — prevents float precision flakiness in snapshots.
// Non-integer numbers are rounded to 5 decimal places.
expect.addSnapshotSerializer({
  serialize(val: number, _config, _indentation, _depth, _refs, _printer) {
    return val.toFixed(5);
  },
  test(val: unknown) {
    return typeof val === "number" && Number.isFinite(val) && !Number.isInteger(val);
  },
});
