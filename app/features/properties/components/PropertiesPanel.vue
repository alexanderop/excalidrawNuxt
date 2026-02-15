<script setup lang="ts">
import { computed, toRef } from "vue";
import type {
  ExcalidrawElement,
  Arrowhead,
  ArrowSubtype,
  FillStyle,
  StrokeStyle,
  TextAlign,
  Roundness,
  ToolType,
} from "@drawvue/core";
import {
  useDrawVue,
  useStyleDefaults,
  usePropertyActions,
  usePropertyVisibility,
  useActionRegistry,
  useTheme,
  resolveColor,
  hasStrokeColor,
  hasBackground,
  hasFillStyle,
  hasStrokeWidth,
  hasStrokeStyle,
  hasRoughness,
  canChangeRoundness,
} from "@drawvue/core";
import ButtonIconSelect from "./ButtonIconSelect.vue";
import OpacitySlider from "./OpacitySlider.vue";
import ColorSwatch from "./ColorSwatch.vue";
import FontPicker from "./FontPicker.vue";
import ArrowheadPicker from "./ArrowheadPicker.vue";

const GROUP_HEADER =
  "px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-foreground/30";
const PROP_ROW =
  "flex items-center justify-between px-3 py-1.5 hover:bg-subdued/8 transition-colors";
const PROP_LABEL = "min-w-14 shrink-0 text-[11px] font-medium text-foreground/50";
const GROUP_DIVIDER = "h-px mx-3 my-1 bg-gradient-to-r from-transparent via-edge/25 to-transparent";

const { selectedElements, activeTool } = defineProps<{
  selectedElements: ExcalidrawElement[];
  activeTool: ToolType;
}>();

const emit = defineEmits<{
  "mark-dirty": [];
  "will-change": [];
}>();

const { execute } = useActionRegistry();
const { theme } = useTheme();
const { elements: allElements } = useDrawVue();

const styleDefaults = useStyleDefaults();

const elements = computed(() => selectedElements);

const actions = usePropertyActions({
  selectedElements: elements,
  styleDefaults,
  markDirty: () => emit("mark-dirty"),
  onBeforeChange: () => emit("will-change"),
  elements: allElements.elements,
});

const {
  showStrokeColor,
  showBackground,
  showColors,
  showFillStyle,
  showStrokeWidth,
  showStrokeStyle,
  showStyleGroup,
  showRoughness,
  showRoundness,
  showShapeGroup,
  hasText: hasTextSelected,
  hasArrow: hasArrowSelected,
} = usePropertyVisibility(
  elements,
  toRef(() => activeTool),
);

// Current form values from selection — filter to only relevant elements
const currentStrokeColor = computed(() =>
  actions.getFormValue<string>("strokeColor", styleDefaults.strokeColor.value, (el) =>
    hasStrokeColor(el.type),
  ),
);
const currentBgColor = computed(() =>
  actions.getFormValue<string>("backgroundColor", styleDefaults.backgroundColor.value, (el) =>
    hasBackground(el.type),
  ),
);
const currentFillStyle = computed(() =>
  actions.getFormValue<FillStyle>("fillStyle", styleDefaults.fillStyle.value, (el) =>
    hasFillStyle(el.type),
  ),
);
const currentStrokeWidth = computed(() =>
  actions.getFormValue<number>("strokeWidth", styleDefaults.strokeWidth.value, (el) =>
    hasStrokeWidth(el.type),
  ),
);
const currentStrokeStyle = computed(() =>
  actions.getFormValue<StrokeStyle>("strokeStyle", styleDefaults.strokeStyle.value, (el) =>
    hasStrokeStyle(el.type),
  ),
);
const currentRoughness = computed(() =>
  actions.getFormValue<number>("roughness", styleDefaults.roughness.value, (el) =>
    hasRoughness(el.type),
  ),
);
const currentRoundness = computed(() => {
  const raw = actions.getFormValue<{ type: number } | null>("roundness", null, (el) =>
    canChangeRoundness(el.type),
  );
  if (raw === "mixed") return "mixed";
  return raw === null ? "sharp" : "round";
});
const currentOpacity = computed(() => {
  const val = actions.getFormValue<number>("opacity", styleDefaults.opacity.value);
  if (val === "mixed") return 50;
  return val;
});
const currentTextAlign = computed(() =>
  actions.getFormValue<TextAlign>("textAlign", styleDefaults.textAlign.value),
);
const currentFontFamily = computed(() =>
  actions.getFormValue<number>("fontFamily", styleDefaults.fontFamily.value),
);
const currentFontSize = computed(() => {
  const val = actions.getFormValue<number>("fontSize", styleDefaults.fontSize.value);
  if (val === "mixed") return styleDefaults.fontSize.value;
  return val;
});
const currentStartArrowhead = computed(() =>
  actions.getFormValue<Arrowhead | null>("startArrowhead", styleDefaults.startArrowhead.value),
);
const currentEndArrowhead = computed(() =>
  actions.getFormValue<Arrowhead | null>("endArrowhead", styleDefaults.endArrowhead.value),
);

function formatColorDisplay(color: string): string {
  if (color === "mixed") return "mixed";
  if (color === "transparent") return "none";
  return resolveColor(color, theme.value);
}

const strokeHexDisplay = computed(() => formatColorDisplay(currentStrokeColor.value));
const bgHexDisplay = computed(() => formatColorDisplay(currentBgColor.value));

// Options for ButtonIconSelect groups
const fillStyleOptions: { label: string; value: FillStyle; icon: string }[] = [
  {
    label: "Hachure",
    value: "hachure",
    icon: '<path d="M4 4l16 16M8 4l12 12M12 4l8 8M4 8l16 16M4 12l12 12M4 16l8 8"/>',
  },
  {
    label: "Cross-hatch",
    value: "cross-hatch",
    icon: '<path d="M4 4l16 16M20 4L4 20M8 4l12 12M16 4L4 16M12 4l8 8M12 20L4 12"/>',
  },
  {
    label: "Solid",
    value: "solid",
    icon: '<rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor"/>',
  },
];

const strokeWidthOptions: { label: string; value: number; icon: string }[] = [
  { label: "Thin", value: 1, icon: '<line x1="4" y1="12" x2="20" y2="12" stroke-width="1"/>' },
  { label: "Bold", value: 2, icon: '<line x1="4" y1="12" x2="20" y2="12" stroke-width="2.5"/>' },
  {
    label: "Extra bold",
    value: 4,
    icon: '<line x1="4" y1="12" x2="20" y2="12" stroke-width="4"/>',
  },
];

const strokeStyleOptions: { label: string; value: StrokeStyle; icon: string }[] = [
  { label: "Solid", value: "solid", icon: '<line x1="4" y1="12" x2="20" y2="12"/>' },
  {
    label: "Dashed",
    value: "dashed",
    icon: '<line x1="4" y1="12" x2="20" y2="12" stroke-dasharray="4 3"/>',
  },
  {
    label: "Dotted",
    value: "dotted",
    icon: '<line x1="4" y1="12" x2="20" y2="12" stroke-dasharray="1.5 3"/>',
  },
];

const roughnessOptions: { label: string; value: number; icon: string }[] = [
  { label: "Architect", value: 0, icon: '<line x1="4" y1="12" x2="20" y2="12"/>' },
  { label: "Artist", value: 1, icon: '<path d="M4 12c2-2 4 2 6 0s4-2 6 0"/>' },
  { label: "Cartoonist", value: 2, icon: '<path d="M4 12c1-4 3 4 5-2s3 4 5-1 3 3 6 1"/>' },
];

const roundnessOptions: { label: string; value: Roundness; icon: string }[] = [
  { label: "Sharp", value: "sharp", icon: '<rect x="4" y="4" width="16" height="16"/>' },
  { label: "Round", value: "round", icon: '<rect x="4" y="4" width="16" height="16" rx="4"/>' },
];

const textAlignOptions: { label: string; value: TextAlign; icon: string }[] = [
  {
    label: "Left",
    value: "left",
    icon: '<line x1="4" y1="6" x2="16" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="14" y2="18"/>',
  },
  {
    label: "Center",
    value: "center",
    icon: '<line x1="6" y1="6" x2="18" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="7" y1="18" x2="17" y2="18"/>',
  },
  {
    label: "Right",
    value: "right",
    icon: '<line x1="8" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="10" y1="18" x2="20" y2="18"/>',
  },
];

const arrowSubtypeOptions: { label: string; value: ArrowSubtype; icon: string }[] = [
  {
    label: "Sharp",
    value: "sharp",
    icon: '<polyline points="4 16 12 8 20 16"/>',
  },
  {
    label: "Curved",
    value: "curved",
    icon: '<path d="M4 16 Q12 2 20 16"/>',
  },
  {
    label: "Elbow",
    value: "elbow",
    icon: '<path d="M4 16 V8 H20"/>',
  },
];

function onFontSizeChange(event: Event): void {
  if (!(event.target instanceof HTMLInputElement)) return;
  const val = Number(event.target.value);
  if (val >= 8 && val <= 120) {
    actions.changeFontSize(val);
  }
}
</script>

<template>
  <div
    class="properties-sidebar absolute left-3 top-16 z-10 flex w-56 flex-col rounded-lg border border-edge/40 bg-surface/80 shadow-lg backdrop-blur-md max-h-[calc(100vh-6rem)] overflow-hidden"
  >
    <!-- Scrollable content area -->
    <div class="properties-sidebar-scroll flex-1 overflow-y-auto">
      <!-- ZONE 1: Two-column color row -->
      <template v-if="showColors">
        <div
          class="gap-px bg-edge/10"
          :class="showStrokeColor && showBackground ? 'grid grid-cols-2' : 'flex'"
        >
          <div v-if="showStrokeColor" class="flex flex-col gap-1.5 bg-surface/80 p-2.5">
            <span class="text-[10px] font-medium uppercase tracking-wide text-foreground/40"
              >Stroke</span
            >
            <div class="flex items-center gap-2">
              <ColorSwatch
                size="sm"
                :color="currentStrokeColor"
                label="Stroke color"
                @update:color="actions.changeStrokeColor"
              />
              <span class="font-mono text-[10px] text-foreground/50">{{ strokeHexDisplay }}</span>
            </div>
          </div>
          <div v-if="showBackground" class="flex flex-col gap-1.5 bg-surface/80 p-2.5">
            <span class="text-[10px] font-medium uppercase tracking-wide text-foreground/40"
              >Fill</span
            >
            <div class="flex items-center gap-2">
              <ColorSwatch
                size="sm"
                :color="currentBgColor"
                label="Background color"
                @update:color="actions.changeBackgroundColor"
              />
              <span class="font-mono text-[10px] text-foreground/50">{{ bgHexDisplay }}</span>
            </div>
          </div>
        </div>

        <div :class="GROUP_DIVIDER" />
      </template>

      <!-- ZONE 2: Style group -->
      <template v-if="showStyleGroup">
        <div :class="GROUP_HEADER">Style</div>
        <div v-if="showFillStyle" :class="PROP_ROW">
          <span :class="PROP_LABEL">Fill</span>
          <ButtonIconSelect
            :options="fillStyleOptions"
            :model-value="currentFillStyle"
            @update:model-value="actions.changeFillStyle"
          />
        </div>
        <div v-if="showStrokeWidth" :class="PROP_ROW">
          <span :class="PROP_LABEL">Width</span>
          <ButtonIconSelect
            :options="strokeWidthOptions"
            :model-value="currentStrokeWidth"
            @update:model-value="actions.changeStrokeWidth"
          />
        </div>
        <div v-if="showStrokeStyle" :class="PROP_ROW">
          <span :class="PROP_LABEL">Dash</span>
          <ButtonIconSelect
            :options="strokeStyleOptions"
            :model-value="currentStrokeStyle"
            @update:model-value="actions.changeStrokeStyle"
          />
        </div>

        <div :class="GROUP_DIVIDER" />
      </template>

      <!-- ZONE 3: Shape group -->
      <template v-if="showShapeGroup">
        <div :class="GROUP_HEADER">Shape</div>
        <div v-if="showRoughness" :class="PROP_ROW">
          <span :class="PROP_LABEL">Rough</span>
          <ButtonIconSelect
            :options="roughnessOptions"
            :model-value="currentRoughness"
            @update:model-value="actions.changeRoughness"
          />
        </div>
        <div v-if="showRoundness" :class="PROP_ROW">
          <span :class="PROP_LABEL">Edges</span>
          <ButtonIconSelect
            :options="roundnessOptions"
            :model-value="currentRoundness"
            @update:model-value="actions.changeRoundness"
          />
        </div>

        <div :class="GROUP_DIVIDER" />
      </template>

      <!-- ZONE 4: Opacity (always shown) -->
      <div :class="PROP_ROW">
        <span :class="PROP_LABEL">Opacity</span>
        <div class="flex-1">
          <OpacitySlider
            :model-value="currentOpacity"
            @update:model-value="actions.changeOpacity"
          />
        </div>
      </div>

      <!-- ZONE 5: Text controls (conditional) -->
      <template v-if="hasTextSelected">
        <div :class="GROUP_DIVIDER" />
        <div :class="GROUP_HEADER">Text</div>
        <div :class="PROP_ROW">
          <span :class="PROP_LABEL">Font</span>
          <div class="flex items-center gap-1.5">
            <FontPicker
              :model-value="currentFontFamily"
              @update:model-value="actions.changeFontFamily"
            />
            <input
              type="number"
              :value="currentFontSize"
              :min="8"
              :max="120"
              :step="4"
              aria-label="Font size"
              class="h-7 w-12 rounded border border-edge/30 bg-surface/60 px-1.5 text-center text-xs text-foreground/80 outline-none focus:border-accent/50"
              @change="onFontSizeChange"
            />
          </div>
        </div>
        <div :class="PROP_ROW">
          <span :class="PROP_LABEL">Align</span>
          <ButtonIconSelect
            :options="textAlignOptions"
            :model-value="currentTextAlign"
            @update:model-value="actions.changeTextAlign"
          />
        </div>
      </template>

      <!-- ZONE 6: Arrow controls (conditional) -->
      <template v-if="hasArrowSelected">
        <div :class="GROUP_DIVIDER" />
        <div :class="GROUP_HEADER">Arrowheads</div>
        <div :class="PROP_ROW">
          <span :class="PROP_LABEL">Type</span>
          <ButtonIconSelect
            :options="arrowSubtypeOptions"
            :model-value="styleDefaults.arrowSubtype.value"
            @update:model-value="actions.changeArrowSubtype"
          />
        </div>
        <div class="px-3 py-1.5">
          <div class="flex flex-col gap-1.5">
            <ArrowheadPicker
              label="Start"
              :model-value="currentStartArrowhead"
              @update:model-value="(val: Arrowhead | null) => actions.changeArrowhead('start', val)"
            />
            <ArrowheadPicker
              label="End"
              :model-value="currentEndArrowhead"
              @update:model-value="(val: Arrowhead | null) => actions.changeArrowhead('end', val)"
            />
          </div>
        </div>
      </template>

      <!-- Spacer so content doesn't hide behind bottom bar -->
      <div class="h-1" />
    </div>

    <!-- Bottom bar: Layers + Actions (pinned) -->
    <div
      class="flex items-center justify-between border-t border-edge/20 bg-surface/90 px-2.5 py-1.5"
    >
      <div class="flex gap-0.5">
        <UTooltip text="Send to back" :content="{ side: 'bottom' }">
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            square
            aria-label="Send to back"
            class="text-foreground/70 hover:bg-subdued/20 hover:text-foreground"
            @click="execute('layer:send-to-back')"
          >
            <svg
              aria-hidden="true"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="7 14 12 19 17 14" />
              <line x1="5" y1="21" x2="19" y2="21" />
            </svg>
          </UButton>
        </UTooltip>
        <UTooltip text="Send backward" :content="{ side: 'bottom' }">
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            square
            aria-label="Send backward"
            class="text-foreground/70 hover:bg-subdued/20 hover:text-foreground"
            @click="execute('layer:send-backward')"
          >
            <svg
              aria-hidden="true"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="12" y1="7" x2="12" y2="19" />
              <polyline points="7 14 12 19 17 14" />
            </svg>
          </UButton>
        </UTooltip>
        <UTooltip text="Bring forward" :content="{ side: 'bottom' }">
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            square
            aria-label="Bring forward"
            class="text-foreground/70 hover:bg-subdued/20 hover:text-foreground"
            @click="execute('layer:bring-forward')"
          >
            <svg
              aria-hidden="true"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="12" y1="17" x2="12" y2="5" />
              <polyline points="7 10 12 5 17 10" />
            </svg>
          </UButton>
        </UTooltip>
        <UTooltip text="Bring to front" :content="{ side: 'bottom' }">
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            square
            aria-label="Bring to front"
            class="text-foreground/70 hover:bg-subdued/20 hover:text-foreground"
            @click="execute('layer:bring-to-front')"
          >
            <svg
              aria-hidden="true"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="7 10 12 5 17 10" />
              <line x1="5" y1="3" x2="19" y2="3" />
            </svg>
          </UButton>
        </UTooltip>
      </div>

      <!-- Vertical separator -->
      <div class="mx-1 h-5 w-px bg-edge/20" />

      <div class="flex gap-0.5">
        <UTooltip text="Duplicate" :content="{ side: 'bottom' }">
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            square
            aria-label="Duplicate"
            class="text-foreground/70 hover:bg-subdued/20 hover:text-foreground"
            @click="execute('action:duplicate')"
          >
            <svg
              aria-hidden="true"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </UButton>
        </UTooltip>
        <UTooltip text="Delete" :content="{ side: 'bottom' }">
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            square
            aria-label="Delete"
            class="text-foreground/70 hover:bg-red-500/20 hover:text-red-400"
            @click="execute('action:delete')"
          >
            <svg
              aria-hidden="true"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path
                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
              />
            </svg>
          </UButton>
        </UTooltip>
      </div>
    </div>
  </div>
</template>
