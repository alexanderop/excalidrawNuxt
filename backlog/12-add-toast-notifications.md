# Add toast notifications with useToast

**Points:** 3
**Phase:** 3 - New Capabilities
**Priority:** Low

## Description

Add toast notification system using `useToast()` for user feedback. Currently no notification system exists — actions like copy, delete, and errors happen silently.

## Tasks

- Import `useToast` from `#imports` where needed
- Add success toasts for: element copied, element deleted, element duplicated
- Add error toasts for: paste failed, file upload failed, invalid input
- Add info toasts for: keyboard shortcut hints, undo/redo confirmation
- Style toasts to match our dark theme

## Acceptance Criteria

- Toasts appear for key user actions
- Toasts auto-dismiss after timeout
- Max 5 toasts visible at once (Nuxt UI default)
- Styled consistently with our theme
