# Configure Nuxt UI color mapping in app.config.ts

**Points:** 3
**Phase:** 0 - Foundation
**Priority:** High

## Description

Map our brand colors to Nuxt UI's semantic color system. Generate a 50-950 shade palette from our hot pink accent (`rgb(255,107,237)`) and configure it as Nuxt UI's `primary`.

## Tasks

- Create `app.config.ts` with Nuxt UI color configuration
- Map `accent` (hot pink) → `primary` with full 50-950 shade scale
- Choose appropriate `neutral` color (closest to our `base`/`surface`)
- Configure `secondary` if needed
- Override `--ui-*` CSS variables in both `:root` and `.dark` to match our aesthetic
- Test Nuxt UI components render with our brand colors

## Acceptance Criteria

- `<UButton color="primary">` renders in hot pink
- Neutral backgrounds/text match our base/foreground palette
- Colors correct in both light and dark mode
