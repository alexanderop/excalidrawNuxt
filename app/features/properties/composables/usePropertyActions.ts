import type { ComputedRef } from 'vue'
import type {
  ExcalidrawElement,
  Arrowhead,
  FillStyle,
  StrokeStyle,
  TextAlign,
} from '~/features/elements/types'
import { mutateElement } from '~/features/elements/mutateElement'
import type { StyleDefaults, Roundness } from '../types'

interface UsePropertyActionsOptions {
  selectedElements: ComputedRef<ExcalidrawElement[]>
  styleDefaults: StyleDefaults
  markDirty: () => void
}

function applyToSelected(
  selectedElements: ComputedRef<ExcalidrawElement[]>,
  updates: Record<string, unknown>,
  markDirty: () => void,
): void {
  for (const el of selectedElements.value) {
    mutateElement(el, updates)
  }
  markDirty()
}

interface UsePropertyActionsReturn {
  changeStrokeColor: (color: string) => void
  changeBackgroundColor: (color: string) => void
  changeFillStyle: (style: FillStyle) => void
  changeStrokeWidth: (width: number) => void
  changeStrokeStyle: (style: StrokeStyle) => void
  changeOpacity: (opacity: number) => void
  changeRoundness: (type: Roundness) => void
  changeFontFamily: (family: number) => void
  changeFontSize: (size: number) => void
  changeTextAlign: (align: TextAlign) => void
  changeArrowhead: (position: 'start' | 'end', type: Arrowhead | null) => void
  getFormValue: <T>(property: string, fallback: T) => T | 'mixed'
}

export function usePropertyActions(options: UsePropertyActionsOptions): UsePropertyActionsReturn {
  const { selectedElements, styleDefaults, markDirty } = options

  function changeStrokeColor(color: string): void {
    applyToSelected(selectedElements, { strokeColor: color }, markDirty)
    styleDefaults.strokeColor.value = color
  }

  function changeBackgroundColor(color: string): void {
    applyToSelected(selectedElements, { backgroundColor: color }, markDirty)
    styleDefaults.backgroundColor.value = color
  }

  function changeFillStyle(style: FillStyle): void {
    applyToSelected(selectedElements, { fillStyle: style }, markDirty)
    styleDefaults.fillStyle.value = style
  }

  function changeStrokeWidth(width: number): void {
    applyToSelected(selectedElements, { strokeWidth: width }, markDirty)
    styleDefaults.strokeWidth.value = width
  }

  function changeStrokeStyle(style: StrokeStyle): void {
    applyToSelected(selectedElements, { strokeStyle: style }, markDirty)
    styleDefaults.strokeStyle.value = style
  }

  function changeOpacity(opacity: number): void {
    applyToSelected(selectedElements, { opacity }, markDirty)
    styleDefaults.opacity.value = opacity
  }

  function changeRoundness(type: Roundness): void {
    const roundness = type === 'sharp' ? null : { type: 3 }
    applyToSelected(selectedElements, { roundness }, markDirty)
    styleDefaults.roundness.value = type
  }

  function changeFontFamily(family: number): void {
    applyToSelected(selectedElements, { fontFamily: family }, markDirty)
    styleDefaults.fontFamily.value = family
  }

  function changeFontSize(size: number): void {
    applyToSelected(selectedElements, { fontSize: size }, markDirty)
    styleDefaults.fontSize.value = size
  }

  function changeTextAlign(align: TextAlign): void {
    applyToSelected(selectedElements, { textAlign: align }, markDirty)
    styleDefaults.textAlign.value = align
  }

  function changeArrowhead(position: 'start' | 'end', type: Arrowhead | null): void {
    const property = position === 'start' ? 'startArrowhead' : 'endArrowhead'
    applyToSelected(selectedElements, { [property]: type }, markDirty)
    styleDefaults[property].value = type
  }

  function getFormValue<T>(property: string, fallback: T): T | 'mixed' {
    const elements = selectedElements.value
    if (elements.length === 0) return fallback

    const values = new Set(
      elements.map(el => (el as Record<string, unknown>)[property] as T),
    )
    if (values.size === 1) return values.values().next().value as T
    return 'mixed'
  }

  return {
    changeStrokeColor,
    changeBackgroundColor,
    changeFillStyle,
    changeStrokeWidth,
    changeStrokeStyle,
    changeOpacity,
    changeRoundness,
    changeFontFamily,
    changeFontSize,
    changeTextAlign,
    changeArrowhead,
    getFormValue,
  }
}
