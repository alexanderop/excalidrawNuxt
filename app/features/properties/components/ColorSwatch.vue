<script setup lang="ts">
import { ref, computed, watch, nextTick, useTemplateRef } from 'vue'
import { useEventListener, whenever } from '@vueuse/core'
import { COLOR_PALETTE, COLOR_NAMES, getTopPickColors, isStandardColor } from '../palette'
import type { ColorName } from '../palette'
import { useStyleDefaults } from '../composables/useStyleDefaults'

type ShadeIndex = 0 | 1 | 2 | 3 | 4

const { color, label } = defineProps<{
  color: string
  label: string
}>()

const emit = defineEmits<{
  'update:color': [color: string]
}>()

const HEX_REGEX = /^#[\da-f]{6}$/i
const MAX_RECENT = 10

const isPickerOpen = ref(false)
const hexInput = ref('')
const hexInputRef = useTemplateRef<HTMLInputElement>('hexInputRef')

const { recentColors } = useStyleDefaults()
const topPicks = getTopPickColors()

const isTransparent = computed(() => color === 'transparent')
const isMixed = computed(() => color === 'mixed')

const swatchStyle = computed(() => {
  if (isTransparent.value || isMixed.value) return {}
  return { backgroundColor: color }
})

const pickerModelValue = computed(() =>
  color === 'mixed' ? '#000000' : color,
)

const activeHue = computed(() => {
  const current = pickerModelValue.value.toLowerCase()
  for (const name of COLOR_NAMES) {
    for (const shade of COLOR_PALETTE[name]) {
      if (shade.toLowerCase() === current) return name
    }
  }
  return null
})

// Sync hex input when model changes
watch(
  () => color,
  (val) => {
    if (val !== 'transparent' && val !== 'mixed') {
      hexInput.value = val
    }
  },
  { immediate: true },
)

// Focus hex input when picker opens
whenever(
  () => isPickerOpen.value,
  async () => {
    await nextTick()
    hexInputRef.value?.focus()
  },
)

function selectColor(c: string): void {
  addToRecentIfCustom(c)
  emit('update:color', c)
  isPickerOpen.value = false
}

function onHexSubmit(): void {
  const normalized = hexInput.value.startsWith('#') ? hexInput.value : `#${hexInput.value}`
  if (!HEX_REGEX.test(normalized)) return
  selectColor(normalized.toLowerCase())
}

function addToRecentIfCustom(c: string): void {
  if (isStandardColor(c)) return
  const lower = c.toLowerCase()
  const filtered = recentColors.value.filter(rc => rc.toLowerCase() !== lower)
  recentColors.value = [lower, ...filtered].slice(0, MAX_RECENT)
}

function isActive(c: string): boolean {
  return c.toLowerCase() === pickerModelValue.value.toLowerCase()
}

function getShadeColor(name: ColorName, shadeOneIndexed: number): string {
  return COLOR_PALETTE[name][(shadeOneIndexed - 1) as ShadeIndex]
}

// Keyboard: 1-5 for shade quick-pick (Escape handled by UPopover)
if (typeof document !== 'undefined') {
  useEventListener(document, 'keydown', (e: KeyboardEvent) => {
    if (!isPickerOpen.value) return

    const shadeIndex = (Number(e.key) - 1) as ShadeIndex
    if (shadeIndex >= 0 && shadeIndex <= 4 && activeHue.value) {
      e.preventDefault()
      selectColor(COLOR_PALETTE[activeHue.value][shadeIndex])
    }
  })
}
</script>

<template>
  <UPopover
    v-model:open="isPickerOpen"
    :content="{ side: 'right', align: 'start', sideOffset: 8 }"
  >
    <button
      :aria-label="label"
      :title="label"
      class="relative flex h-7 w-7 items-center justify-center rounded border transition-colors"
      :class="isPickerOpen ? 'border-accent' : 'border-edge/40 hover:border-edge'"
    >
      <!-- Checkerboard for transparent -->
      <span
        v-if="isTransparent"
        class="absolute inset-0.5 rounded-sm"
        style="background-image: repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%); background-size: 6px 6px;"
      />
      <!-- Diagonal line over checkerboard for transparent -->
      <svg
        v-if="isTransparent"
        class="relative h-full w-full"
        viewBox="0 0 24 24"
      >
        <line
          x1="4"
          y1="20"
          x2="20"
          y2="4"
          stroke="red"
          stroke-width="2"
        />
      </svg>
      <!-- Question mark for mixed -->
      <span
        v-else-if="isMixed"
        class="text-xs font-bold text-foreground/50"
      >?</span>
      <!-- Color swatch -->
      <span
        v-else
        class="absolute inset-0.5 rounded-sm"
        :style="swatchStyle"
      />
    </button>

    <template #content>
      <div
        class="flex w-64 flex-col gap-2 p-3"
        role="dialog"
        aria-label="Color picker"
      >
        <!-- Top picks row -->
        <div class="flex flex-wrap gap-1">
          <button
            v-for="c in topPicks"
            :key="c"
            :aria-label="c"
            class="relative flex h-6 w-6 items-center justify-center rounded border transition-colors"
            :class="isActive(c) ? 'border-accent ring-1 ring-accent' : 'border-edge/40 hover:border-edge'"
            @click="selectColor(c)"
          >
            <!-- Transparent swatch -->
            <template v-if="c === 'transparent'">
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
              :style="{ backgroundColor: c }"
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
              v-for="c in recentColors"
              :key="c"
              :aria-label="`Recent: ${c}`"
              class="h-6 w-6 rounded border transition-colors"
              :class="isActive(c) ? 'border-accent ring-1 ring-accent' : 'border-edge/40 hover:border-edge'"
              :style="{ backgroundColor: c }"
              @click="selectColor(c)"
            />
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>
