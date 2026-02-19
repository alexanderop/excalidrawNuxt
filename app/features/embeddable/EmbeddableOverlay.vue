<script setup lang="ts">
import { computed } from "vue";
import { useDrawVue, getEmbedData, useTheme } from "@drawvue/core";
import type { EmbedData } from "@drawvue/core";

const ctx = useDrawVue();
const { theme } = useTheme();
const viewport = computed(() => ctx.viewport.value);
const activeEmbeddable = computed(() => ctx.embeddable.value?.activeEmbeddable.value ?? null);

function isActive(id: string): boolean {
  return activeEmbeddable.value?.elementId === id && activeEmbeddable.value?.state === "active";
}

function isHovered(id: string): boolean {
  return activeEmbeddable.value?.elementId === id && activeEmbeddable.value?.state === "hover";
}

type OverlayEntry = {
  id: string;
  url: string;
  embedData: EmbedData;
  screenX: number;
  screenY: number;
  screenW: number;
  screenH: number;
};

const overlayEntries = computed<OverlayEntry[]>(() => {
  const vp = viewport.value;
  if (!vp) return [];

  const entries: OverlayEntry[] = [];

  for (const el of ctx.elements.elements.value) {
    if (el.isDeleted) continue;
    if (el.type !== "embeddable") continue;
    if (!el.link) continue;

    const embedData = getEmbedData(el.link);
    if (!embedData) continue;

    const topLeft = vp.toScreen(el.x, el.y);
    const bottomRight = vp.toScreen(el.x + el.width, el.y + el.height);

    entries.push({
      id: el.id,
      url: el.link,
      embedData,
      screenX: topLeft[0],
      screenY: topLeft[1],
      screenW: bottomRight[0] - topLeft[0],
      screenH: bottomRight[1] - topLeft[1],
    });
  }

  return entries;
});

function getSandboxAttr(entry: OverlayEntry): string {
  const parts = ["allow-scripts", "allow-popups", "allow-popups-to-escape-sandbox"];
  if (entry.embedData.sandbox.allowSameOrigin) {
    parts.push("allow-same-origin");
  }
  return parts.join(" ");
}
</script>

<template>
  <div class="embeddable-overlay">
    <div
      v-for="entry in overlayEntries"
      :key="entry.id"
      class="embeddable-frame-wrapper"
      :style="{
        left: entry.screenX + 'px',
        top: entry.screenY + 'px',
        width: entry.screenW + 'px',
        height: entry.screenH + 'px',
      }"
    >
      <div
        class="embeddable-frame-inner"
        :style="{ pointerEvents: isActive(entry.id) ? 'auto' : 'none' }"
      >
        <iframe
          v-if="entry.embedData.renderType === 'src'"
          :src="entry.embedData.url"
          :sandbox="getSandboxAttr(entry)"
          allow="
            accelerometer;
            autoplay;
            clipboard-write;
            encrypted-media;
            gyroscope;
            picture-in-picture;
          "
          allowfullscreen
          class="embeddable-iframe"
          loading="lazy"
        />
        <iframe
          v-else-if="entry.embedData.renderType === 'srcdoc' && entry.embedData.srcdoc"
          :srcdoc="entry.embedData.srcdoc(theme)"
          :sandbox="getSandboxAttr(entry)"
          class="embeddable-iframe"
          loading="lazy"
        />
      </div>

      <div v-if="isHovered(entry.id)" class="embeddable-hint">Click to interact</div>
    </div>
  </div>
</template>

<style>
.embeddable-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.embeddable-frame-wrapper {
  position: absolute;
  overflow: hidden;
  border-radius: 8px;
  pointer-events: none;
}

.embeddable-frame-inner {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
}

.embeddable-iframe {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 8px;
}

.embeddable-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 6px 16px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  white-space: nowrap;
  pointer-events: none;
}
</style>
