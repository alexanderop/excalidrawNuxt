<script setup lang="ts">
import { computed } from "vue";
import { useImageActions } from "~/composables/useImageActions";

const { status, downloadProgress, isProcessing } = useImageActions();

const statusLabel = computed(() => {
  if (status.value === "downloading") return "Downloading AI model…";
  if (status.value === "processing") return "Removing background…";
  return "";
});

const progressPercent = computed(() => {
  if (status.value !== "downloading") return null;
  return downloadProgress.value.percent;
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isProcessing"
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

          <!-- Progress bar (download phase only) -->
          <template v-if="progressPercent !== null">
            <div class="h-1.5 w-48 overflow-hidden rounded-full bg-base">
              <div
                class="h-full rounded-full bg-accent transition-all duration-300 ease-out"
                :style="{ width: `${progressPercent}%` }"
              />
            </div>
            <p class="text-xs text-foreground/60">{{ progressPercent }}%</p>
          </template>
        </div>
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
