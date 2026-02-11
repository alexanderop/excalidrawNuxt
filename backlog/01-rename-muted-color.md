# Rename --color-muted to avoid Nuxt UI collision

**Points:** 3
**Phase:** 0 - Foundation
**Priority:** Critical (blocker for Nuxt UI theming)

## Description

Rename `--color-muted` to `--color-subdued` (or similar) across the codebase. Nuxt UI uses `muted` as a semantic variant suffix (`--ui-text-muted`, `--ui-bg-muted`, etc.) which collides with our Tailwind utility classes like `bg-muted` and `text-muted`.

## Tasks

- Rename `--color-muted` to `--color-subdued` in `app/assets/css/main.css` `@theme` block
- Find and replace all `bg-muted`, `text-muted`, `border-muted` usages (with opacity modifiers like `/20`) across ~9 Vue files (59 total color usages, subset are muted)
- Update CLAUDE.md color docs
- Verify no visual regressions

## Acceptance Criteria

- No references to `--color-muted` remain in app code
- All components render with correct subdued purple color
- Nuxt UI `muted` variant works without conflict
