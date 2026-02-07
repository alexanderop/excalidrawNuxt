# System Knowledge Map

> Lightweight index — each section lives in its own file. Load only what you need.

## Diagrams

| Diagram | File | What it shows |
|---------|------|---------------|
| Architecture Overview | [diagrams/architecture-overview.md](diagrams/architecture-overview.md) | Full dependency graph: Nuxt shell → pages → features → composables |
| Canvas Architecture | [diagrams/canvas-architecture.md](diagrams/canvas-architecture.md) | Triple canvas stack data flow + composable wiring |
| Render Pipeline | [diagrams/render-pipeline.md](diagrams/render-pipeline.md) | Dirty-flag driven RAF loop sequence |
| Shape Drawing Flow | [diagrams/shape-drawing-flow.md](diagrams/shape-drawing-flow.md) | Pointer event sequence for creating shapes/arrows |
| Feature Architecture | [diagrams/feature-architecture.md](diagrams/feature-architecture.md) | Feature directory layout + import rules |
| Testing Architecture | [diagrams/testing-architecture.md](diagrams/testing-architecture.md) | Vitest dual-project setup + testing pyramid |
| File Map | [diagrams/file-map.md](diagrams/file-map.md) | Complete file tree of every module |
| Selection State Machine | [diagrams/selection-state-machine.md](diagrams/selection-state-machine.md) | useSelectionInteraction states, transitions, modifiers, cursors |
| Coordinate System | [diagrams/coordinate-system.md](diagrams/coordinate-system.md) | Screen ↔ scene transforms, viewport, zoom-anchored scrolling |
| Initialization Sequence | [diagrams/initialization-sequence.md](diagrams/initialization-sequence.md) | Composable boot order, deferred dirty-flag binding pattern |
| Event Flow | [diagrams/event-flow.md](diagrams/event-flow.md) | Listener targets, pointer capture, panning priority, event pipeline |

## Reference

| Topic | File | What it covers |
|-------|------|----------------|
| Architectural Decisions | [reference/architectural-decisions.md](reference/architectural-decisions.md) | Rendering, state, reactivity, SSR, testing, and other key choices with rationale |
| Technology Stack | [reference/technology-stack.md](reference/technology-stack.md) | Framework, UI, styling, canvas, composables, and utility libraries |
| Element Types | [reference/element-types.md](reference/element-types.md) | Shape/arrow models, arrow architecture, linear editor, and binding feature |

> **Note:** Update this map when new features, diagrams, or reference docs are added.
