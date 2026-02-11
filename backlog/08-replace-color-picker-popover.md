# Replace ColorSwatch + ColorPicker with UPopover

**Points:** 3
**Phase:** 2 - Property Panel
**Priority:** Medium

## Description

Replace hand-rolled color picker floating panel (manual Teleport + `useElementBounding` positioning + `onClickOutside`) with `<UPopover>` as the container. Keep the custom palette grid inside since it's domain-specific.

## Tasks

- Wrap `ColorSwatch.vue` trigger with `<UPopover>` trigger slot
- Move `ColorPicker.vue` palette content into `<UPopover>` content slot
- Remove manual Teleport, positioning calculations, and `onClickOutside`
- Keep palette grid (10 hues x 5 shades), top picks, hex input, recent colors
- Keep keyboard shortcuts (Escape, 1-5 shade quick-pick)

## Acceptance Criteria

- Clicking color swatch opens popover with color picker
- Popover positions correctly relative to swatch
- Click outside and Escape close the popover
- All palette interactions work (grid, hex input, recent colors)
