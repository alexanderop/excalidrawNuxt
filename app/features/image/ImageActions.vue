<script setup lang="ts">
import { computed, watch, ref } from "vue";
import { useEventListener } from "@vueuse/core";
import { useImageActions } from "~/composables/useImageActions";

const ERROR_DISPLAY_MS = 4000;

const {
  status,
  downloadProgress,
  isAnythingProcessing,
  segStatus,
  segErrorMessage,
  segProgress,
  cancelSegmentation,
} = useImageActions();

const showError = ref(false);

// Show a temporary error toast when segmentation fails
watch(segStatus, (val) => {
  if (val !== "error") return;
  showError.value = true;
  setTimeout(() => {
    showError.value = false;
  }, ERROR_DISPLAY_MS);
});

const statusLabel = computed(() => {
  // Background removal phases
  if (status.value === "downloading") return "Downloading AI model\u2026";
  if (status.value === "processing") return "Removing background\u2026";

  // Segmentation phases
  if (segStatus.value === "downloading") return "Downloading AI model\u2026";
  if (segStatus.value === "processing") return "Detecting objects\u2026";
  if (segStatus.value === "compositing") return "Creating images\u2026";

  return "";
});

const progressPercent = computed(() => {
  // Background removal download
  if (status.value === "downloading") return downloadProgress.value.percent;
  // Segmentation download
  if (segStatus.value === "downloading") return segProgress.value.percent;
  return null;
});

const showCancelHint = computed(() => segStatus.value === "processing");

useEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "Escape" && showCancelHint.value) {
    cancelSegmentation();
  }
});
</script>

<template>
  <Teleport to="body">
    <!-- Processing overlay -->
    <Transition name="fade">
      <div
        v-if="isAnythingProcessing"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <div class="flex flex-col items-center gap-4 rounded-2xl bg-surface px-10 py-8 shadow-2xl">
          <!-- Spinner -->
          <div class="relative size-12">
            <svg class="size-12 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="3"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>

          <!-- Status text -->
          <p class="text-sm font-medium text-foreground">
            {{ statusLabel }}
          </p>

          <!-- Progress bar (download + decoding phases) -->
          <template v-if="progressPercent !== null">
            <div class="h-1.5 w-48 overflow-hidden rounded-full bg-base">
              <div
                class="h-full rounded-full bg-accent transition-all duration-300 ease-out"
                :style="{ width: `${progressPercent}%` }"
              />
            </div>
            <p class="text-xs text-foreground/60">{{ progressPercent }}%</p>
          </template>

          <!-- Cancel hint -->
          <p v-if="showCancelHint" class="text-xs text-foreground/40">Press Escape to cancel</p>
        </div>
      </div>
    </Transition>

    <!-- Error toast -->
    <Transition name="fade">
      <div
        v-if="showError"
        class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-red-900/90 px-6 py-3 text-sm text-white shadow-lg"
      >
        {{ segErrorMessage || "Object segmentation failed." }}
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
