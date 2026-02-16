<script setup lang="ts">
import { DrawVue } from "@drawvue/core";
import PersistenceProvider from "~/features/persistence/PersistenceProvider.vue";
import DrawingToolbar from "~/features/tools/components/DrawingToolbar.vue";
import BottomBar from "~/features/canvas/components/BottomBar.vue";
</script>

<template>
  <DrawVue>
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
    <PersistenceProvider />
  </DrawVue>
</template>
