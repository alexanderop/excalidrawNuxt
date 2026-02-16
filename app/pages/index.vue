<script setup lang="ts">
import { ref, useTemplateRef } from "vue";
import { DrawVue } from "@drawvue/core";
import CommandPalette from "~/features/command-palette/CommandPalette.vue";
import DevInspector from "~/features/dev-inspector/DevInspector.vue";
import ImageActions from "~/features/image/ImageActions.vue";
import PersistenceProvider from "~/features/persistence/PersistenceProvider.vue";
import DrawingToolbar from "~/features/tools/components/DrawingToolbar.vue";
import PropertiesPanel from "~/features/properties/components/PropertiesPanel.vue";
import BottomBar from "~/features/canvas/components/BottomBar.vue";

const drawvueRef = useTemplateRef<InstanceType<typeof DrawVue>>("drawvue");
const isRestored = ref(false);
</script>

<template>
  <div :style="{ pointerEvents: isRestored ? 'auto' : 'none' }">
    <UContextMenu :items="drawvueRef?.contextMenuItems ?? []">
      <DrawVue ref="drawvue">
        <template #toolbar>
          <DrawingToolbar />
        </template>

        <template #bottom-bar="{ zoom, canUndo, canRedo, zoomIn, zoomOut, zoomReset, undo, redo }">
          <BottomBar
            :zoom="zoom"
            :can-undo="canUndo"
            :can-redo="canRedo"
            @zoom-in="zoomIn"
            @zoom-out="zoomOut"
            @zoom-reset="zoomReset"
            @undo="undo"
            @redo="redo"
          />
        </template>

        <template
          #properties="{
            selectedElements,
            activeTool,
            showToolProperties,
            onWillChange,
            onMarkDirty,
          }"
        >
          <PropertiesPanel
            v-if="selectedElements.length > 0 || showToolProperties"
            :selected-elements="selectedElements"
            :active-tool="activeTool"
            @will-change="onWillChange"
            @mark-dirty="onMarkDirty"
          />
        </template>
        <CommandPalette />
        <DevInspector />
        <ImageActions />
        <PersistenceProvider @restored="isRestored = true" />
      </DrawVue>
    </UContextMenu>
  </div>
</template>
