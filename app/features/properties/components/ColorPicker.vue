<script setup lang="ts">
import { ref, computed, watch, nextTick, useTemplateRef } from 'vue'
import { onClickOutside, useEventListener } from '@vueuse/core'
import { COLOR_PALETTE, COLOR_NAMES, getTopPickColors, isStandardColor } from '../palette'
import type { ColorName } from '../palette'
import { useStyleDefaults } from '../composables/useStyleDefaults'

type ShadeIndex = 0 | 1 | 2 | 3 | 4

const { modelValue, isOpen, positionTop, positionLeft } = defineProps<{
  modelValue: string
  isOpen: boolean
  positionTop: number
  positionLeft: number
}>()

const emit = defineEmits<{
  'update:modelValue': [color: string]
  close: []
}>()

const HEX_REGEX = /^#[\da-f]{6}$/i
const MAX_RECENT = 10

const pickerRef = useTemplateRef<HTMLElement>('pickerRef')
const hexInput = ref('')
const hexInputRef = useTemplateRef<HTMLInputElement>('hexInputRef')

const { recentColors } = useStyleDefaults()
const topPicks = getTopPickColors()

const activeHue = computed(() => {
  const current = modelValue.toLowerCase()
  for (const name of COLOR_NAMES) {
    for (const shade of COLOR_PALETTE[name]) {
      if (shade.toLowerCase() === current) return name
    }
  }
  return null
})

// Sync hex input when model changes
watch(
  () => modelValue,
  (val) => {
    if (val !== 'transparent' && val !== 'mixed') {
      hexInput.value = val
    }
  },
  { immediate: true },
)

// Focus hex input when picker opens
watch(
  () => isOpen,
  async (open) => {
    if (!open) return
    await nextTick()
    hexInputRef.value?.focus()
  },
)

onClickOutside(pickerRef, () => {
  if (isOpen) emit('close')
})

function selectColor(color: string): void {
  addToRecentIfCustom(color)
  emit('update:modelValue', color)
  emit('close')
}

function onHexSubmit(): void {
  const normalized = hexInput.value.startsWith('#') ? hexInput.value : `#${hexInput.value}`
  if (!HEX_REGEX.test(normalized)) return
  selectColor(normalized.toLowerCase())
}

function addToRecentIfCustom(color: string): void {
  if (isStandardColor(color)) return
  const lower = color.toLowerCase()
  const filtered = recentColors.value.filter(c => c.toLowerCase() !== lower)
  recentColors.value = [lower, ...filtered].slice(0, MAX_RECENT)
}

function isActive(color: string): boolean {
  if (color === 'transparent' && modelValue === 'transparent') return true
  return color.toLowerCase() === modelValue.toLowerCase()
}

function getShadeColor(name: ColorName, shadeOneIndexed: number): string {
  return COLOR_PALETTE[name][(shadeOneIndexed - 1) as ShadeIndex]
}

// Keyboard: Escape to close, 1-5 for shade quick-pick
if (typeof document !== 'undefined') {
  useEventListener(document, 'keydown', (e: KeyboardEvent) => {
    if (!isOpen) return

    if (e.key === 'Escape') {
      e.preventDefault()
      emit('close')
      return
    }

    // Shade quick-pick: keys 1-5 select shade of active hue
    const shadeIndex = (Number(e.key) - 1) as ShadeIndex
    if (shadeIndex >= 0 && shadeIndex <= 4 && activeHue.value) {
      e.preventDefault()
      selectColor(COLOR_PALETTE[activeHue.value][shadeIndex])
    }
  })
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      ref="pickerRef"
      class="fixed z-50 flex w-64 flex-col gap-2 rounded-lg border border-edge/40 bg-surface p-3 shadow-xl"
      :style="{ top: `${positionTop}px`, left: `${positionLeft}px` }"
      role="dialog"
      aria-label="Color picker"
    >
      <!-- Top picks row -->
      <div class="flex flex-wrap gap-1">
        <button
          v-for="color in topPicks"
          :key="color"
          :aria-label="color"
          class="relative flex h-6 w-6 items-center justify-center rounded border transition-colors"
          :class="isActive(color) ? 'border-accent ring-1 ring-accent' : 'border-edge/40 hover:border-edge'"
          @click="selectColor(color)"
        >
          <!-- Transparent swatch -->
          <template v-if="color === 'transparent'">
            <span
              class="absolute inset-0.5 rounded-sm"
              style="background-image: repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%); background-size: 5px 5px;"
            />
            <svg class="relative h-full w-full" viewBox="0 0 24 24">
              <line x1="5" y1="19" x2="19" y2="5" stroke="red" stroke-width="2" />
            </svg>
          </template>
          <!-- Color swatch -->
          <span
            v-else
            class="absolute inset-0.5 rounded-sm"
            :style="{ backgroundColor: color }"
          />
        </button>
      </div>

      <!-- Palette grid: 10 columns x 5 rows -->
      <div class="grid grid-cols-10 gap-1">
        <template v-for="shade in 5" :key="`shade-${shade}`">
          <button
            v-for="name in COLOR_NAMES"
            :key="`${name}-${shade}`"
            :aria-label="`${name} shade ${shade}`"
            class="h-6 w-full rounded border transition-colors"
            :class="isActive(getShadeColor(name, shade)) ? 'border-accent ring-1 ring-accent' : 'border-transparent hover:border-edge/60'"
            :style="{ backgroundColor: getShadeColor(name, shade) }"
            @click="selectColor(getShadeColor(name, shade))"
          />
        </template>
      </div>

      <!-- Hex input -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-foreground/60">#</span>
        <input
          ref="hexInputRef"
          v-model="hexInput"
          type="text"
          maxlength="7"
          placeholder="hex color"
          class="flex-1 rounded border border-edge/40 bg-base px-2 py-1 text-xs text-foreground outline-none focus:border-accent"
          @keydown.enter="onHexSubmit"
        />
      </div>

      <!-- Recent colors -->
      <div
        v-if="recentColors.length > 0"
        class="flex flex-col gap-1"
      >
        <span class="text-xs text-foreground/40">Recent</span>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="color in recentColors"
            :key="color"
            :aria-label="`Recent: ${color}`"
            class="h-6 w-6 rounded border transition-colors"
            :class="isActive(color) ? 'border-accent ring-1 ring-accent' : 'border-edge/40 hover:border-edge'"
            :style="{ backgroundColor: color }"
            @click="selectColor(color)"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>
