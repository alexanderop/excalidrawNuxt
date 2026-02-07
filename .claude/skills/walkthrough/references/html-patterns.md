# HTML Patterns for Walkthrough Generation

Complete reference for generating interactive walkthrough HTML files using React + Tailwind CDN.

## Design Principles

1. **Full-size diagram** — Mermaid renders at natural size, never squished
2. **Pan + zoom** — Scroll wheel zooms toward cursor, drag to pan, auto-fit on load
3. **Pure black background** — High contrast, black/white/purple only
4. **Floating detail overlay** — Right side with close button (×), rich HTML content
5. **React + Tailwind CDN** — Declarative components, utility-first styling

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
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
```

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

/* Rich content in detail panel body */
.dt-body h3 { font-size:.95rem; font-weight:700; color:#ffffff; margin:20px 0 8px; }
.dt-body h3:first-child { margin-top:0; }
.dt-body p { color:#a0a0a0; font-size:.88rem; line-height:1.65; margin-bottom:10px; }
.dt-body ul { color:#a0a0a0; font-size:.88rem; line-height:1.65; margin:0 0 12px; padding-left:18px; }
.dt-body li { margin-bottom:4px; }
.dt-body li code, .dt-body p code {
  background:rgba(168,85,247,.12); padding:1px 6px; border-radius:4px;
  font-family:'SF Mono','Fira Code',monospace; font-size:.82rem; color:#c084fc;
}
.dt-body pre {
  background:#000000; border:1px solid #2a2a2a; border-radius:8px;
  padding:14px 16px; overflow-x:auto; margin:8px 0 14px;
}
.dt-body pre code {
  font-family:'SF Mono','Fira Code',monospace; font-size:.78rem; line-height:1.55;
  color:#e0e0e0; background:none; padding:0; border-radius:0;
}
```

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
    entityBkg: '#0a0a0a',           // entity box fill
    entityBorder: '#7c3aed',        // purple border on entities
    entityTextColor: '#ffffff',
    attributeBackgroundColorEven: '#0a0a0a',
    attributeBackgroundColorOdd: '#141414',
    labelColor: '#a0a0a0',          // relationship labels
    relationColor: '#a855f7',       // relationship lines (purple)
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
├── DiagramViewport (full screen, pan/zoom via usePanZoom hook)
│   └── MermaidDiagram (renders SVG into ref)
├── ZoomControls (fixed bottom-left)
├── Legend (fixed bottom-center)
├── DetailPanel (fixed right, conditional render)
│   ├── Close button (×)
│   ├── Title
│   ├── Body (dangerouslySetInnerHTML with rich HTML)
│   └── Related Files
└── KeyboardHint (fixed bottom-right)
```

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

### DetailPanel Component

```jsx
function DetailPanel({ node, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 bottom-4 w-[420px] z-30 bg-wt-surface border border-wt-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
      <button onClick={onClose}
        className="absolute top-3 right-3 z-10 w-7 h-7 rounded-md border border-wt-border bg-wt-raised text-wt-muted flex items-center justify-center text-lg hover:bg-wt-red hover:border-wt-red hover:text-white transition-colors">
        &times;
      </button>
      <div className="flex-1 overflow-y-auto p-5">
        <h2 className="text-lg font-bold text-wt-fg mb-4 pr-9">{node.title}</h2>
        <div className="dt-body" dangerouslySetInnerHTML={{ __html: node.content }} />
        {node.files?.length > 0 && (
          <div className="mt-5 pt-4 border-t border-wt-border">
            <div className="text-[0.7rem] uppercase tracking-wider text-wt-muted font-semibold mb-1.5">
              Related Files
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

### App Component (top-level wiring)

```jsx
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
        <h1 className="text-base font-semibold text-wt-fg">{{TITLE}}</h1>
        <p className="text-sm text-wt-muted mt-0.5">{{SUBTITLE}}</p>
      </header>

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

      {activeId && NODES[activeId] && <DetailPanel node={NODES[activeId]} onClose={closeDetail} />}

      <div className="fixed bottom-5 right-5 z-20 text-xs text-wt-muted opacity-50">
        <kbd>Scroll</kbd> zoom · <kbd>Drag</kbd> pan · Click nodes
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

## Node Detail Data Format

Rich HTML content per node. Use `<h3>`, `<p>`, `<pre><code>`, `<ul><li>`, and inline `<code>`:

```js
const NODES = {
  nodeId: {
    title: "Human-readable title",
    content: `
      <h3>Overview</h3>
      <p>Description of what this does.</p>
      <h3>Key Pattern</h3>
      <pre><code>// Real code from the file
const result = doSomething()</code></pre>
      <h3>Details</h3>
      <ul>
        <li><code>param</code> — description</li>
      </ul>
    `,
    files: ["app/path/to/file.ts:12-45"]
  },
};
```

**Guidelines:**
- Start with `<h3>Overview</h3>` + description paragraph
- HTML-escape `<` as `&lt;`, `>` as `&gt;` inside `<pre><code>` blocks
- Keep code snippets to 5-15 lines
- `files` is an array of `"path:lines"` strings

## Mermaid classDef (Purple Shades)

```
classDef component fill:#a855f7,stroke:#c084fc,color:#fff
classDef composable fill:#7c3aed,stroke:#a78bfa,color:#fff
classDef utility fill:#6d28d9,stroke:#8b5cf6,color:#fff
classDef external fill:#525252,stroke:#737373,color:#fff
classDef event fill:#d8b4fe,stroke:#e9d5ff,color:#000
classDef data fill:#9333ea,stroke:#a855f7,color:#fff
```

## Tips

1. **Auto-fit on load**: `setTimeout(pz.fitToScreen, 600)` waits for Mermaid to finish rendering
2. **Node clicks vs pan**: Check `e.target.closest('.node')` in pointerdown to let clicks through
3. **Performance**: Use `useRef` for pan/zoom state, update DOM directly — no React re-renders during drag
4. **Mermaid click bridge**: Set `window.nodeClickHandler` before `mermaid.render()` so click bindings work
7. **bindFunctions is mandatory**: After `innerHTML = svg`, call `bindFunctions?.(ref.current)` — without this, click handlers are lost
5. **Keep diagrams readable**: 8-20 nodes max. Use subgraphs to group related nodes
6. **Node ID consistency**: Mermaid node ID, `click` binding ID, and `NODES` key must match exactly
