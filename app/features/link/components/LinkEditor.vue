<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useDrawVue } from "@drawvue/core";
import { useLinkEditor } from "../composables/useLinkEditor";

const ctx = useDrawVue();
const popoverRef = useTemplateRef<HTMLDivElement>("popover");
const inputRef = useTemplateRef<HTMLInputElement>("linkInput");
const { editingId, position, linkValue, hasExistingLink, removeLink, handleKeydown } =
  useLinkEditor(ctx, { inputRef, popoverRef });
</script>

<template>
  <div
    v-if="editingId && position"
    ref="popover"
    class="absolute z-5 flex min-w-70 -translate-x-1/2 -translate-y-full flex-col rounded-lg border border-edge bg-surface p-1.5 shadow-lg"
    :style="{
      left: position.x + 'px',
      top: position.y + 'px',
    }"
    @pointerdown.stop
    @keydown.stop
  >
    <div class="flex items-center gap-1">
      <input
        ref="linkInput"
        v-model="linkValue"
        type="url"
        placeholder="https://..."
        class="h-8 flex-1 rounded-md border border-edge bg-transparent px-2 text-[13px] text-foreground outline-none placeholder:text-foreground/35 focus:border-accent"
        @keydown="handleKeydown"
      />
      <UButton
        v-if="hasExistingLink"
        variant="ghost"
        color="neutral"
        size="xs"
        square
        icon="i-lucide-trash-2"
        aria-label="Remove link"
        class="text-foreground/60 hover:bg-red-500/15 hover:text-red-500"
        @click="removeLink"
      />
    </div>
  </div>
</template>
