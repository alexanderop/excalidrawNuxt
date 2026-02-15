# Excalidraw Parity Backlog

> Generated from audit comparing our app against real Excalidraw.
> Each ticket has acceptance criteria (ACs) that define "done".

---

## Critical Priority

### TICKET-001: Undo / Redo

**Priority:** Critical
**Tags:** `core`, `state-management`

**Description:**
Implement a full undo/redo history system so users can revert and replay changes to the canvas.

**Acceptance Criteria:**

- [ ] Ctrl+Z undoes the last operation (element create, move, resize, rotate, delete, style change, group/ungroup)
- [ ] Ctrl+Shift+Z (or Ctrl+Y) redoes a previously undone operation
- [ ] Undo/redo stack supports at least 100 history entries
- [ ] History is cleared when the canvas is cleared
- [ ] Redo stack is cleared when a new action is performed after undo
- [ ] Batch operations (e.g. multi-element delete) undo as a single step
- [ ] Undo/redo actions are registered in the action registry with proper keyboard shortcuts
- [ ] Undo/redo buttons visible in the UI (toolbar or footer)

---

### TICKET-002: Auto-save to localStorage

**Priority:** Critical
**Tags:** `persistence`, `state-management`

**Description:**
Persist the current canvas state to localStorage so that work survives page refreshes and browser restarts.

**Acceptance Criteria:**

- [ ] Canvas state (all elements, viewport position, zoom level) is saved to localStorage on every change
- [ ] Saving is debounced (e.g. 300ms) to avoid performance issues during rapid edits
- [ ] On app load, if saved state exists in localStorage, it is restored automatically
- [ ] Restored state includes all element properties (position, size, style, bindings, groups)
- [ ] Image data (blobs) is persisted alongside element references
- [ ] A "Clear canvas" action wipes localStorage state after user confirmation

---

### TICKET-003: Save / Load Scene (JSON)

**Priority:** Critical
**Tags:** `persistence`, `file-io`

**Description:**
Allow users to export the current scene as a `.excalidraw` JSON file and load scenes from file.

**Acceptance Criteria:**

- [ ] Ctrl+S triggers a "Save to file" download of the scene as `.excalidraw` JSON
- [ ] Ctrl+O opens a file picker to load a `.excalidraw` JSON file
- [ ] Exported JSON contains all elements, app state (viewport, zoom), and embedded image data
- [ ] Loading a file replaces the current canvas (with confirmation dialog if canvas is non-empty)
- [ ] Invalid or corrupt files show a user-friendly error message
- [ ] Actions registered in action registry with keyboard shortcuts
- [ ] File format is compatible with real Excalidraw's `.excalidraw` format where possible

---

### TICKET-004: Export as PNG / SVG

**Priority:** Critical
**Tags:** `export`, `file-io`

**Description:**
Allow users to export the current canvas or selection as PNG or SVG image files.

**Acceptance Criteria:**

- [ ] Export dialog accessible from a menu or keyboard shortcut
- [ ] User can choose between PNG and SVG export formats
- [ ] Export options include: background (on/off), dark mode variant, scale factor (1x/2x/3x), padding
- [ ] "Export selection only" option when elements are selected
- [ ] PNG export renders at the chosen scale with correct anti-aliasing
- [ ] SVG export produces valid, self-contained SVG markup
- [ ] Exported images include all visible elements with correct styles, fonts, and images
- [ ] Download triggers automatically with a sensible filename (e.g. `drawing.png`)

---

### TICKET-005: Zoom Controls UI

**Priority:** Critical
**Tags:** `canvas`, `ui`

**Description:**
Add visible zoom controls and a zoom level indicator so users can see and control the current zoom.

**Acceptance Criteria:**

- [ ] Zoom percentage is displayed in the bottom-left or bottom-right of the canvas
- [ ] Clicking the zoom percentage opens a dropdown with preset levels (50%, 100%, 150%, 200%)
- [ ] Plus (+) and minus (-) buttons for incremental zoom
- [ ] Ctrl+= zooms in, Ctrl+- zooms out, Ctrl+0 resets to 100%
- [ ] Shift+1 zooms to fit all elements
- [ ] Shift+2 zooms to fit selection (or all if nothing selected)
- [ ] Zoom animates smoothly (not instant jumps)
- [ ] Zoom centers on the cursor position (for scroll zoom) or canvas center (for button zoom)

---

### TICKET-006: Eraser Tool — DONE (PR #4)

**Priority:** Critical
**Tags:** `tools`

**Description:**
Implement an eraser tool that removes elements by clicking or dragging over them.

**Acceptance Criteria:**

- [x] Eraser tool selectable from toolbar and via keyboard shortcut (E)
- [x] Clicking on an element deletes it
- [x] Dragging across the canvas deletes all elements the eraser path intersects
- [x] Eraser cursor is visually distinct (eraser icon or crosshair)
- [x] Erasing grouped elements erases the entire group
- [ ] Eraser respects element locking (locked elements are not erased) — once locking is implemented
- [x] Erased elements can be undone via Ctrl+Z
- [x] Action registered in action registry

---

## High Priority

### TICKET-007: Align Elements

**Priority:** High
**Tags:** `transform`, `multi-element`

**Description:**
Add alignment actions for positioning multiple selected elements relative to each other.

**Acceptance Criteria:**

- [ ] Six alignment actions: align left, align right, align top, align bottom, center horizontally, center vertically
- [ ] Alignment is relative to the bounding box of the entire selection
- [ ] Actions are only enabled when 2+ elements are selected
- [ ] Actions accessible from context menu, command palette, and keyboard shortcuts
- [ ] Each action registered in the action registry
- [ ] Alignment moves elements without changing their size or rotation

---

### TICKET-008: Distribute Elements

**Priority:** High
**Tags:** `transform`, `multi-element`

**Description:**
Add distribute actions for evenly spacing multiple selected elements.

**Acceptance Criteria:**

- [ ] Two distribute actions: distribute horizontally, distribute vertically
- [ ] Elements are spaced evenly based on their bounding box centers
- [ ] Actions are only enabled when 3+ elements are selected
- [ ] Outermost elements stay in place; inner elements are repositioned
- [ ] Actions accessible from context menu and command palette
- [ ] Each action registered in the action registry

---

### TICKET-009: Element Locking

**Priority:** High
**Tags:** `elements`, `interaction`

**Description:**
Allow users to lock elements so they cannot be moved, resized, rotated, or accidentally modified.

**Acceptance Criteria:**

- [ ] "Lock" / "Unlock" toggle action available in context menu and command palette
- [ ] Locked elements display a lock icon indicator
- [ ] Locked elements cannot be moved, resized, or rotated via mouse interaction
- [ ] Locked elements can still be selected (for copy, unlock, inspect)
- [ ] Locked elements are skipped during box selection
- [ ] Locked elements cannot be deleted (unless explicitly unlocked first)
- [ ] Lock state persists in element data and is saved/loaded with the scene
- [ ] Keyboard shortcut for lock toggle (Ctrl+Shift+L)
- [ ] Action registered in the action registry

---

### TICKET-010: Alt+Drag to Duplicate

**Priority:** High
**Tags:** `interaction`, `clipboard`

**Description:**
Allow users to duplicate elements by holding Alt while dragging them.

**Acceptance Criteria:**

- [ ] Holding Alt while starting a drag on selected element(s) creates a duplicate at the original position
- [ ] The duplicated elements become the actively dragged elements
- [ ] Original elements remain in place, unmodified
- [ ] Works with single and multi-element selections
- [ ] Works with grouped elements (duplicates the entire group)
- [ ] Cursor changes to indicate copy mode when Alt is held during drag
- [ ] Duplicated elements get new unique IDs

---

### TICKET-011: Elbow / Orthogonal Arrows

**Priority:** High
**Tags:** `elements`, `arrows`

**Description:**
Implement elbow (right-angle/orthogonal) arrows that route around obstacles with 90-degree bends.

**Acceptance Criteria:**

- [ ] Arrow type toggle in properties panel: "straight" vs "elbow"
- [ ] Elbow arrows route with horizontal and vertical segments only (90-degree turns)
- [ ] Elbow arrows automatically route around bound elements
- [ ] Routing updates dynamically when connected elements are moved
- [ ] Midpoints of elbow segments can be dragged to adjust routing
- [ ] Elbow arrows support all arrowhead types
- [ ] Elbow arrows work with the binding system (start/end binding to shapes)
- [ ] Renders with the same hand-drawn style as other elements

---

### TICKET-012: Extended Arrowhead Types

**Priority:** High
**Tags:** `elements`, `arrows`, `properties`

**Description:**
Add more arrowhead types beyond the current arrow/dot/bar/none set.

**Acceptance Criteria:**

- [ ] New arrowhead types: triangle, diamond, circle (filled), circle (outline)
- [ ] Crowfoot notation variants: one, many, one-or-many, zero-or-one, zero-or-many (for ER diagrams)
- [ ] Arrowhead picker UI updated to show all available types with icons
- [ ] All arrowhead types render correctly at all zoom levels and arrow angles
- [ ] Arrowheads scale proportionally with stroke width
- [ ] All types work for both start and end positions

---

### TICKET-013: Snap to Objects

**Priority:** High
**Tags:** `canvas`, `interaction`

**Description:**
Implement snap-to-object guides that appear when dragging elements near the edges or centers of other elements.

**Acceptance Criteria:**

- [ ] While dragging an element, snap guides appear when edges or centers align with other elements
- [ ] Snap guides are visual lines (dashed, colored) spanning the relevant alignment axis
- [ ] Snapping activates within a configurable threshold (e.g. 5px)
- [ ] Snap to: element edges (top/bottom/left/right), element centers (horizontal/vertical)
- [ ] Snap to: equal spacing between elements
- [ ] Toggle via Alt+S or a toolbar button
- [ ] Snapping can be temporarily disabled by holding a modifier key (e.g. Alt)
- [ ] Snap guides disappear when the drag ends

---

### TICKET-014: Grid Snapping

**Priority:** High
**Tags:** `canvas`, `interaction`

**Description:**
Make elements snap to the grid when the grid is enabled, so drawing and moving aligns to grid points.

**Acceptance Criteria:**

- [ ] When grid is visible, newly drawn elements snap to grid points
- [ ] When grid is visible, dragged elements snap to grid points
- [ ] When grid is visible, resized elements snap edges to grid points
- [ ] Grid snap size matches the visual grid spacing
- [ ] Holding Ctrl/Cmd while dragging temporarily disables grid snap
- [ ] Grid snapping applies during element creation (draw start/end snap to grid)

---

### TICKET-015: Element Hyperlinks

**Priority:** High
**Tags:** `elements`, `interaction`

**Description:**
Allow users to attach hyperlinks to elements that can be clicked to navigate.

**Acceptance Criteria:**

- [ ] Right-click > "Add link" or Ctrl+K opens a link input dialog for the selected element
- [ ] Link icon indicator appears on elements that have a link
- [ ] Clicking the link icon opens the URL in a new tab
- [ ] Links are editable and removable via the same dialog
- [ ] Link URLs are validated (must be valid http/https URL)
- [ ] Links persist in element data and are saved/loaded with the scene
- [ ] Links are included in JSON export

---

### TICKET-016: Lasso Selection

**Priority:** High
**Tags:** `selection`, `tools`

**Description:**
Implement freehand lasso selection for selecting elements by drawing around them.

**Acceptance Criteria:**

- [ ] Lasso tool available as a sub-option of the selection tool or via keyboard shortcut
- [ ] Drawing a freehand loop selects all elements fully enclosed within the loop
- [ ] Lasso path is visible while drawing (dashed outline)
- [ ] Shift+lasso adds to current selection
- [ ] Lasso works at all zoom levels
- [ ] Path auto-closes when the mouse is released
- [ ] Performance is acceptable with 100+ elements on canvas

---

## Medium Priority

### TICKET-017: Welcome Screen

**Priority:** Medium
**Tags:** `ui`, `onboarding`

**Description:**
Show a welcome screen on empty canvas with hints and getting-started actions.

**Acceptance Criteria:**

- [ ] Welcome screen is shown when the canvas has no elements
- [ ] Shows the app logo/name
- [ ] Includes quick-start hints (e.g. "Draw a shape", "Use keyboard shortcuts")
- [ ] Includes action buttons: "Open file", "Start drawing"
- [ ] Disappears automatically when the user starts drawing or loads a file
- [ ] Can be dismissed manually
- [ ] Does not reappear once dismissed (preference stored in localStorage)

---

### TICKET-018: Help / Keyboard Shortcuts Dialog

**Priority:** Medium
**Tags:** `ui`, `discoverability`

**Description:**
Add a help dialog that shows all available keyboard shortcuts grouped by category.

**Acceptance Criteria:**

- [ ] Dialog opens via `?` key or Help menu item
- [ ] Shortcuts are grouped by category: Tools, Selection, Editing, Canvas, View, File
- [ ] Each shortcut shows the key combination and a brief description
- [ ] Dialog is scrollable and searchable
- [ ] Shows platform-appropriate modifier keys (Cmd on Mac, Ctrl on Windows)
- [ ] Dialog is dismissible via Escape or clicking outside
- [ ] Links to documentation if available

---

### TICKET-019: Zen Mode

**Priority:** Medium
**Tags:** `canvas`, `ui`

**Description:**
Implement a distraction-free zen mode that hides all UI chrome.

**Acceptance Criteria:**

- [ ] Alt+Z toggles zen mode
- [ ] In zen mode: toolbar, properties panel, and all UI overlays are hidden
- [ ] Only the canvas and cursor remain visible
- [ ] A subtle indicator shows how to exit zen mode (e.g. "Press Alt+Z to exit")
- [ ] All keyboard shortcuts still work in zen mode
- [ ] Drawing and editing work normally
- [ ] Action registered in the action registry

---

### TICKET-020: View Mode (Read-Only)

**Priority:** Medium
**Tags:** `canvas`, `ui`

**Description:**
Implement a read-only view mode for presenting or reviewing drawings without accidental edits.

**Acceptance Criteria:**

- [ ] Alt+R toggles view mode
- [ ] In view mode: all editing tools are disabled
- [ ] Canvas can still be panned and zoomed
- [ ] Element hyperlinks are clickable
- [ ] Toolbar shows a "View Mode" indicator
- [ ] No selection handles or cursors appear on hover
- [ ] Action registered in the action registry

---

### TICKET-021: Zoom to Fit

**Priority:** Medium
**Tags:** `canvas`, `navigation`

**Description:**
Add zoom-to-fit actions for quickly framing all elements or the current selection.

**Acceptance Criteria:**

- [ ] Shift+1: Zoom to fit all elements with padding
- [ ] Shift+2: Zoom to fit current selection (or all if nothing selected)
- [ ] Zoom animates smoothly to the target view
- [ ] Works correctly with elements at extreme positions or very small/large scales
- [ ] Padding is consistent (e.g. 10% of viewport)
- [ ] Actions registered in the action registry and accessible from zoom controls dropdown

---

### TICKET-022: Canvas Background Color

**Priority:** Medium
**Tags:** `canvas`, `properties`

**Description:**
Allow users to customize the canvas background color.

**Acceptance Criteria:**

- [ ] Background color picker in canvas settings or properties panel (when no element selected)
- [ ] Default background is white (light mode) or dark navy (dark mode)
- [ ] Color persists across sessions (saved with scene)
- [ ] Background color is included in PNG/SVG exports
- [ ] Supports the same color palette as element stroke/fill colors
- [ ] Custom color input (hex) supported

---

### TICKET-023: Text Vertical Alignment

**Priority:** Medium
**Tags:** `elements`, `text`, `properties`

**Description:**
Add vertical alignment options for text inside container elements.

**Acceptance Criteria:**

- [ ] Vertical alignment options: top, middle, bottom
- [ ] Visible in properties panel when a text-containing element is selected
- [ ] Default is "middle" (current behavior)
- [ ] Alignment applies to bound text within rectangles, diamonds, ellipses
- [ ] Alignment persists in element data
- [ ] Updates in real-time when changed

---

### TICKET-024: Fill Style: Zigzag

**Priority:** Medium
**Tags:** `elements`, `rendering`, `properties`

**Description:**
Add the zigzag fill style option alongside existing hachure, cross-hatch, and solid fills.

**Acceptance Criteria:**

- [ ] "Zigzag" option added to fill style picker in properties panel
- [ ] Zigzag renders as a zigzag pattern inside the shape (similar to hachure but with sharp angles)
- [ ] Respects stroke color, background color, and roughness settings
- [ ] Works on all fillable shapes: rectangle, diamond, ellipse
- [ ] Renders correctly at all zoom levels

---

### TICKET-025: Roughness Named Presets

**Priority:** Medium
**Tags:** `properties`, `ui`

**Description:**
Replace or augment the roughness slider with named presets matching Excalidraw's UX.

**Acceptance Criteria:**

- [ ] Three named roughness presets: "Architect" (0), "Artist" (1), "Cartoonist" (2)
- [ ] Displayed as selectable buttons with icons in the properties panel
- [ ] Each preset maps to a specific roughness value
- [ ] Current roughness slider can optionally remain for fine-tuning
- [ ] Default is "Artist" (roughness 1)
- [ ] Selection persists per element

---

### TICKET-026: Frame Tool

**Priority:** Medium
**Tags:** `tools`, `elements`

**Description:**
Implement a frame tool for creating artboard-like containers that clip and group elements.

**Acceptance Criteria:**

- [ ] Frame tool in toolbar with keyboard shortcut (F)
- [ ] Drawing a frame creates a named rectangular region
- [ ] Frame has a visible label (editable name) at the top
- [ ] Elements inside the frame are visually clipped to the frame boundaries
- [ ] Moving a frame moves all contained elements
- [ ] Elements can be dragged in and out of frames
- [ ] Frames can be selected, resized, and deleted
- [ ] "Select all in frame" action available
- [ ] Frames export as separate artboards in PNG/SVG

---

### TICKET-027: Find / Search Elements

**Priority:** Medium
**Tags:** `ui`, `navigation`

**Description:**
Implement a search feature to find elements by their text content.

**Acceptance Criteria:**

- [ ] Ctrl+F opens a search bar
- [ ] Typing in the search bar highlights elements containing the search text
- [ ] Enter navigates to the next match, Shift+Enter to previous
- [ ] Canvas auto-pans and zooms to show matched elements
- [ ] Match count displayed (e.g. "3 of 12")
- [ ] Search is case-insensitive
- [ ] Escape closes the search bar
- [ ] Searches text elements and bound text

---

### TICKET-028: Image Cropping

**Priority:** Medium
**Tags:** `elements`, `images`

**Description:**
Allow users to crop image elements directly on the canvas.

**Acceptance Criteria:**

- [ ] Double-click on an image element enters crop mode
- [ ] Crop handles appear on all edges and corners
- [ ] Dragging crop handles adjusts the visible area of the image
- [ ] Original image data is preserved (non-destructive cropping)
- [ ] "Reset crop" action restores the original bounds
- [ ] Escape or clicking outside exits crop mode
- [ ] Cropped images render correctly at all zoom levels
- [ ] Crop state persists in element data

---

### TICKET-029: Confirmation Dialogs for Destructive Actions

**Priority:** Medium
**Tags:** `ui`, `safety`

**Description:**
Add confirmation dialogs before destructive actions to prevent accidental data loss.

**Acceptance Criteria:**

- [ ] "Clear canvas" prompts "Are you sure? This will delete all elements."
- [ ] "Load file" on non-empty canvas prompts "Loading will replace the current canvas. Continue?"
- [ ] Dialogs have "Cancel" and "Confirm" buttons
- [ ] Confirm button is visually distinct (destructive/red styling)
- [ ] Escape or Cancel returns to the previous state with no changes
- [ ] Dialog component is reusable for future destructive actions

---

## Low Priority

### TICKET-030: Real-Time Collaboration

**Priority:** Low
**Tags:** `collaboration`, `networking`

**Description:**
Implement real-time collaborative editing so multiple users can draw on the same canvas simultaneously.

**Acceptance Criteria:**

- [ ] Users can share a link to invite collaborators
- [ ] Collaborator cursors are visible in real-time with user names
- [ ] Element changes sync in real-time across all connected clients
- [ ] Conflict resolution handles simultaneous edits to the same element
- [ ] User avatars/presence indicators shown in the UI
- [ ] Works with WebSocket or WebRTC-based transport
- [ ] Graceful handling of disconnections and reconnections
- [ ] Collaborative state is consistent across all clients

---

### TICKET-031: Libraries Panel

**Priority:** Low
**Tags:** `ui`, `elements`, `reuse`

**Description:**
Implement a libraries panel for saving and reusing element collections.

**Acceptance Criteria:**

- [ ] Libraries panel accessible from sidebar or toolbar
- [ ] Users can select elements and "Add to library"
- [ ] Library items are displayed as thumbnails with names
- [ ] Clicking a library item places it on the canvas
- [ ] Libraries persist in localStorage
- [ ] Libraries can be exported/imported as JSON files
- [ ] Built-in starter library with common shapes (optional)
- [ ] Library items can be deleted or renamed

---

### TICKET-032: Internationalization (i18n)

**Priority:** Low
**Tags:** `ui`, `i18n`

**Description:**
Add multi-language support to the application.

**Acceptance Criteria:**

- [ ] All user-facing strings are externalized into translation files
- [ ] Language selector in settings/menu
- [ ] At minimum: English, Spanish, French, German, Chinese, Japanese
- [ ] Language preference persists in localStorage
- [ ] UI layout handles varying text lengths gracefully
- [ ] Date/number formatting respects locale
- [ ] Uses Nuxt i18n module or equivalent

---

### TICKET-033: Mobile / Touch Support

**Priority:** Low
**Tags:** `ui`, `interaction`, `mobile`

**Description:**
Optimize the app for touch devices with responsive toolbar and touch gestures.

**Acceptance Criteria:**

- [ ] Pinch-to-zoom works on touch devices
- [ ] Two-finger pan works for canvas navigation
- [ ] Toolbar is responsive and touch-friendly on small screens
- [ ] Properties panel adapts to mobile layout (bottom sheet or collapsible)
- [ ] Touch targets meet minimum 44px size
- [ ] Long-press opens context menu on touch devices
- [ ] Drawing with finger/stylus works smoothly
- [ ] No hover-dependent interactions block mobile usage

---

### TICKET-034: Laser Pointer Tool

**Priority:** Low
**Tags:** `tools`, `collaboration`

**Description:**
Implement a laser pointer tool for highlighting areas during presentations or collaboration.

**Acceptance Criteria:**

- [ ] Laser pointer tool in toolbar with keyboard shortcut (K)
- [ ] Draws a temporary colored trail that fades after ~1 second
- [ ] Trail is visible to all collaborators (when collaboration is implemented)
- [ ] Does not create persistent elements on the canvas
- [ ] Trail color is distinct and configurable
- [ ] Works at all zoom levels

---

### TICKET-035: Embeddable Elements

**Priority:** Low
**Tags:** `elements`, `advanced`

**Description:**
Allow embedding external content (websites, videos, etc.) as interactive elements on the canvas.

**Acceptance Criteria:**

- [ ] "Embed" tool or action to insert an iframe element
- [ ] User provides a URL; the content is rendered inside the element bounds
- [ ] Supported embed types: YouTube, Vimeo, websites, Google Docs
- [ ] Embed elements can be resized and repositioned
- [ ] Embeds are interactive (scrollable, clickable) when focused
- [ ] Security: only allow embeds from allowlisted domains
- [ ] Embeds render as placeholders in export (PNG/SVG)

---

### TICKET-036: AI Text-to-Diagram

**Priority:** Low
**Tags:** `ai`, `advanced`

**Description:**
Implement AI-powered text-to-diagram generation using natural language or Mermaid syntax.

**Acceptance Criteria:**

- [ ] Chat/prompt interface for describing diagrams in natural language
- [ ] Mermaid syntax input with preview
- [ ] Generated diagrams are placed on the canvas as editable elements
- [ ] Support for flowcharts, sequence diagrams, ER diagrams at minimum
- [ ] AI provider is configurable (API key in settings)
- [ ] Generation history for re-running or modifying prompts
- [ ] Error handling for invalid inputs or API failures

---

### TICKET-037: Accessibility Improvements

**Priority:** Low
**Tags:** `a11y`, `ui`

**Description:**
Improve accessibility with proper ARIA attributes, keyboard navigation, and screen reader support.

**Acceptance Criteria:**

- [ ] All interactive elements have ARIA labels
- [ ] Toolbar is fully navigable via Tab/Arrow keys
- [ ] Focus indicators are visible on all interactive elements
- [ ] Screen reader announces tool changes, selections, and actions
- [ ] Color contrast meets WCAG 2.1 AA standards
- [ ] Properties panel controls are keyboard accessible
- [ ] Skip navigation link for canvas area
- [ ] Alt text support for image elements

---

### TICKET-038: Copy as PNG/SVG to Clipboard

**Priority:** Low
**Tags:** `clipboard`, `export`

**Description:**
Allow copying the current selection or canvas as a PNG or SVG image directly to the system clipboard.

**Acceptance Criteria:**

- [ ] "Copy as PNG" action copies a rendered PNG of the selection to clipboard
- [ ] "Copy as SVG" action copies SVG markup to clipboard
- [ ] Actions available in context menu and command palette
- [ ] Copied image includes background (optional, based on export settings)
- [ ] Clipboard image can be pasted into other apps (Slack, Docs, Figma, etc.)
- [ ] Keyboard shortcuts: Ctrl+Shift+C for copy as PNG
- [ ] Toast notification confirms copy success

---

### TICKET-039: Paste as Chart

**Priority:** Low
**Tags:** `clipboard`, `advanced`

**Description:**
Detect tabular data or CSV in the clipboard and offer to convert it into a chart/diagram.

**Acceptance Criteria:**

- [ ] When pasting, detect if clipboard contains CSV or tab-separated data
- [ ] Offer a dialog: "Paste as chart?" with chart type options (bar, line, pie)
- [ ] Generate chart elements on the canvas using the pasted data
- [ ] Charts are composed of regular Excalidraw elements (rectangles, text, lines)
- [ ] Charts are fully editable after creation
- [ ] Fallback to plain text paste if user declines
