# Reactivity, Lifecycle & Composables

## Reactivity

### ref vs shallowRef

```ts
import { ref, shallowRef } from 'vue'

// ref - deep reactivity (tracks nested changes)
const user = ref({ name: 'John', profile: { age: 30 } })
user.value.profile.age = 31  // Triggers reactivity

// shallowRef - only .value assignment triggers reactivity (better performance)
const data = shallowRef({ items: [] })
data.value.items.push('new')  // Does NOT trigger reactivity
data.value = { items: ['new'] }  // Triggers reactivity
```

**Prefer `shallowRef`** for large data structures or when deep reactivity is unnecessary. In our codebase, `shallowRef` is the default for all non-primitive state — elements arrays, selection sets, DOM contexts, new-element refs, etc. Only use `ref` when you genuinely need deep tracking (rare).

### computed

```ts
import { ref, computed } from 'vue'

const count = ref(0)

// Read-only computed
const doubled = computed(() => count.value * 2)

// Writable computed
const plusOne = computed({
  get: () => count.value + 1,
  set: (val) => { count.value = val - 1 }
})
```

### reactive & readonly

```ts
import { reactive, readonly } from 'vue'

const state = reactive({ count: 0, nested: { value: 1 } })
state.count++  // Reactive

const readonlyState = readonly(state)
readonlyState.count++  // Warning, mutation blocked
```

Note: `reactive()` loses reactivity on destructuring. Use `ref()` or `toRefs()`.

### markRaw & toRaw

Prevent Vue from making objects reactive. Essential for non-serializable DOM objects.

```ts
import { markRaw, toRaw, shallowRef } from 'vue'

// markRaw — wrap before assigning to reactive state
const ctx = canvas.getContext('2d')
ctxRef.value = markRaw(ctx)  // Vue won't proxy this

// toRaw — unwrap when passing to external APIs
const rawCtx = toRaw(layer.ctx.value)
rawCtx.fillRect(0, 0, w, h)
```

**In our codebase:** `useCanvasLayers` uses `markRaw` on `CanvasRenderingContext2D` and `RoughCanvas` instances. `useRenderer` uses `toRaw` when reading them back for rendering.

## Watchers

### watch

```ts
import { ref, watch } from 'vue'

const count = ref(0)

// Watch single ref
watch(count, (newVal, oldVal) => {
  console.log(`Changed from ${oldVal} to ${newVal}`)
})

// Watch getter
watch(
  () => props.id,
  (id) => fetchData(id),
  { immediate: true }
)

// Watch multiple sources
watch([firstName, lastName], ([first, last]) => {
  fullName.value = `${first} ${last}`
})

// Deep watch with depth limit (Vue 3.5+)
watch(state, callback, { deep: 2 })

// Once (Vue 3.4+)
watch(source, callback, { once: true })
```

### watchEffect

Runs immediately and auto-tracks dependencies.

```ts
import { ref, watchEffect, onWatcherCleanup } from 'vue'

const id = ref(1)

watchEffect(async () => {
  const controller = new AbortController()

  // Cleanup on re-run or unmount (Vue 3.5+)
  onWatcherCleanup(() => controller.abort())

  const res = await fetch(`/api/${id.value}`, { signal: controller.signal })
  data.value = await res.json()
})

// Pause/resume (Vue 3.5+)
const { pause, resume, stop } = watchEffect(() => {})
pause()
resume()
stop()
```

### Flush Timing

```ts
// 'pre' (default) - before component update
// 'post' - after component update (access updated DOM)
// 'sync' - immediate, use with caution

watch(source, callback, { flush: 'post' })
watchPostEffect(() => {})  // Alias for flush: 'post'
```

## Lifecycle Hooks

```ts
import {
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
  onErrorCaptured,
  onActivated,      // KeepAlive
  onDeactivated,    // KeepAlive
  onServerPrefetch  // SSR only
} from 'vue'

onMounted(() => {
  console.log('DOM is ready')
})

onUnmounted(() => {
  // Cleanup timers, listeners, etc.
})

// Error boundary
onErrorCaptured((err, instance, info) => {
  console.error(err)
  return false  // Stop propagation
})
```

## Effect Scope

Group reactive effects for batch disposal.

```ts
import { effectScope, onScopeDispose } from 'vue'

const scope = effectScope()

scope.run(() => {
  const count = ref(0)
  const doubled = computed(() => count.value * 2)

  watch(count, () => console.log(count.value))

  // Cleanup when scope stops
  onScopeDispose(() => {
    console.log('Scope disposed')
  })
})

// Dispose all effects
scope.stop()
```

### onScopeDispose

Cleanup callback tied to the current effect scope. Works in composables even when not inside a component (unlike `onUnmounted`). Preferred for composables that schedule rAF or timers.

```ts
import { onScopeDispose } from 'vue'

export function useRenderer(options: UseRendererOptions) {
  let rafId: number | null = null
  // ...schedule rAF...

  onScopeDispose(() => {
    if (rafId !== null) cancelAnimationFrame(rafId)
  })
}
```

**In our codebase:** `useRenderer` and `useAnimationController` both use `onScopeDispose` to cancel animation frames on cleanup.

## Composables

Composables are functions that encapsulate stateful logic using Composition API.

### useTemplateRef (Vue 3.5+)

Type-safe template refs without name collisions. Replaces the `const el = ref<HTMLElement | null>(null)` pattern.

```ts
import { useTemplateRef } from 'vue'

const canvasRef = useTemplateRef<HTMLCanvasElement>('interactiveCanvas')
// In template: <canvas ref="interactiveCanvas" />
```

**In our codebase:** `CanvasContainer.vue` uses `useTemplateRef` for all 5 template refs (container, 3 canvases, text editor container).

### Naming Convention

- Start with `use`: `useMouse`, `useFetch`, `useCounter`

### Pattern

```ts
// composables/useMouse.ts
import { ref, onMounted, onUnmounted } from 'vue'

export function useMouse() {
  const x = ref(0)
  const y = ref(0)

  const update = (e: MouseEvent) => {
    x.value = e.pageX
    y.value = e.pageY
  }

  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))

  return { x, y }
}
```

### Accept Reactive Input

Use `toValue()` (Vue 3.3+) to normalize refs, getters, or plain values.

```ts
import { ref, watchEffect, toValue, type MaybeRefOrGetter } from 'vue'

export function useFetch(url: MaybeRefOrGetter<string>) {
  const data = ref(null)
  const error = ref(null)

  watchEffect(async () => {
    data.value = null
    error.value = null

    try {
      const res = await fetch(toValue(url))
      data.value = await res.json()
    } catch (e) {
      error.value = e
    }
  })

  return { data, error }
}

// Usage - all work:
useFetch('/api/users')
useFetch(urlRef)
useFetch(() => `/api/users/${props.id}`)
```

### Return Refs (Not Reactive)

Always return plain object with refs for destructuring compatibility.

```ts
// Good - preserves reactivity when destructured
return { x, y }

// Bad - loses reactivity when destructured
return reactive({ x, y })
```

### Breaking Circular Dependencies

When composable A needs to read data that composable B writes, but B requires functions from A.

**Approach 1: Pre-create shared refs in the parent (Controller Component)**

```ts
// In CanvasContainer.vue — parent owns shared state:
const suggestedBindings = shallowRef<readonly ExcalidrawElement[]>([])
const shared = { canvasRef, toScene, zoom, elements, suggestedBindings, ... }

const { multiElement } = useMultiPointCreation({ ...shared, ... })
const { newElement } = useDrawingInteraction({ ...shared, multiElement, ... })
```

**Approach 2: Deferred binding for truly circular deps**

When composables need each other's outputs (e.g., tools need `markStaticDirty` from renderer, but renderer needs `newElement` from tools):

```ts
// createDirtyFlags() returns no-op stubs that get late-bound:
const dirty = createDirtyFlags()

// Pass stubs to composables created before the renderer:
const { newElement } = useDrawingInteraction({ markStaticDirty: dirty.markStaticDirty, ... })

// Renderer is created last, then bound:
const { markStaticDirty } = useSceneRenderer({ newElement, ... })
dirty.bind({ markStaticDirty, ... })  // Stubs now forward to real fns
```

The parent component (`CanvasContainer.vue`) is the **Controller Component** that owns all shared state and orchestrates 10+ composables via these two techniques.

<!--
Source references:
- https://vuejs.org/api/reactivity-core.html
- https://vuejs.org/api/reactivity-advanced.html
- https://vuejs.org/api/composition-api-lifecycle.html
- https://vuejs.org/guide/reusability/composables.html
-->
