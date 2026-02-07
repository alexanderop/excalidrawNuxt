# CLAUDE.md

Excalidraw Nuxt is a collaborative drawing app built with Nuxt 4 and Excalidraw.

## Commands

```
bun dev           # Start dev server
bun build         # Production build
bun preview       # Preview production build
```

## Stack

- Nuxt 4 (Vue 3.5+)
- Excalidraw (via @excalidraw/excalidraw)
- TypeScript

## Structure

- `app/` - Vue application (pages, components, composables)
- `public/` - Static assets
- `nuxt.config.ts` - Nuxt configuration
- `docs/` - Agent memory (gotchas, patterns, architecture)

## Docs = Memory

**Do NOT use Claude Code's built-in memory (`~/.claude/projects/.../memory/`).** The `docs/` folder IS the agent memory. It is version-controlled, shared across sessions, and agents maintain it themselves.

**After completing any task**, update the relevant doc in `docs/`:
- New gotcha discovered? Add it to the matching gotchas file.
- Architecture changed? Update `docs/SYSTEM_KNOWLEDGE_MAP.md`.
- New domain added? Create a new `docs/<domain>-gotchas.md` and link it below.
- Use Mermaid diagrams to describe complex flows, architecture, and relationships compactly.

## Further Reading

**IMPORTANT:** Before starting any task, identify which docs below are relevant and read them first. Load the full context before making changes.

- `docs/SYSTEM_KNOWLEDGE_MAP.md` - Architecture overview, data flow diagrams
- `docs/excalidraw-gotchas.md` - Excalidraw integration pitfalls and patterns
- `docs/nuxt-gotchas.md` - Nuxt 4 specific pitfalls and migration notes
