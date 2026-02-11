# Unify dark mode to use .dark class

**Points:** 3
**Phase:** 0 - Foundation
**Priority:** Critical

## Description

Switch dark mode from custom `.theme--dark` class to `.dark` class (Nuxt UI standard via `@nuxtjs/color-mode`). Canvas-level dark mode color transforms (invert+hue-rotate in `colors.ts`) stay untouched.

## Tasks

- Update `useTheme.ts` composable to toggle `.dark` class instead of `.theme--dark`
- Update `CanvasContainer.vue` dark mode class toggle
- Update `app/assets/css/main.css` dark mode selector from `html.theme--dark` to `.dark`
- Verify Nuxt UI's `@nuxtjs/color-mode` is configured (comes bundled with Nuxt UI)
- Test that canvas element colors still transform correctly in dark mode

## Acceptance Criteria

- Dark/light toggle works via `.dark` class on `<html>`
- Nuxt UI components respond to dark mode
- Canvas dark mode color transforms unaffected
- Theme persists in localStorage
