# HTML Patterns for Walkthrough Generation

Complete reference for generating interactive walkthrough HTML files using React (UMD) + Shiki (ESM) + Tailwind CDN + Mermaid.

## Architecture: `<script type="module">` (No Babel)

The generated HTML uses **native ES modules** (`<script type="module">`), not Babel transpilation. This means:
- **Template literals work** — use backticks freely for multi-line strings, string interpolation, etc.
- **Shiki imported via ESM** — `import { createHighlighter } from 'shiki'`
- **React/ReactDOM loaded as UMD globals** — accessed via `window.React`, `window.ReactDOM`
- **No JSX** — use `React.createElement()` for all component rendering
- **Top-level `await`** — supported in modules, used for Shiki initialization

## Design Principles

1. **Always dark mode** — Pure black background, white text, purple accents. Never generate light-mode walkthroughs. Set `<html>` with `color-scheme: dark` and `<body>` with `bg-wt-bg` (`#000000`).
2. **Quick mental model** — Readable in under 2 minutes, not a code reference
3. **TL;DR first** — Summary card above the diagram gives the gist before any exploration
4. **Full-size diagram** — Mermaid renders at natural size, never squished
5. **Pan + zoom** — Scroll wheel zooms toward cursor, drag to pan, auto-fit on load
6. **Floating detail overlay** — Right side with close button (×), short description + optional code
7. **Shiki syntax highlighting** — VS Code-quality code rendering via `vitesse-dark` theme (for the rare nodes with code)
8. **React + Tailwind CDN** — Declarative components, utility-first styling

## Color Palette (Black / White / Purple)

| Token | Hex | Use |
|-------|-----|-----|
| `wt-bg` | `#000000` | Page background |
| `wt-surface` | `#0a0a0a` | Panels, overlays |
| `wt-raised` | `#141414` | Hover states |
| `wt-border` | `#2a2a2a` | Borders, dividers |
| `wt-fg` | `#ffffff` | Primary text |
| `wt-muted` | `#a0a0a0` | Secondary text |
| `wt-accent` | `#a855f7` | Purple accent (purple-500) |
| `wt-file` | `#c084fc` | File paths (purple-400) |
| `wt-red` | `#ef4444` | Close button hover |

### Node Type Colors (Purple Shades)

| Type | Fill | Stroke | Text |
|------|------|--------|------|
| component | `#a855f7` (purple-500) | `#c084fc` | white |
| composable | `#7c3aed` (purple-600) | `#a78bfa` | white |
| utility | `#6d28d9` (purple-700) | `#8b5cf6` | white |
| external | `#525252` (gray-600) | `#737373` | white |
| event | `#d8b4fe` (purple-200) | `#e9d5ff` | black |
| data | `#9333ea` (purple-600) | `#a855f7` | white |

## CDN Dependencies

```html
<script src="https://cdn.tailwindcss.com"></script>
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
```

**Note**: Babel is NOT included. Shiki is loaded via ESM `import` inside `<script type="module">`.

## Tailwind Config

```html
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          wt: {
            bg: '#000000', surface: '#0a0a0a', raised: '#141414',
            border: '#2a2a2a', fg: '#ffffff', muted: '#a0a0a0',
            accent: '#a855f7', file: '#c084fc', red: '#ef4444',
          },
          node: {
            component: '#a855f7', composable: '#7c3aed', utility: '#6d28d9',
            external: '#525252', event: '#d8b4fe', data: '#9333ea',
          },
        },
      },
    },
  };
</script>
```

## Minimal CSS (only what Tailwind can't do)

```css
/* Mermaid SVG must render at natural size */
.mermaid-wrap svg { max-width: none !important; height: auto !important; }

/* Flowchart node hover */
.mermaid-wrap .node { cursor: pointer; }
.mermaid-wrap .node:hover rect,
.mermaid-wrap .node:hover polygon,
.mermaid-wrap .node:hover circle,
.mermaid-wrap .node:hover .label-container {
  filter: brightness(1.3); transition: filter .15s;
}

/* ER diagram entity hover */
.mermaid-wrap .er.entityBox { cursor: pointer; }
.mermaid-wrap g:has(.er.entityBox):hover .er.entityBox {
  filter: brightness(1.3); transition: filter .15s;
}

/* Detail panel body text */
.dt-body p { color:#a0a0a0; font-size:.88rem; line-height:1.65; margin-bottom:10px; }
.dt-body p code {
  background:rgba(168,85,247,.12); padding:1px 6px; border-radius:4px;
  font-family:'SF Mono','Fira Code',monospace; font-size:.82rem; color:#c084fc;
}

/* Shiki code blocks — override theme background to match walkthrough */
.dt-body .shiki {
  background: #000000 !important;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 14px 16px;
  overflow-x: auto;
  margin: 8px 0 14px;
}
.dt-body .shiki code {
  font-family: 'SF Mono','Fira Code',monospace;
  font-size: .78rem;
  line-height: 1.55;
  background: none;
  padding: 0;
  border-radius: 0;
  color: inherit;  /* Let Shiki's inline styles handle colors */
}

/* Fallback for when Shiki hasn't loaded yet */
.dt-body pre.code-fallback {
  background: #000000;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 14px 16px;
  overflow-x: auto;
  margin: 8px 0 14px;
}
.dt-body pre.code-fallback code {
  font-family: 'SF Mono','Fira Code',monospace;
  font-size: .78rem;
  line-height: 1.55;
  color: #e0e0e0;
  background: none;
  padding: 0;
  border-radius: 0;
}
```

## Shiki Initialization

Shiki is loaded via ESM and initialized before the React app mounts. Code snippets (when present) are pre-highlighted at startup.

```js
import { createHighlighter } from 'https://cdn.jsdelivr.net/npm/shiki@3.22.0/+esm'

// Collect unique languages from NODES (only nodes with code)
const langs = [...new Set(
  Object.values(NODES)
    .map(n => n.lang)
    .filter(Boolean)
)];
if (langs.length === 0) langs.push('typescript');

// Create highlighter with required languages
let highlighter = null;
try {
  highlighter = await createHighlighter({
    themes: ['vitesse-dark'],
    langs: langs,
  });
} catch (e) {
  console.warn('Shiki failed to load, falling back to plain code blocks:', e);
}

// Pre-highlight code snippets (only nodes that have them)
const HIGHLIGHTED = {};
for (const [id, node] of Object.entries(NODES)) {
  if (node.code && highlighter) {
    try {
      HIGHLIGHTED[id] = highlighter.codeToHtml(node.code, {
        lang: node.lang || 'typescript',
        theme: 'vitesse-dark',
      });
    } catch (e) {
      console.warn(`Failed to highlight ${id}:`, e);
    }
  }
}
```

**Key points:**
- `await createHighlighter()` at module top-level — supported in `<script type="module">`
- Languages are auto-collected from NODES data — no need to hardcode the list
- Graceful fallback: if Shiki fails, `HIGHLIGHTED[id]` will be undefined and the DetailPanel renders plain `<pre><code>` instead
- Most nodes won't have code — Shiki only loads languages actually needed

### Common Shiki Languages

| Language ID | Use for |
|-------------|---------|
| `typescript` | `.ts` files (default) |
| `vue` | `.vue` files (full SFC) |
| `vue-html` | Vue template blocks |
| `json` | Config files, package.json |
| `css` | Stylesheets |
| `javascript` | `.js` files |
| `bash` | Shell scripts, commands |

## Mermaid Initialization

### Flowchart Config

```js
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#0a0a0a',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#2a2a2a',
    lineColor: '#a0a0a0',
    secondaryColor: '#000000',
    tertiaryColor: '#000000',
    background: '#000000',
    mainBkg: '#0a0a0a',
    nodeBorder: '#2a2a2a',
    clusterBkg: 'rgba(10,10,10,0.8)',
    clusterBorder: '#7c3aed',
    titleColor: '#ffffff',
    edgeLabelBackground: 'transparent',
  },
  flowchart: { useMaxWidth: false, htmlLabels: true, curve: 'basis' },
  securityLevel: 'loose',
});
```

### ER Diagram Config

When the walkthrough is database-focused, use `erDiagram` syntax. Add ER-specific theme variables:

```js
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    // Base (same as flowchart)
    primaryColor: '#0a0a0a',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#2a2a2a',
    lineColor: '#a0a0a0',
    background: '#000000',
    // ER-specific
    entityBkg: '#0a0a0a',
    entityBorder: '#7c3aed',
    entityTextColor: '#ffffff',
    attributeBackgroundColorEven: '#0a0a0a',
    attributeBackgroundColorOdd: '#141414',
    labelColor: '#a0a0a0',
    relationColor: '#a855f7',
  },
  er: { useMaxWidth: false, layoutDirection: 'TB' },
  securityLevel: 'loose',
});
```

**Critical settings**:
- `useMaxWidth: false` — lets the SVG render at its natural large size
- `securityLevel: 'loose'` — required for `click` callbacks
- `er.layoutDirection` — `'TB'` (top-bottom) or `'LR'` (left-right)

## React Component Architecture

```
App
├── Header (fixed, gradient fade)
├── Summary (TL;DR card below header, above diagram)
├── DiagramViewport (full screen, pan/zoom via usePanZoom hook)
│   └── MermaidDiagram (renders SVG into ref)
├── ZoomControls (fixed bottom-left)
├── Legend (fixed bottom-center)
├── DetailPanel (fixed right, conditional render)
│   ├── Close button (×)
│   ├── Title
│   ├── Description (plain text paragraph)
│   ├── CodeBlock (optional — Shiki-highlighted or plain fallback)
│   └── Related Files
└── KeyboardHint (fixed bottom-right)
```

All components use `React.createElement()` since there is no JSX transpiler. The examples below show JSX for readability — the generated HTML must use `React.createElement()`.

### usePanZoom Hook

Uses `useRef` for transform state (not `useState`) to avoid React re-renders on every frame:

```jsx
function usePanZoom() {
  const viewportRef = useRef(null);
  const canvasRef = useRef(null);
  const zoomDisplayRef = useRef(null);
  const st = useRef({ zoom: 1, panX: 0, panY: 0 });
  const drag = useRef({ on: false, lx: 0, ly: 0 });

  const apply = useCallback(() => {
    const { zoom, panX, panY } = st.current;
    if (canvasRef.current)
      canvasRef.current.style.transform = `translate(${panX}px,${panY}px) scale(${zoom})`;
    if (zoomDisplayRef.current)
      zoomDisplayRef.current.textContent = Math.round(zoom * 100) + '%';
  }, []);

  const fitToScreen = useCallback(() => {
    const svg = canvasRef.current?.querySelector('svg');
    const vp = viewportRef.current;
    if (!svg || !vp) return;
    const s = st.current;
    const vw = vp.clientWidth, vh = vp.clientHeight;
    const sw = svg.getBoundingClientRect().width / s.zoom;
    const sh = svg.getBoundingClientRect().height / s.zoom;
    const fit = Math.max(0.15, Math.min(2, Math.min((vw - 80) / sw, (vh - 80) / sh)));
    s.zoom = fit;
    s.panX = (vw - sw * fit) / 2;
    s.panY = (vh - sh * fit) / 2;
    apply();
  }, [apply]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    // Wheel zoom (toward cursor)
    const onWheel = (e) => {
      e.preventDefault();
      const r = vp.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const s = st.current;
      const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const nz = Math.min(4, Math.max(0.15, s.zoom * f));
      const sc = nz / s.zoom;
      s.panX = mx - sc * (mx - s.panX);
      s.panY = my - sc * (my - s.panY);
      s.zoom = nz;
      apply();
    };

    // Drag to pan (skip if clicking a node)
    const onDown = (e) => {
      if (e.target.closest('.node')) return;
      drag.current = { on: true, lx: e.clientX, ly: e.clientY };
      vp.setPointerCapture(e.pointerId);
    };
    const onMove = (e) => {
      const d = drag.current;
      if (!d.on) return;
      st.current.panX += e.clientX - d.lx;
      st.current.panY += e.clientY - d.ly;
      d.lx = e.clientX; d.ly = e.clientY;
      apply();
    };
    const onUp = () => { drag.current.on = false; };

    vp.addEventListener('wheel', onWheel, { passive: false });
    vp.addEventListener('pointerdown', onDown);
    vp.addEventListener('pointermove', onMove);
    vp.addEventListener('pointerup', onUp);
    vp.addEventListener('pointercancel', onUp);
    window.addEventListener('resize', fitToScreen);

    return () => { /* removeEventListeners */ };
  }, [apply, fitToScreen]);

  const zoomIn = useCallback(() => { st.current.zoom = Math.min(4, st.current.zoom * 1.25); apply(); }, [apply]);
  const zoomOut = useCallback(() => { st.current.zoom = Math.max(0.15, st.current.zoom / 1.25); apply(); }, [apply]);

  return { viewportRef, canvasRef, zoomDisplayRef, zoomIn, zoomOut, fitToScreen };
}
```

### MermaidDiagram Component

**Critical**: `mermaid.render()` returns `{ svg, bindFunctions }`. You MUST call `bindFunctions(element)` after inserting the SVG via `innerHTML` — without it, click event listeners are not attached and node clicks won't work.

```jsx
function MermaidDiagram({ onNodeClick }) {
  const ref = useRef(null);

  useEffect(() => {
    window.nodeClickHandler = onNodeClick;
    mermaid.initialize({ /* see config above */ });
    mermaid.render('walkthrough-diagram', DIAGRAM).then(({ svg, bindFunctions }) => {
      if (ref.current) {
        ref.current.innerHTML = svg;
        bindFunctions?.(ref.current);  // Attaches click handlers to nodes
      }
    });
    return () => { delete window.nodeClickHandler; };
  }, [onNodeClick]);

  return <div ref={ref} className="mermaid-wrap" />;
}
```

### MermaidERDiagram Component (for database walkthroughs)

ER diagrams don't support Mermaid's `click` callback syntax. Instead, attach click handlers manually to entity groups after render:

```jsx
function MermaidERDiagram({ onEntityClick }) {
  const ref = useRef(null);

  useEffect(() => {
    mermaid.initialize({ /* see ER config above */ });
    mermaid.render('walkthrough-diagram', DIAGRAM).then(({ svg, bindFunctions }) => {
      if (!ref.current) return;
      ref.current.innerHTML = svg;
      bindFunctions?.(ref.current);

      // Attach click handlers to each entity group
      ref.current.querySelectorAll('.entityLabel').forEach(label => {
        const entityName = label.textContent?.trim();
        const entityGroup = label.closest('g');
        if (!entityName || !entityGroup) return;
        entityGroup.style.cursor = 'pointer';
        entityGroup.addEventListener('click', () => onEntityClick(entityName));
      });
    });
  }, [onEntityClick]);

  return <div ref={ref} className="mermaid-wrap" />;
}
```

**Key differences from flowchart**:
- No `click nodeId callback` in the diagram definition
- Entity names in the diagram become the keys in the `NODES` object
- Click targets are `g` elements containing `.entityLabel`

### Summary Component (TL;DR card)

Renders a brief summary card below the header and above the diagram. The new dev reads this first.

```jsx
function Summary() {
  return (
    <div className="fixed top-16 left-6 z-10 max-w-lg px-4 py-3 bg-wt-surface/80 backdrop-blur border border-wt-border rounded-lg shadow-lg pointer-events-none">
      <p className="text-sm text-wt-muted leading-relaxed">{SUMMARY}</p>
    </div>
  );
}
```

### DetailPanel Component

The detail panel renders a plain-text description, an optional syntax-highlighted code block (from the `HIGHLIGHTED` map), then the file list.

```jsx
// JSX shown for readability — generated code uses React.createElement()
function DetailPanel({ nodeId, node, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Shiki-highlighted code (pre-computed) or fallback — only if node has code
  const codeHtml = HIGHLIGHTED[nodeId];

  return (
    <div className="fixed top-4 right-4 bottom-4 w-[560px] z-30 bg-wt-surface border border-wt-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
      <button onClick={onClose}
        className="absolute top-3 right-3 z-10 w-7 h-7 rounded-md border border-wt-border bg-wt-raised text-wt-muted flex items-center justify-center text-lg hover:bg-wt-red hover:border-wt-red hover:text-white transition-colors">
        &times;
      </button>
      <div className="flex-1 overflow-y-auto p-5">
        <h2 className="text-lg font-bold text-wt-fg mb-3 pr-9">{node.title}</h2>
        <div className="dt-body">
          <p>{node.description}</p>
        </div>

        {/* Optional syntax-highlighted code block */}
        {node.code && (
          <div className="dt-body">
            {codeHtml
              ? <div dangerouslySetInnerHTML={{ __html: codeHtml }} />
              : <pre className="code-fallback"><code>{node.code}</code></pre>
            }
          </div>
        )}

        {node.files?.length > 0 && (
          <div className="mt-4 pt-3 border-t border-wt-border">
            <div className="text-[0.7rem] uppercase tracking-wider text-wt-muted font-semibold mb-1.5">
              Files
            </div>
            <code className="text-sm text-wt-file font-mono leading-relaxed">
              {node.files.map((f, i) => <span key={i}>{f}<br/></span>)}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Key differences from previous version**:
- `node.description` is rendered as a plain `<p>` text — no `dangerouslySetInnerHTML`
- No `<h3>Overview</h3><h3>Details</h3>` structure — just the description
- Code block is optional and most nodes won't have one
- File section header says "Files" instead of "Related Files" (shorter)

### App Component (top-level wiring)

```jsx
// JSX shown for readability — generated code uses React.createElement()
function App() {
  const [activeId, _setActiveId] = useState(null);
  const pz = usePanZoom();

  // Bridge mermaid clicks → React state + dim other nodes
  const setActiveNode = useCallback((nodeId) => {
    _setActiveId(nodeId);
    document.querySelectorAll('.mermaid-wrap .node').forEach(n => { n.style.opacity = nodeId ? '0.4' : '1'; });
    if (nodeId) {
      const el = document.querySelector(`.mermaid-wrap .node[id*="${nodeId}"]`);
      if (el) el.style.opacity = '1';
    }
  }, []);

  const closeDetail = useCallback(() => {
    _setActiveId(null);
    document.querySelectorAll('.mermaid-wrap .node').forEach(n => { n.style.opacity = '1'; });
  }, []);

  useEffect(() => { setTimeout(pz.fitToScreen, 600); }, [pz.fitToScreen]);

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-10 px-6 py-3.5 bg-gradient-to-b from-wt-bg to-transparent pointer-events-none">
        <h1 className="text-base font-semibold text-wt-fg">{"TITLE_HERE"}</h1>
        <p className="text-sm text-wt-muted mt-0.5">{"SUBTITLE_HERE"}</p>
      </header>

      <Summary />

      <div ref={pz.viewportRef} className="w-full h-screen overflow-hidden cursor-grab active:cursor-grabbing">
        <div ref={pz.canvasRef} className="origin-top-left will-change-transform inline-block p-[80px_60px_60px]">
          <MermaidDiagram onNodeClick={setActiveNode} />
        </div>
      </div>

      <ZoomControls zoomDisplayRef={pz.zoomDisplayRef} onZoomIn={pz.zoomIn} onZoomOut={pz.zoomOut} onFit={pz.fitToScreen} />

      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-4 px-4 py-2 bg-wt-surface border border-wt-border rounded-lg shadow-xl">
        {LEGEND.map(l => (
          <span key={l.label} className="flex items-center gap-1.5 text-xs text-wt-muted">
            <span className={`w-2 h-2 rounded-full ${l.color}`} />{l.label}
          </span>
        ))}
      </div>

      {/* Pass both nodeId and node to DetailPanel */}
      {activeId && NODES[activeId] && <DetailPanel nodeId={activeId} node={NODES[activeId]} onClose={closeDetail} />}

      <div className="fixed bottom-5 right-5 z-20 text-xs text-wt-muted opacity-50">
        <kbd>Scroll</kbd> zoom · <kbd>Drag</kbd> pan · Click nodes
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

## Node Detail Data Format

Plain-text description, optional raw source code, file paths. Most nodes have no code.

```js
const NODES = {
  nodeId: {
    title: "Drawing Interaction",
    description: "Converts pointer events into shape data. This is the bridge between raw mouse input and the element model.",
    files: ["app/features/tools/useDrawingInteraction.ts"],
    // Optional — only if it's the single most illuminating snippet (max 5 lines)
    // code: `const element = createElement(tool, startPoint, currentPoint)`,
    // lang: "typescript",
  },
};
```

**Guidelines:**
- `description` is 1-2 plain-text sentences. Answers "what is this?" and "why does it exist?"
- `code` is **optional** — most nodes should NOT have code. Only include when it's the key insight.
- `code` uses template literals for multi-line. Max 5 lines. No HTML escaping needed (Shiki handles it).
- `lang` defaults to `"typescript"` if omitted — set explicitly for `vue`, `json`, `css`, etc. Only needed when `code` is present.
- `files` is an array of `"path"` or `"path:lines"` strings
- No `content` field with HTML — use `description` with plain text instead

## TL;DR Summary Data

A 2-3 sentence overview rendered as a card above the diagram. Define it as a constant:

```js
const SUMMARY = "The drawing tool converts pointer events into visual elements on the canvas. When you select a tool and drag, a composable tracks the gesture and creates element data, which the rendering pipeline turns into canvas pixels. The tool state machine coordinates which interactions are active.";
```

**Guidelines:**
- 2-3 sentences max
- Answer: "What does this system do, at the highest level?"
- Plain text, no formatting
- A new developer should understand the gist after reading just this

## Mermaid classDef (Purple Shades)

```
classDef component fill:#a855f7,stroke:#c084fc,color:#fff
classDef composable fill:#7c3aed,stroke:#a78bfa,color:#fff
classDef utility fill:#6d28d9,stroke:#8b5cf6,color:#fff
classDef external fill:#525252,stroke:#737373,color:#fff
classDef event fill:#d8b4fe,stroke:#e9d5ff,color:#000
classDef data fill:#9333ea,stroke:#a855f7,color:#fff
```

## Complete Script Block Structure

The `<script type="module">` block should follow this order:

```js
// 1. Import Shiki
import { createHighlighter } from 'https://cdn.jsdelivr.net/npm/shiki@3.22.0/+esm'

// 2. Destructure React globals
const { useState, useEffect, useRef, useCallback } = React;

// 3. Define SUMMARY string (TL;DR for the walkthrough)
const SUMMARY = "2-3 sentence overview of what this system does.";

// 4. Define DIAGRAM string (Mermaid syntax)
const DIAGRAM = `graph TD
  ...
`;

// 5. Define NODES data (title + description + files, optional code + lang)
const NODES = { ... };

// 6. Define LEGEND
const LEGEND = [ ... ];

// 7. Initialize Shiki and pre-highlight code (only for nodes that have it)
const langs = [...new Set(Object.values(NODES).map(n => n.lang).filter(Boolean))];
if (langs.length === 0) langs.push('typescript');

let highlighter = null;
try {
  highlighter = await createHighlighter({ themes: ['vitesse-dark'], langs });
} catch (e) {
  console.warn('Shiki failed to load:', e);
}

const HIGHLIGHTED = {};
for (const [id, node] of Object.entries(NODES)) {
  if (node.code && highlighter) {
    try {
      HIGHLIGHTED[id] = highlighter.codeToHtml(node.code, {
        lang: node.lang || 'typescript',
        theme: 'vitesse-dark',
      });
    } catch (e) { console.warn(`Highlight failed for ${id}:`, e); }
  }
}

// 8. Define React components (usePanZoom, MermaidDiagram, Summary, DetailPanel, ZoomControls, App)
// ... using React.createElement() — NOT JSX

// 9. Mount the app
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
```

## Tips

1. **Template literals are safe** — `<script type="module">` is native, no Babel transpilation. Use backticks freely for multi-line strings and interpolation.
2. **Auto-fit on load**: `setTimeout(pz.fitToScreen, 600)` waits for Mermaid to finish rendering
3. **Node clicks vs pan**: Check `e.target.closest('.node')` in pointerdown to let clicks through
4. **Performance**: Use `useRef` for pan/zoom state, update DOM directly — no React re-renders during drag
5. **Mermaid click bridge**: Set `window.nodeClickHandler` before `mermaid.render()` so click bindings work
6. **bindFunctions is mandatory**: After `innerHTML = svg`, call `bindFunctions?.(ref.current)` — without this, click handlers are lost
7. **Keep diagrams small**: 5-12 nodes max. Use subgraphs to group into 2-4 conceptual areas
8. **Node ID consistency**: Mermaid node ID, `click` binding ID, and `NODES` key must match exactly
9. **Shiki graceful degradation**: Always wrap `createHighlighter()` in try/catch. If it fails, `HIGHLIGHTED[id]` will be undefined and the fallback `<pre class="code-fallback">` renders plain text.
10. **Language auto-detection**: Collect langs from NODES data dynamically — don't hardcode the Shiki language list.
11. **DetailPanel needs nodeId**: Pass both `nodeId` (string) and `node` (data object) so the panel can look up `HIGHLIGHTED[nodeId]` for the pre-rendered code HTML.
12. **Summary is always visible**: The `Summary` component is always shown — it's the first thing a new developer reads.
13. **Plain text descriptions**: Use `description` (plain string) not `content` (HTML). Render as `<p>` not `dangerouslySetInnerHTML`.
