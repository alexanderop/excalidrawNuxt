<script setup lang="ts">
import { DrawVue } from "@drawvue/core";
import CommandPalette from "~/features/command-palette/CommandPalette.vue";
import DrawingToolbar from "~/features/tools/components/DrawingToolbar.vue";
import PropertiesPanel from "~/features/properties/components/PropertiesPanel.vue";
import BottomBar from "~/features/canvas/components/BottomBar.vue";
</script>

<template>
  <DrawVue>
    <template #toolbar>
      <DrawingToolbar />
    </template>

    <template
      #properties="{ selectedElements, activeTool, showToolProperties, onWillChange, onMarkDirty }"
    >
      <PropertiesPanel
        v-if="selectedElements.length > 0 || showToolProperties"
        :selected-elements="selectedElements"
        :active-tool="activeTool"
        @will-change="onWillChange"
        @mark-dirty="onMarkDirty"
      />
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
    <CommandPalette />
  </DrawVue>
</template>
