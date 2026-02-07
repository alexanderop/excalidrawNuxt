---
name: walkthrough
description: Generate interactive HTML walkthroughs with clickable Mermaid diagrams (flowcharts and ER diagrams) that explain codebase features, flows, architecture, and database schemas. Use when asked to "walkthrough", "explain this flow", "how does X work", "trace the code path", "annotated diagram", "code walkthrough", "explain the architecture of", "walk me through", "database schema", "explain the tables", "data model".
---

# Codebase Walkthrough Generator

Generate interactive HTML files with clickable Mermaid diagrams that explain how code works. Supports flowcharts for code flows and ER diagrams for database schemas. Each node/entity reveals source file locations, descriptions, and code snippets.

## Workflow

### Step 1: Understand the scope

Clarify what the user wants explained:
- A specific feature flow (e.g., "how does canvas drawing work")
- A data flow (e.g., "how does state flow from composable to component")
- An architectural overview (e.g., "how are features organized")
- A request lifecycle (e.g., "what happens when a user clicks draw")
- A database schema (e.g., "explain the tables and relationships")
- A data model (e.g., "how is user data structured")

If the request is vague, ask one clarifying question. Otherwise proceed.

### Step 2: Explore the codebase

**Always read real source files before generating.** Never fabricate code paths.

1. Use Glob/Grep to find relevant files
2. Read key files to understand the actual flow
3. Trace imports and function calls to map the dependency chain
4. Identify the logical steps/phases in the flow
5. Note exact file paths, line numbers, and code snippets for each node

Build a mental model of: Entry point → Processing steps → Output/Side effects.

### Step 3: Choose the diagram type

Pick the Mermaid diagram type based on the topic:

| Topic | Diagram Type | Mermaid Syntax |
|-------|-------------|----------------|
| Feature flows, request lifecycles, architecture | **Flowchart** | `graph TD` / `graph LR` |
| Database schemas, table relationships, data models | **ER Diagram** | `erDiagram` |
| Mixed (API flow + DB schema) | **Both** — render two diagrams side by side or stacked | Flowchart + ER |

#### Flowchart (`graph TD` / `graph LR`)

**Direction**: Use `graph TD` (top-down) for hierarchical flows, `graph LR` (left-right) for sequential pipelines.

**Node types** (styled by category):
| Type | Style | Use for |
|------|-------|---------|
| `component` | Purple-500 | Vue components, pages |
| `composable` | Purple-600 | Composables, hooks |
| `utility` | Purple-700 | Utils, helpers, pure functions |
| `external` | Gray-600 | Libraries, browser APIs, external services |
| `event` | Purple-200 | Events, user actions, triggers |
| `data` | Purple-600 | Stores, state, data structures |

**Subgraphs**: Group related nodes by feature, layer, or phase.

**Node IDs**: Use descriptive camelCase IDs that map to the detail data (e.g., `useCanvas`, `renderLoop`, `handleClick`).

**Edges**: Label with the relationship — "calls", "emits", "watches", "imports", "returns".

#### ER Diagram (`erDiagram`)

Use for database-related walkthroughs: schema design, table relationships, migrations, data models.

**Syntax**:
```
erDiagram
    USERS {
        string id PK
        string email UK
        string name
        timestamp created_at
    }
    TEAMS {
        string id PK
        string name
        string owner_id FK
    }
    TEAM_MEMBERS {
        string team_id FK
        string user_id FK
        string role
    }
    USERS ||--o{ TEAM_MEMBERS : "joins"
    TEAMS ||--o{ TEAM_MEMBERS : "has"
    USERS ||--o{ TEAMS : "owns"
```

**Relationship cardinality**:
| Syntax | Meaning |
|--------|---------|
| `\|\|--o{` | One to many |
| `\|\|--\|\|` | One to one |
| `}o--o{` | Many to many |
| `\|\|--o\|` | One to zero-or-one |

**Column markers**: `PK` (primary key), `FK` (foreign key), `UK` (unique).

**Click handlers on ER diagrams**: Entities in ER diagrams don't natively support Mermaid `click` callbacks. Instead, add click listeners manually after render via `querySelectorAll('.entityLabel')` — see html-patterns.md for the pattern.

### Step 4: Generate the HTML file

Create a single self-contained HTML file following the patterns in [references/html-patterns.md](references/html-patterns.md).

**File location**: Write to the project root as `walkthrough-{topic}.html` (e.g., `walkthrough-canvas-drawing.html`). Use kebab-case for the topic slug.

**Required elements**:
1. Title and subtitle describing the walkthrough scope
2. Mermaid flowchart with clickable nodes
3. Node detail panel showing: description, source file path, and code snippet
4. Legend showing node type color coding

**Node detail data** — for each node, include:
```js
nodeId: {
  title: "Human-readable name",
  type: "component|composable|utility|external|event|data",
  description: "What this does and why it matters in the flow",
  file: "app/composables/useCanvas.ts",       // Real path
  lines: "42-67",                              // Real line range
  code: `// Real code snippet from the file\nconst canvas = ref<HTMLCanvasElement>()`
}
```

**After writing the file**, open it in the user's browser:
```bash
open walkthrough-{topic}.html    # macOS
```

## Mermaid Conventions

### Click binding
Use Mermaid's callback syntax to make nodes interactive:
```
click nodeId nodeClickHandler "View details"
```

Where `nodeClickHandler` is a global JS function defined in the HTML.

### Subgraph naming
```
subgraph layer_name["Display Name"]
```

### Edge labels
```
A -->|"calls"| B
A -.->|"watches"| C
A ==>|"emits"| D
```

Use `-->` for direct calls, `-.->` for reactive/watch relationships, `==>` for events/emissions.

## Quality Checklist

Before finishing, verify:
- [ ] Every node maps to a real file in the codebase
- [ ] Code snippets are actual code, not fabricated
- [ ] File paths are correct and relative to project root
- [ ] The flowchart accurately represents the real code flow
- [ ] Clicking any node shows its detail panel
- [ ] The diagram renders without Mermaid syntax errors
- [ ] The HTML file opens correctly in a browser

## References

- [references/html-patterns.md](references/html-patterns.md) — Complete HTML template, CSS, and JavaScript patterns
