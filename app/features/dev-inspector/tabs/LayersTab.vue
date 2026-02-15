<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

const h = (globalThis as unknown as Record<string, Record<string, unknown>>).__h;

const staticCanvasRef = computed(
  () => (h?.staticCanvasRef as { value: HTMLCanvasElement | null })?.value ?? null,
);
const newElementCanvasRef = computed(
  () => (h?.newElementCanvasRef as { value: HTMLCanvasElement | null })?.value ?? null,
);
const interactiveCanvasRef = computed(
  () => (h?.interactiveCanvasRef as { value: HTMLCanvasElement | null })?.value ?? null,
);

interface LayerInfo {
  id: "interactive" | "newElement" | "static";
  name: string;
  colorClass: string;
  borderClass: string;
  bgClass: string;
  dotColor: string;
  zIndex: number;
  pointerEvents: boolean;
  description: string;
  renders: string[];
}

const LAYERS: LayerInfo[] = [
  {
    id: "interactive",
    name: "Interactive",
    colorClass: "text-accent",
    borderClass: "border-accent/30",
    bgClass: "bg-accent/[0.06]",
    dotColor: "bg-accent",
    zIndex: 2,
    pointerEvents: true,
    description: "Top layer — captures all pointer events. Renders ephemeral selection UI.",
    renders: [
      "Selection rectangle",
      "Resize handles (8 corners)",
      "Rotation handle",
      "Hover outlines",
    ],
  },
  {
    id: "newElement",
    name: "NewElement",
    colorClass: "text-cyan-400",
    borderClass: "border-cyan-400/20",
    bgClass: "bg-cyan-400/[0.04]",
    dotColor: "bg-cyan-400",
    zIndex: 1,
    pointerEvents: false,
    description:
      "Drawing layer — renders the element currently being created. Isolated to avoid full scene re-renders.",
    renders: ["Arrow/line being drawn", "Shape preview (ghost)"],
  },
  {
    id: "static",
    name: "Static",
    colorClass: "text-green-400",
    borderClass: "border-green-400/20",
    bgClass: "bg-green-400/[0.04]",
    dotColor: "bg-green-400",
    zIndex: 1,
    pointerEvents: false,
    description:
      "Base layer — renders background grid and all committed elements via RoughJS. Only redraws on element mutation.",
    renders: [
      "Background grid (dot pattern)",
      "Rectangles, ellipses (RoughJS)",
      "Arrows, lines",
      "Text labels, code blocks",
    ],
  },
];

function getCanvasRef(layerId: string): HTMLCanvasElement | null {
  if (layerId === "interactive") return interactiveCanvasRef.value;
  if (layerId === "newElement") return newElementCanvasRef.value;
  if (layerId === "static") return staticCanvasRef.value;
  return null;
}

const THUMB_W = 320;
const THUMB_H = 200;

const thumbnails = ref<Record<string, string>>({});
const hasContent = ref<Record<string, boolean>>({});
let thumbnailInterval: ReturnType<typeof setInterval> | null = null;

let thumbCanvas: HTMLCanvasElement | null = null;

function getThumbCanvas(): HTMLCanvasElement {
  if (!thumbCanvas) {
    thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = THUMB_W;
    thumbCanvas.height = THUMB_H;
  }
  return thumbCanvas;
}

function thumbHasContent(ctx: CanvasRenderingContext2D): boolean {
  const { data } = ctx.getImageData(0, 0, THUMB_W, THUMB_H);
  // Check every 80th pixel's alpha channel (~800 samples on 320x200)
  for (let i = 3; i < data.length; i += 320) {
    if ((data[i] ?? 0) > 0) return true;
  }
  return false;
}

function captureThumbnails(): void {
  const tc = getThumbCanvas();
  const tctx = tc.getContext("2d");
  if (!tctx) return;

  for (const layer of LAYERS) {
    const canvas = getCanvasRef(layer.id);
    if (!canvas) continue;

    tctx.clearRect(0, 0, THUMB_W, THUMB_H);
    tctx.drawImage(canvas, 0, 0, THUMB_W, THUMB_H);

    const detected = layer.id === "static" || thumbHasContent(tctx);
    hasContent.value[layer.id] = detected;

    // Amplify faint pixels on transparent layers with "lighter" blend
    if (layer.id !== "static" && detected) {
      tctx.globalCompositeOperation = "lighter";
      tctx.drawImage(tc, 0, 0);
      tctx.drawImage(tc, 0, 0);
      tctx.globalCompositeOperation = "source-over";
    }

    thumbnails.value[layer.id] = tc.toDataURL("image/png");
  }
}

onMounted(() => {
  captureThumbnails();
  thumbnailInterval = setInterval(captureThumbnails, 500);
});

onUnmounted(() => {
  if (thumbnailInterval) clearInterval(thumbnailInterval);
});

const hiddenLayers = ref(new Set<string>());

function toggleVisibility(layerId: string): void {
  const canvas = getCanvasRef(layerId);
  if (!canvas) return;

  if (hiddenLayers.value.has(layerId)) {
    hiddenLayers.value.delete(layerId);
    canvas.style.opacity = "1";
    return;
  }
  hiddenLayers.value.add(layerId);
  canvas.style.opacity = "0";
}

const expandedLayer = ref<string | null>(null);
const selectedLayer = ref<string>("interactive");

function selectLayer(layerId: string): void {
  selectedLayer.value = layerId;
  expandedLayer.value = expandedLayer.value === layerId ? null : layerId;
}
</script>

<template>
  <div class="flex flex-col gap-1 p-1.5">
    <!-- 3D Layer Stack Visualization -->
    <div class="relative mb-1 overflow-hidden rounded-md bg-[rgb(22,26,38)]">
      <!-- Dot grid background -->
      <div class="pointer-events-none absolute inset-0 layer-dots opacity-30" />

      <div class="layer-perspective relative flex items-center justify-center py-8">
        <div class="layer-stack relative h-[140px] w-[260px]">
          <!-- Static (bottom) -->
          <div
            class="layer-3d layer-3d-static cursor-pointer"
            :class="{
              'layer-3d-selected': selectedLayer === 'static',
              'layer-3d-hidden': hiddenLayers.has('static'),
            }"
            @click="selectLayer('static')"
          >
            <img
              v-if="thumbnails.static"
              :src="thumbnails.static"
              class="h-full w-full object-cover"
              alt=""
            />
            <span class="layer-label-3d bg-green-400/[0.15] text-green-400">Static</span>
            <span class="layer-zbadge-3d text-green-400/70">z:1</span>
          </div>

          <!-- NewElement (middle) -->
          <div
            class="layer-3d layer-3d-new cursor-pointer"
            :class="{
              'layer-3d-selected': selectedLayer === 'newElement',
              'layer-3d-hidden': hiddenLayers.has('newElement'),
            }"
            @click="selectLayer('newElement')"
          >
            <img
              v-if="thumbnails.newElement"
              :src="thumbnails.newElement"
              class="h-full w-full object-cover"
              alt=""
            />
            <span class="layer-label-3d bg-cyan-400/[0.12] text-cyan-400">NewElement</span>
            <span class="layer-zbadge-3d text-cyan-400/70">z:1</span>
          </div>

          <!-- Interactive (top) -->
          <div
            class="layer-3d layer-3d-interactive cursor-pointer"
            :class="{
              'layer-3d-selected': selectedLayer === 'interactive',
              'layer-3d-hidden': hiddenLayers.has('interactive'),
            }"
            @click="selectLayer('interactive')"
          >
            <img
              v-if="thumbnails.interactive"
              :src="thumbnails.interactive"
              class="h-full w-full object-cover"
              alt=""
            />
            <span
              v-if="!hasContent.interactive"
              class="absolute inset-0 flex items-center justify-center font-mono text-[9px] italic text-accent/25"
            >
              select an element to see content
            </span>
            <span class="layer-label-3d bg-accent/[0.15] text-accent">Interactive</span>
            <span class="layer-zbadge-3d text-accent/70">z:2</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Layer rows -->
    <div v-for="layer in LAYERS" :key="layer.id" class="overflow-hidden rounded-md">
      <!-- Row header -->
      <div
        class="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-[7px] transition-colors hover:bg-surface/60"
        :class="{
          'bg-surface/40': expandedLayer === layer.id,
          'ring-1 ring-inset ring-white/10': selectedLayer === layer.id,
        }"
        @click="selectLayer(layer.id)"
      >
        <!-- Eye toggle -->
        <button
          class="flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors hover:bg-white/[0.06]"
          :class="[layer.colorClass, hiddenLayers.has(layer.id) ? 'opacity-30' : 'opacity-70']"
          title="Toggle visibility"
          @click.stop="toggleVisibility(layer.id)"
        >
          <svg
            v-if="!hiddenLayers.has(layer.id)"
            class="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <svg
            v-else
            class="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
            />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        </button>

        <!-- Thumbnail -->
        <div
          class="relative h-[30px] w-[42px] shrink-0 overflow-hidden rounded border"
          :class="[layer.borderClass, layer.bgClass]"
        >
          <img
            v-if="thumbnails[layer.id]"
            :src="thumbnails[layer.id]"
            class="h-full w-full object-cover"
            :class="{ 'opacity-30': hiddenLayers.has(layer.id) }"
            alt=""
          />
          <span
            v-if="!hasContent[layer.id] && layer.id !== 'static'"
            class="absolute inset-0 flex items-center justify-center text-[7px] italic text-foreground/20"
          >
            empty
          </span>
        </div>

        <!-- Name + badges -->
        <div class="flex flex-1 items-center gap-2">
          <span class="text-[11px] font-semibold" :class="layer.colorClass">
            {{ layer.name }}
          </span>
          <span class="rounded bg-white/[0.06] px-1 py-px font-mono text-[9px] text-foreground/40">
            z:{{ layer.zIndex }}
          </span>
          <span
            class="rounded px-1 py-px font-mono text-[9px]"
            :class="
              layer.pointerEvents
                ? 'bg-accent/[0.12] text-accent'
                : 'bg-white/[0.04] text-foreground/30'
            "
          >
            {{ layer.pointerEvents ? "events" : "no-ptr" }}
          </span>
        </div>

        <!-- Expand chevron -->
        <svg
          class="h-3 w-3 text-foreground/30 transition-transform duration-200"
          :class="{ 'rotate-90': expandedLayer === layer.id }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>

      <!-- Expanded detail -->
      <div
        v-if="expandedLayer === layer.id"
        class="mx-2 mb-1 rounded border border-white/[0.04] bg-white/[0.02] px-3 py-2.5"
      >
        <p class="text-[10px] leading-relaxed text-foreground/50">
          {{ layer.description }}
        </p>
        <div class="mt-2 border-t border-white/[0.04] pt-2">
          <div
            v-for="item in layer.renders"
            :key="item"
            class="flex items-center gap-1.5 py-0.5 font-mono text-[10px] text-foreground/40"
          >
            <span class="inline-block h-[5px] w-[5px] rounded-full" :class="layer.dotColor" />
            {{ item }}
          </div>
        </div>
      </div>
    </div>

    <!-- Render Order bar -->
    <div class="mt-2 px-2">
      <div class="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/30">
        Render Order
      </div>
      <div class="flex h-6 overflow-hidden rounded border border-white/[0.04] bg-white/[0.03]">
        <div
          class="flex flex-1 items-center justify-center bg-green-400/[0.12] font-mono text-[9px] font-semibold text-green-400"
        >
          STATIC
        </div>
        <div
          class="flex flex-1 items-center justify-center border-x border-white/[0.04] bg-cyan-400/[0.12] font-mono text-[9px] font-semibold text-cyan-400"
        >
          NEW
        </div>
        <div
          class="flex flex-1 items-center justify-center bg-accent/[0.12] font-mono text-[9px] font-semibold text-accent"
        >
          INTERACTIVE
        </div>
      </div>
      <div
        class="mt-1 flex items-center justify-center gap-1.5 font-mono text-[9px] text-foreground/25"
      >
        <span>&larr;</span> bottom &middot; paints first
        <span class="px-1">&middot;</span>
        top &middot; paints last <span>&rarr;</span>
      </div>
    </div>

    <!-- Legend -->
    <div class="mt-2 border-t border-white/[0.04] px-2 pt-2">
      <div class="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/30">
        How It Works
      </div>
      <div class="flex items-start gap-2 py-1">
        <span class="mt-[3px] inline-block h-[8px] w-[8px] shrink-0 rounded-sm bg-green-400" />
        <span class="text-[10px] leading-relaxed text-foreground/40">
          <span class="font-medium text-foreground/60">Static</span> — Grid + committed shapes.
          Cached; re-renders only on mutation.
        </span>
      </div>
      <div class="flex items-start gap-2 py-1">
        <span class="mt-[3px] inline-block h-[8px] w-[8px] shrink-0 rounded-sm bg-cyan-400" />
        <span class="text-[10px] leading-relaxed text-foreground/40">
          <span class="font-medium text-foreground/60">NewElement</span> — Element being drawn.
          Isolated to avoid full scene re-renders.
        </span>
      </div>
      <div class="flex items-start gap-2 py-1">
        <span class="mt-[3px] inline-block h-[8px] w-[8px] shrink-0 rounded-sm bg-accent" />
        <span class="text-[10px] leading-relaxed text-foreground/40">
          <span class="font-medium text-foreground/60">Interactive</span> — Selection UI + handles.
          Only layer receiving pointer events.
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layer-dots {
  background-image: radial-gradient(rgba(234, 237, 243, 0.06) 1px, transparent 1px);
  background-size: 16px 16px;
}

.layer-perspective {
  perspective: 800px;
  perspective-origin: 50% 42%;
}

.layer-stack {
  transform-style: preserve-3d;
}

.layer-3d {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  border: 1.5px solid;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}

.layer-3d-static {
  border-color: rgba(74, 222, 128, 0.35);
  background: rgba(74, 222, 128, 0.03);
  transform: rotateX(55deg) rotateZ(-2deg) translateZ(-50px);
  box-shadow:
    0 0 16px rgba(74, 222, 128, 0.06),
    0 16px 40px rgba(0, 0, 0, 0.2);
}

.layer-3d-new {
  border-color: rgba(34, 211, 238, 0.35);
  background: rgba(34, 211, 238, 0.03);
  transform: rotateX(55deg) rotateZ(-2deg) translateZ(0px);
  box-shadow:
    0 0 16px rgba(34, 211, 238, 0.06),
    0 16px 40px rgba(0, 0, 0, 0.2);
}

.layer-3d-interactive {
  border-color: rgba(255, 107, 237, 0.45);
  background: rgba(255, 107, 237, 0.03);
  transform: rotateX(55deg) rotateZ(-2deg) translateZ(50px);
  box-shadow:
    0 0 24px rgba(255, 107, 237, 0.08),
    0 16px 40px rgba(0, 0, 0, 0.25);
}

.layer-3d-selected {
  filter: brightness(1.2);
}

.layer-3d-static.layer-3d-selected {
  border-color: rgb(74, 222, 128);
  box-shadow:
    0 0 28px rgba(74, 222, 128, 0.18),
    0 16px 40px rgba(0, 0, 0, 0.2);
}

.layer-3d-new.layer-3d-selected {
  border-color: rgb(34, 211, 238);
  box-shadow:
    0 0 28px rgba(34, 211, 238, 0.18),
    0 16px 40px rgba(0, 0, 0, 0.2);
}

.layer-3d-interactive.layer-3d-selected {
  border-color: rgb(255, 107, 237);
  box-shadow:
    0 0 28px rgba(255, 107, 237, 0.22),
    0 16px 40px rgba(0, 0, 0, 0.25);
}

.layer-3d-hidden {
  opacity: 0.08;
  filter: saturate(0);
}

.layer-label-3d {
  position: absolute;
  top: 6px;
  left: 8px;
  font-family: ui-monospace, monospace;
  font-size: 8px;
  font-weight: 600;
  padding: 2px 5px;
  border-radius: 3px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  pointer-events: none;
}

.layer-zbadge-3d {
  position: absolute;
  top: 6px;
  right: 8px;
  font-family: ui-monospace, monospace;
  font-size: 7px;
  font-weight: 500;
  padding: 1px 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.06);
  pointer-events: none;
}
</style>
