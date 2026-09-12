# Pixel Forge

> A professional, **100% offline** image editor that runs entirely in your browser.
> No account, no server, no tracking — every pixel stays on your machine.

Pixel Forge is a from-scratch, canvas-based raster image editor built to feel
like a native desktop tool (Photoshop / Affinity / Krita lineage) rather than a
generic web template. It is designed to be **authentic, performant, and
maintainable**: a modular TypeScript codebase, a single source of truth via
Zustand, and a document model centered on compositable layers.

---

## ✨ What it does

Pixel Forge is a complete, working editor — not a demo. Out of the box it ships:

### Tools
- **Move** — translate the active layer's pixels
- **Rectangle / Lasso selection** — define editable regions (marching-ants preview)
- **Eyedropper** — sample any color from the composited canvas
- **Brush** — soft round stamping with size, opacity, hardness, flow, smoothing & spacing
- **Eraser** — destination-out brush
- **Fill (bucket)** — flood fill with adjustable tolerance & contiguity
- **Shapes** — rectangle, ellipse, line; outline / fill / both; shift to constrain
- **Text** — multi-line, font family, size, bold, italic, alignment
- **Pan / Zoom** — drag to pan, scroll to zoom, cursor-anchored zoom

### Layers
- Unlimited layers with live thumbnails
- **16 blend modes** (Normal, Multiply, Screen, Overlay, …, Luminosity)
- Per-layer opacity, visibility, lock, rename (double-click)
- Duplicate, merge-down, flatten, reorder
- Live, non-destructive **adjustments** per layer (brightness, contrast,
  saturation, hue, blur, grayscale, sepia, invert)

### Filters
- **Non-destructive presets** (Brighten, Punch, Grayscale, Sepia, Hue Shift…)
- **Destructive pixel filters** baked into the layer:
  Sharpen, Posterize, Emboss, Find Edges, Add Noise, Pixelate, Threshold, Vignette

### History
- Full undo/redo with labeled snapshots (up to 60 steps)
- Snapshots capture layer pixels, blend modes, opacity, filters & selection

### Import / Export
- Open **PNG / JPEG / WebP / BMP / GIF** via picker or drag-drop
- Export to **PNG / JPEG / WebP** with quality, scale, transparency & flatten toggles
- Output dimensions shown live; files download directly to disk

### Experience
- Dense, keyboard-first UI with a full shortcut map
- DPI-aware retina rendering with a separate overlay canvas for previews
- Custom hand-drawn SVG tool icons (no stock icon library)
- JetBrains Mono throughout — a deliberate "developer tool" aesthetic
- Limited graphite + single amber accent palette — no AI-template gradients

---

## 🔒 Privacy & offline

Pixel Forge is **offline-first by construction**:

- There is **no backend**. No API routes, no database, no telemetry.
- Images are processed with the browser's Canvas API in memory and never leave
  the device.
- No fonts, icons, or scripts are fetched from a CDN at runtime.
- Opening the app once is enough to keep editing — there is no network
  dependency for any feature.

If you host it on a static file server (or even open the built bundle via
`file://` in some configurations), every feature keeps working.

---

## 🚀 Getting started

```bash
# install dependencies
bun install

# start the dev server (http://localhost:3000)
bun run dev

# lint
bun run lint
```

Then open the **Preview Panel** (the running app is on port 3000). Click
**Open in New Tab** above the preview if you want a full-window view.

> The editor boots with a blank 1280×800 canvas so you can start drawing
> immediately. Use **New** to pick a preset, **Open** to import an image, or
> just grab the brush (`B`) and go.

---

## ⌨️ Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Move · Pan · Zoom | `V` `H` `Z` |
| Rect select · Lasso · Eyedropper | `M` `L` `I` |
| Brush · Eraser · Fill | `B` `E` `G` |
| Rectangle · Ellipse · Line | `R` `O` `U` |
| Text | `T` |
| Undo · Redo | `Ctrl/⌘+Z` · `Ctrl/⌘+Shift+Z` |
| New · Open · Export | `Ctrl/⌘+N` · `Ctrl/⌘+O` · `Ctrl/⌘+E` |
| Fit to screen · Actual size | `Ctrl/⌘+0` · `Ctrl/⌘+1` |
| Zoom in · Zoom out | `+` / `-` (or `Ctrl/⌘+=` / `Ctrl/⌘+-`) |
| Select all · Deselect | `Ctrl/⌘+A` · `Esc` |
| New layer | `Ctrl/⌘+Shift+N` |
| Swap foreground/background | `X` |
| Reset colors | `Ctrl/⌘+D` |
| Brush smaller / larger | `[` / `]` |
| Pan (temporary) | hold `Space` + drag |
| Constrain shape (square/circle/45° line) | hold `Shift` while dragging |

Right-click while drawing paints with the **background color**.

---

## 🏗️ Architecture

The codebase is split into a pure **engine** layer (no React) and a thin
**React UI** layer that subscribes to a single Zustand store.

```
src/
├── app/
│   ├── layout.tsx            # JetBrains Mono, dark theme
│   ├── globals.css           # graphite + amber palette, custom scrollbars
│   └── page.tsx              # editor shell (assembles all panels)
│
├── lib/
│   ├── editor/
│   │   ├── types.ts          # DocumentModel, Layer, BrushSettings, …
│   │   ├── constants.ts      # tools, blend modes, filter presets
│   │   ├── canvas-engine.ts  # layer compositing + view transforms
│   │   ├── layer-manager.ts  # create/clone/merge + history snapshots
│   │   ├── history-manager.ts# bounded undo/redo stack
│   │   ├── filter-engine.ts  # destructive pixel filters (sharpen, edges…)
│   │   └── drawing.ts        # brush stamping, flood fill, shapes, sampling
│   ├── store/
│   │   └── editor-store.ts   # Zustand: doc, tool, view, history, actions
│   └── utils/
│       └── image-utils.ts    # color, blurs, file I/O helpers
│
├── components/
│   └── editor/
│       ├── icons.tsx         # hand-crafted SVG glyphs
│       ├── TopBar.tsx        # brand, file menu, undo/redo, zoom, export
│       ├── ToolOptions.tsx  # contextual toolbar (adapts to active tool)
│       ├── Toolbar.tsx       # vertical tool strip + color swatches
│       ├── CanvasStage.tsx   # the interactive canvas + pointer handling
│       ├── RightPanel.tsx    # tabbed inspector (Layers/Adjust/Filters)
│       ├── StatusBar.tsx     # cursor, zoom, layer count, history cursor
│       ├── NewDocumentDialog.tsx
│       ├── ExportDialog.tsx
│       ├── ImportButton.tsx
│       └── panels/
│           ├── LayersPanel.tsx
│           ├── AdjustPanel.tsx
│           └── FiltersPanel.tsx
│
└── hooks/
    └── useEditorShortcuts.ts # global key bindings
```

### Design principles

1. **Pure engine, thin UI.** `lib/editor/*` has zero React imports. Every
   mutation (layer op, filter, stroke) is a plain function over a
   `DocumentModel`. This keeps the core testable and reusable.
2. **Single store, one render token.** The Zustand store owns all state
   including the (non-serializable) layer canvases. Canvas mutations push a
   `renderToken` bump; `CanvasStage` subscribes to it and re-composites. No
   React reconciliation needed for pixel work.
3. **History snapshots are data URLs.** Each history entry serializes every
   layer to PNG. It's heavier than a diff but trivially correct across
   blend-mode/opacity/filter changes — undo *always* restores exactly.
4. **Non-destructive adjustments via CSS filter.** Brightness/contrast/etc.
   live in `LayerFilters` and are applied at composite time through the
   canvas `filter` property. Export bakes them into pixels.
5. **Authentic, non-generic UI.** Custom SVG icons, a graphite palette with a
   single amber accent, JetBrains Mono everywhere, dense panels with thin
   borders and 2–3px corner radii — deliberately avoiding the visual tells of
   AI-generated templates (purple gradients, Inter font, rounded card grids).

### Compositing pipeline

```
Layer.canvas (off-screen, per layer)
        │
        ▼  CanvasEngine.drawLayer()  ← blend mode, opacity, CSS filter, mask
Composited off-screen canvas (doc-sized)
        │
        ▼  drawImage with DPR + view transform
Visible <canvas> on the stage
```

A second overlay canvas renders transient previews (shape-in-progress,
selection ants, brush cursor outline) so the base canvas is never torn down
mid-stroke.

---

## 🧰 Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui (heavily themed) |
| State | Zustand |
| Rendering | HTML5 Canvas 2D (DPR-aware) |
| Icons | Hand-authored SVG components |
| Font | JetBrains Mono |
| Packaging | Bun |

No WebGL or WebAssembly is required — the Canvas 2D path is fast enough for
the intended document sizes and keeps the bundle small and the code
debuggable. The architecture is structured so a WebGL filter pass could be
added behind `filter-engine.ts` later without touching the UI.

---

## 🤝 Contributing

Pixel Forge is **open source** and contributions are welcome.

1. Fork the repo and create a feature branch.
2. Keep engine code in `lib/editor/*` free of React — it should compile and be
   testable in isolation.
3. New tools implement the existing pointer-handler pattern in
   `CanvasStage.tsx`; new filters go in `filter-engine.ts` and surface
   automatically in the Filters panel via the `DESTRUCTIVE_FILTERS` table.
4. Run `bun run lint` before submitting — the project enforces a clean
   ESLint pass.
5. Prefer extending the existing design tokens (`bg-panel`,
   `text-muted-foreground`, `bg-accent-amber`, …) over introducing ad-hoc
   colors.

### Adding a new tool

```ts
// 1. add to lib/editor/constants.ts
{ id: "my-tool", label: "My Tool", shortcut: "k", group: "draw" }

// 2. add an icon in components/editor/icons.tsx and register in TOOL_ICONS

// 3. handle pointer events in CanvasStage.tsx onPointerDown/Move/Up
```

### Adding a destructive filter

```ts
// lib/editor/filter-engine.ts
export const DESTRUCTIVE_FILTERS = [
  …,
  {
    id: "my-filter",
    name: "My Filter",
    category: "stylize",
    paramLabel: "Strength",
    paramMin: 0, paramMax: 1, paramStep: 0.1, paramDefault: 0.5,
    run: (layer, param) => { /* mutate layer.ctx in place */ },
  },
];
```

It will appear in the Filters panel with no further wiring.

---

## 📄 License

MIT — see [`LICENSE`](./LICENSE). Free for personal and commercial use.

Pixel Forge is built and maintained by contributors who believe image editing
should be private, fast, and yours.
