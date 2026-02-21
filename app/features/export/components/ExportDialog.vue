<script setup lang="ts">
import { shallowRef, computed, watch, useTemplateRef } from "vue";
import { useDrawVue, exportToBlob, tryCatch } from "@drawvue/core";
import { useTimeoutFn } from "@vueuse/core";
import { useExportOptions } from "../composables/useExportOptions";
import { useExportPreview } from "../composables/useExportPreview";
import { useCopyFeedback } from "../composables/useCopyFeedback";
import { downloadBlob } from "../utils/downloadBlob";
import { copyImageToClipboard } from "../utils/copyImageToClipboard";

const ctx = useDrawVue();

const isOpen = computed({
  get: () => ctx.export.value?.isOpen.value ?? false,
  set: (val: boolean) => {
    const slice = ctx.export.value;
    if (!slice) return;
    slice.isOpen.value = val;
  },
});

const isOpenRef = ctx.export.value?.isOpen ?? shallowRef(false);

function close(): void {
  ctx.export.value?.close();
}

const previewCanvasRef = useTemplateRef<HTMLCanvasElement>("previewCanvas");

const {
  onlySelected,
  background,
  darkMode,
  embedScene,
  scale,
  filename,
  hasSelection,
  dimensions,
  isEmpty,
  exportOptions,
} = useExportOptions(isOpenRef);

const { showCopied, triggerCopied } = useCopyFeedback();

useExportPreview(previewCanvasRef, exportOptions);

const SCALE_OPTIONS = [1, 2, 3] as const;

const isExporting = shallowRef(false);

// File size estimate (debounced)
const fileSizeEstimate = shallowRef<string | null>(null);

const { start: startSizeEstimate } = useTimeoutFn(
  () => {
    if (isEmpty.value) {
      fileSizeEstimate.value = null;
      return;
    }
    tryCatch(exportToBlob(exportOptions.value)).then(([err, blob]) => {
      if (err || !blob) return;
      const kb = blob.size / 1024;
      fileSizeEstimate.value =
        kb >= 1024 ? `~${(kb / 1024).toFixed(1)} MB` : `~${Math.round(kb)} KB`;
    });
  },
  300,
  { immediate: false },
);

watch(
  exportOptions,
  () => {
    startSizeEstimate();
  },
  { immediate: true },
);

async function handleExportPng(): Promise<void> {
  isExporting.value = true;
  const [err, blob] = await tryCatch(exportToBlob(exportOptions.value));
  isExporting.value = false;
  if (err || !blob) return;
  downloadBlob(blob, `${filename.value}.png`);
}

async function handleCopyToClipboard(): Promise<void> {
  isExporting.value = true;
  const [blobErr, blob] = await tryCatch(exportToBlob(exportOptions.value));
  if (blobErr || !blob) {
    isExporting.value = false;
    return;
  }
  const [copyErr] = await tryCatch(copyImageToClipboard(blob));
  isExporting.value = false;
  if (copyErr) return;
  triggerCopied();
}
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <div class="export-dialog">
        <!-- Close button -->
        <button class="export-dialog__close" aria-label="Close (Esc)" @click="close">
          <UIcon name="i-lucide-x" class="size-3.5" />
        </button>
        <span class="export-dialog__close-hint">Esc</span>

        <!-- Body — two columns -->
        <div class="export-dialog__body">
          <!-- Left: Preview -->
          <div class="export-dialog__preview-col">
            <div class="export-dialog__preview-frame">
              <div v-if="isEmpty" class="export-dialog__empty-state">
                <UIcon name="i-lucide-image-off" class="size-10" />
                <span>Nothing to export</span>
              </div>
              <canvas v-else ref="previewCanvas" />
            </div>

            <!-- Dimensions + file size -->
            <div v-if="dimensions" class="mt-2.5 flex items-center justify-center gap-3.5">
              <span class="font-mono text-[0.7rem] text-foreground/50">
                {{ dimensions.width }} × {{ dimensions.height }}
              </span>
              <span v-if="fileSizeEstimate" class="export-dialog__dim-sep" />
              <span v-if="fileSizeEstimate" class="font-mono text-[0.7rem] text-foreground/50">
                {{ fileSizeEstimate }}
              </span>
            </div>
          </div>

          <!-- Right: Options -->
          <div class="export-dialog__options-col">
            <h2 class="mb-4 text-lg font-bold">Export image</h2>

            <!-- Only selected (always visible, disabled when no selection) -->
            <div class="export-dialog__option-row">
              <span class="export-dialog__option-label">Only selected</span>
              <USwitch v-model="onlySelected" :disabled="!hasSelection" />
            </div>

            <!-- Background -->
            <div class="export-dialog__option-row">
              <span class="export-dialog__option-label">Background</span>
              <USwitch v-model="background" />
            </div>

            <!-- Dark mode -->
            <div class="export-dialog__option-row">
              <span class="export-dialog__option-label">Dark mode</span>
              <USwitch v-model="darkMode" />
            </div>

            <!-- Embed scene -->
            <div class="export-dialog__option-row">
              <span class="export-dialog__option-label">
                Embed scene
                <span
                  class="export-dialog__tooltip-trigger"
                  data-tip="Embeds scene data into the exported file so it can be re-imported and edited later."
                  >?</span
                >
              </span>
              <USwitch v-model="embedScene" disabled />
            </div>

            <!-- Scale selector -->
            <div class="export-dialog__option-row pt-3 pb-1">
              <span class="export-dialog__option-label">Scale</span>
              <div class="flex gap-0 rounded-[10px] border border-edge/20 bg-surface p-[3px]">
                <button
                  v-for="s in SCALE_OPTIONS"
                  :key="s"
                  class="export-dialog__scale-btn"
                  :class="{ 'export-dialog__scale-btn--active': scale === s }"
                  @click="scale = s"
                >
                  {{ s }}×
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer — action buttons -->
        <div class="export-dialog__footer">
          <div class="export-dialog__footer-spacer" />
          <UButton
            color="primary"
            :loading="isExporting"
            :disabled="isEmpty"
            icon="i-lucide-download"
            @click="handleExportPng"
          >
            PNG
          </UButton>
          <UButton color="primary" disabled icon="i-lucide-download"> SVG </UButton>
          <UButton
            color="neutral"
            variant="outline"
            :loading="isExporting"
            :disabled="isEmpty"
            :icon="showCopied ? 'i-lucide-check' : 'i-lucide-clipboard'"
            @click="handleCopyToClipboard"
          >
            {{ showCopied ? "Copied!" : "Copy to clipboard" }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.export-dialog {
  position: relative;
  padding: 0;
}

.export-dialog__close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(52 63 96 / 0.6);
  color: rgb(234 237 243 / 0.5);
  border: none;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
  z-index: 10;
}

.export-dialog__close:hover {
  background: rgb(52, 63, 96);
  color: rgb(234, 237, 243);
}

.export-dialog__close-hint {
  font-family: ui-monospace, monospace;
  font-size: 0.55rem;
  color: rgb(234 237 243 / 0.5);
  position: absolute;
  top: 48px;
  right: 18px;
  letter-spacing: 0.04em;
  opacity: 0.6;
  z-index: 10;
}

.export-dialog__body {
  display: flex;
  gap: 0;
  padding: 22px;
  padding-bottom: 0;
}

.export-dialog__preview-col {
  flex: 1.35;
  min-width: 0;
  padding-right: 24px;
}

.export-dialog__preview-frame {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 10px;
  border: 1.5px dashed rgb(171 75 153 / 0.35);
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(38, 44, 62);
  background-image:
    linear-gradient(45deg, rgb(0 0 0 / 0.08) 25%, transparent 25%),
    linear-gradient(-45deg, rgb(0 0 0 / 0.08) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgb(0 0 0 / 0.08) 75%),
    linear-gradient(-45deg, transparent 75%, rgb(0 0 0 / 0.08) 75%);
  background-size: 16px 16px;
  background-position:
    0 0,
    0 8px,
    8px -8px,
    -8px 0;
}

.export-dialog__empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgb(234 237 243 / 0.3);
  font-size: 0.85rem;
}

.export-dialog__dim-sep {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgb(171 75 153 / 0.3);
}

.export-dialog__options-col {
  flex: 0.75;
  display: flex;
  flex-direction: column;
  min-width: 220px;
}

.export-dialog__option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgb(171 75 153 / 0.07);
}

.export-dialog__option-row:last-child {
  border-bottom: none;
}

.export-dialog__option-label {
  font-size: 0.88rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgb(234, 237, 243);
}

.export-dialog__tooltip-trigger {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 1.5px solid rgb(234 237 243 / 0.5);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.55rem;
  font-weight: 700;
  color: rgb(234 237 243 / 0.5);
  cursor: help;
  position: relative;
  line-height: 1;
  transition:
    border-color 0.15s,
    color 0.15s;
}

.export-dialog__tooltip-trigger:hover {
  border-color: rgb(255, 107, 237);
  color: rgb(255, 107, 237);
}

.export-dialog__tooltip-trigger::after {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  background: rgb(52, 63, 96);
  color: rgb(234, 237, 243);
  font-size: 0.72rem;
  font-weight: 400;
  padding: 8px 12px;
  border-radius: 6px;
  width: 220px;
  white-space: normal;
  line-height: 1.45;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.35);
  border: 1px solid rgb(171 75 153 / 0.15);
}

.export-dialog__tooltip-trigger:hover::after {
  opacity: 1;
}

.export-dialog__scale-btn {
  appearance: none;
  border: none;
  background: transparent;
  color: rgb(234 237 243 / 0.5);
  font-family: ui-monospace, monospace;
  font-size: 0.76rem;
  font-weight: 500;
  padding: 5px 14px;
  border-radius: 7px;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s,
    box-shadow 0.2s;
}

.export-dialog__scale-btn:hover {
  color: rgb(234, 237, 243);
}

.export-dialog__scale-btn--active {
  background: rgb(255, 107, 237);
  color: white;
  box-shadow: 0 2px 10px rgb(255 107 237 / 0.25);
}

.export-dialog__footer {
  display: flex;
  gap: 10px;
  padding: 16px 22px 20px;
  border-top: 1px solid rgb(171 75 153 / 0.08);
  margin-top: 18px;
}

.export-dialog__footer-spacer {
  flex: 1;
}

@media (max-width: 700px) {
  .export-dialog__body {
    flex-direction: column;
    gap: 20px;
  }

  .export-dialog__preview-col {
    padding-right: 0;
  }

  .export-dialog__options-col {
    min-width: 0;
  }

  .export-dialog__footer {
    flex-wrap: wrap;
  }

  .export-dialog__footer-spacer {
    display: none;
  }
}
</style>
