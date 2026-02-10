# Vue Design Patterns

Concise reference for component design, refactoring, and planning. Based on Michael Thiessen's patterns, adapted for our Nuxt 4 / Vue 3.5+ codebase.

## 1. Data Store Pattern

Global reactive state in a composable. Expose only what consumers need via `toRefs` and `readonly`.

```ts
const state = reactive({ darkMode: false, theme: 'nord' })

export function useSettings() {
  const { darkMode } = toRefs(state)
  const changeTheme = (t: string) => { state.theme = t }
  return { darkMode, theme: readonly(toRef(state, 'theme')), changeTheme }
}
```

**When:** Shared state across features without Pinia. Used for `useElements`, `useSelection`, `useViewport`. For truly global singletons, prefer `createGlobalState` from VueUse (see pattern below).

## 2. Thin Composables

Separate reactivity from business logic. The composable is a thin reactive wrapper around pure functions.

```ts
// pure function — easy to unit test
export function convertToFahrenheit(c: number): number { return c * 9 / 5 + 32 }

// thin composable — only wiring
export function useTemperatureConverter(celsius: Ref<number>) {
  const fahrenheit = ref(convertToFahrenheit(celsius.value))
  watch(celsius, (c) => { fahrenheit.value = convertToFahrenheit(c) })
  return { fahrenheit }
}
```

**When:** Complex calculations, validators, transformers. Keep the pure function in a separate file for isolated testing.

## 3. Humble Components

Components that only render props and emit events. Zero business logic.

```vue
<script setup lang="ts">
defineProps<{ label: string; active: boolean }>()
defineEmits<{ select: [] }>()
</script>
<template>
  <button :class="{ active }" @click="$emit('select')">{{ label }}</button>
</template>
```

**When:** Any leaf UI component. Pair with Controller Components (#8) for orchestration. Example: `DrawingToolbar.vue` renders tool buttons and emits clicks — zero business logic.

## 4. Extract Conditional

Replace inline `v-if`/`v-else` blocks with named components to improve readability.

```vue
<!-- before -->
<div v-if="isEditing"><!-- 40 lines --></div>
<div v-else><!-- 30 lines --></div>

<!-- after -->
<EditingView v-if="isEditing" />
<DisplayView v-else />
```

**When:** Each branch exceeds ~10 lines of template code.

## 5. Extract Composable

Pull logic out of components into composables — even for single-use. Keeps components focused on template rendering.

**When:** A component's `<script setup>` grows beyond ~30 lines of logic, or the logic is testable in isolation.

## 6. List Component Pattern

Abstract `v-for` loops into a dedicated list component to keep the parent clean.

```vue
<!-- parent -->
<TaskList :tasks="tasks" @remove="removeTask" />

<!-- TaskList.vue -->
<TaskItem v-for="task in tasks" :key="task.id" :task="task" @remove="$emit('remove', task.id)" />
```

**When:** The loop body is more than a few lines, or the list needs its own empty/loading states.

## 7. Preserve Object Pattern

Pass an entire object as a single prop instead of destructuring into many props.

```vue
<CustomerCard :customer="customer" />
<!-- NOT: <CustomerCard :name="customer.name" :email="customer.email" :phone="customer.phone" /> -->
```

**When:** Props are tightly coupled and always come from the same source. Avoid for generic/reusable components that shouldn't depend on a specific shape.

## 8. Controller Components

Orchestrators that wire composables (logic) to Humble Components (UI). No template markup of their own beyond child components.

```vue
<script setup lang="ts">
import { useTasks } from '~/features/tasks/composables/useTasks'
const { tasks, addTask, removeTask } = useTasks()
</script>
<template>
  <TaskInput @add="addTask" />
  <TaskList :tasks="tasks" @remove="removeTask" />
</template>
```

**When:** Pages and feature entry points. Maps directly to our `app/pages/` and feature root components.

## 9. Strategy Pattern

Use `<component :is>` with a computed to dynamically select components at runtime.

```vue
<component :is="activeRenderer" v-bind="elementProps" />
```

**When:** Rendering varies by type (element renderers, tool panels, form field types). Not currently used — our rendering pipeline uses pure canvas functions (`renderElement`, `renderScene`) rather than Vue dynamic components.

## 10. Hidden Components

Split a component when different call-sites use mutually exclusive subsets of its props.

```vue
<!-- If some callers pass chart props and others pass table props, split into two -->
<ChartDisplay :data="data" :options="chartOptions" />
<TableDisplay :data="data" :settings="tableSettings" />
```

**When:** You see prop groups that never overlap across usages.

## 11. Insider Trading (Inline Child)

If a child component receives *all* of its parent's props and re-emits *all* events, it adds no value — inline it back into the parent.

**When:** A child is just a pass-through wrapper with no independent logic or reuse.

## 12. Long Components

If a component is hard to understand at a glance, break it into named sub-components. The names serve as documentation.

**When:** Template exceeds ~100 lines or has clearly separable sections.

---

## Decision Flowchart

```mermaid
flowchart TD
    A[Component too complex?] -->|Template too long| B[Extract Conditional / Long Components]
    A -->|Script too long| C[Extract Composable]
    A -->|Both| D[Controller + Humble Components]
    C -->|Has pure logic| E[Thin Composable]
    C -->|Only reactive state| F[Data Store Pattern]
    C -->|Shared singleton| G2[createGlobalState]
    B -->|Has v-for| G[List Component]
    B -->|Has v-if/v-else| H[Extract Conditional]
    D -->|Circular init order| I2[Deferred Binding / Options Object]
```

## Codebase-Specific Patterns

### 13. Options Object Pattern

Every composable accepts a single options object with typed interface. Enables spreading shared context across multiple composables.

```ts
interface UsePanningOptions {
  canvasRef: Readonly<Ref<HTMLCanvasElement | null>>
  panBy: (dx: number, dy: number) => void
  zoomBy: (delta: number, center?: GlobalPoint) => void
  activeTool: ShallowRef<ToolType>
}

export function usePanning(options: UsePanningOptions): UsePanningReturn { ... }
```

In `CanvasContainer.vue`, shared deps are spread into multiple composables:
```ts
const shared = { canvasRef, toScene, zoom, elements, suggestedBindings, markStaticDirty, markInteractiveDirty }
const { ... } = useMultiPointCreation({ ...shared, onFinalize() { setTool('selection') } })
const { ... } = useLinearEditor({ ...shared, select })
```

**When:** Always — our convention for composable APIs.

### 14. Global Singleton via `createGlobalState`

VueUse's `createGlobalState` wraps a composable so the first call initializes state and subsequent calls return the same instance. Used instead of module-level `reactive()` for singletons that need VueUse utilities internally.

```ts
export const useToolStore = createGlobalState(() => {
  const activeTool = shallowRef<ToolType>('selection')
  // ...keyboard shortcuts via useEventListener
  return { activeTool, setTool, onBeforeToolChange, $reset }
})
```

**Where:** `useToolStore`, `useTheme`, `useShikiHighlighter`.

### 15. Deferred Binding Pattern

When composables have circular initialization order (A needs B's output, B needs A's output), create a proxy object with no-op stubs that gets "bound" to real implementations later.

```ts
export function createDirtyFlags(): DirtyFlags {
  let _static = noop
  return {
    markStaticDirty: () => _static(),
    bind(impl) { _static = impl.markStaticDirty },
  }
}

// In CanvasContainer.vue:
const dirty = createDirtyFlags()
// ...pass dirty.markStaticDirty to composables created before renderer...
const { markStaticDirty } = useSceneRenderer(...)
dirty.bind({ markStaticDirty, ... })  // Late-bind real fns
```

**Where:** `createDirtyFlags` in `app/features/canvas/composables/`.

### 16. Event Hook Pattern

VueUse's `createEventHook` provides pub/sub within composables. Used for lifecycle signals that cross composable boundaries.

```ts
const { on: onBeforeToolChange, trigger: triggerBeforeChange } = createEventHook<void>()
// Consumer subscribes:
onBeforeToolChange(() => { /* finalize in-progress operations */ })
```

**Where:** `useToolStore.onBeforeToolChange` — subscribed in `CanvasContainer.vue` to finalize multi-point, linear editor, and text editing before tool switch.

---

## Mapping to Our Codebase

| Pattern | Where we use it |
|---|---|
| Data Store | `useElements`, `useSelection`, `useViewport`, `useGroups` |
| Thin Composable | Pure math in `app/shared/math.ts`, coord transforms in `canvas/coords.ts`, composables wrap them |
| Humble Component | `DrawingToolbar.vue` |
| Controller Component | `CanvasContainer.vue` (orchestrates 10+ composables) |
| Strategy Pattern | Not currently used (rendering is via pure canvas functions) |
| Extract Composable | Every `use*.ts` in `features/*/composables/` and `features/*/` |
| Options Object | All composables: `useRenderer`, `usePanning`, `useDrawingInteraction`, etc. |
| Global Singleton | `useToolStore`, `useTheme`, `useShikiHighlighter` (via `createGlobalState`) |
| Deferred Binding | `createDirtyFlags` in canvas composables |
| Event Hook | `onBeforeToolChange` in `useToolStore` |
