/**
 * Pixel Forge — Editor Store (Zustand).
 *
 * Single source of truth for the editor. Slices are kept in one
 * store for simplicity (the app is focused enough that splitting
 * would add indirection without real benefit), but the actions are
 * grouped by domain for readability.
 *
 * Non-serializable canvas elements live inside `doc.layers[].canvas`.
 * Persistence to localStorage is intentionally NOT enabled — the
 * editor is session-scoped and offline-first; saving work is done
 * via explicit Export.
 */
"use client";

import { create } from "zustand";
import {
  createHistory,
  type HistoryState,
  initHistory,
  pushHistory,
  canRedo,
  canUndo,
  restoreAt,
} from "@/lib/editor/history-manager";
import {
  createLayer,
  deleteLayer,
  duplicateLayer,
  flattenDocument,
  getActiveLayer,
  mergeLayerDown,
  moveLayer,
  reorderLayer,
  restoreSnapshot,
  setLayerFilters as setLayerFiltersOp,
  snapshotDocument,
} from "@/lib/editor/layer-manager";
import {
  DEFAULT_BRUSH,
  DEFAULT_FILL,
  DEFAULT_SHAPE,
  DEFAULT_TEXT,
  DEFAULT_VIEW,
  type BrushSettings,
  type DocumentModel,
  type ExportOptions,
  type FillSettings,
  type LayerFilters,
  type Selection,
  type ShapeSettings,
  type TextSettings,
  type ToolId,
  type ViewTransform,
} from "@/lib/editor/types";

/** A monotonically-increasing render token. CanvasStage subscribes to it. */
let renderToken = 0;

export interface EditorState {
  /* ---- document ---- */
  doc: DocumentModel | null;
  docName: string;

  /* ---- ui ---- */
  tool: ToolId;
  primaryColor: string; // hex
  secondaryColor: string; // hex
  brush: BrushSettings;
  shape: ShapeSettings;
  text: TextSettings;
  fill: FillSettings;
  view: ViewTransform;

  /* ---- selection ---- */
  selection: Selection | null;

  /* ---- history ---- */
  history: HistoryState;
  pendingLabel: string | null; // next push label, set before commit

  /* ---- render ---- */
  renderToken: number;

  /* ---- panels ---- */
  rightPanel: "layers" | "adjust" | "filters";

  /* ---- transient ---- */
  cursorDoc: { x: number; y: number } | null;
  exporting: boolean;

  /* ---- actions: document ---- */
  newDocument: (width: number, height: number, bg?: string) => void;
  importImage: (img: HTMLImageElement, name?: string) => void;
  setDocName: (name: string) => void;
  resizeDocument: (w: number, h: number) => void;

  /* ---- actions: layers ---- */
  addLayer: (name?: string) => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  mergeDown: (id: string) => void;
  flatten: () => void;
  setActiveLayer: (id: string) => void;
  moveLayer: (id: string, dir: "up" | "down") => void;
  reorderLayer: (id: string, toIndex: number) => void;
  renameLayer: (id: string, name: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setLayerBlend: (id: string, mode: string) => void;
  toggleLayerVisible: (id: string) => void;
  toggleLayerLocked: (id: string) => void;
  setLayerFilters: (id: string, filters: LayerFilters) => void;
  applyFilterPreset: (id: string, preset: (f: LayerFilters) => Partial<LayerFilters>) => void;

  /* ---- actions: tool / settings ---- */
  setTool: (tool: ToolId) => void;
  setPrimaryColor: (hex: string) => void;
  setSecondaryColor: (hex: string) => void;
  swapColors: () => void;
  resetColors: () => void;
  setBrush: (patch: Partial<BrushSettings>) => void;
  setShape: (patch: Partial<ShapeSettings>) => void;
  setText: (patch: Partial<TextSettings>) => void;
  setFill: (patch: Partial<FillSettings>) => void;

  /* ---- actions: view ---- */
  setView: (patch: Partial<ViewTransform>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToScreen: (stageW: number, stageH: number) => void;
  actualSize: () => void;

  /* ---- actions: selection ---- */
  setSelection: (sel: Selection | null) => void;
  clearSelection: () => void;
  selectAll: () => void;

  /* ---- actions: history ---- */
  beginHistory: (label: string) => void;
  commit: () => void; // pushes current doc into history with pendingLabel
  undo: () => Promise<void>;
  redo: () => Promise<void>;

  /* ---- actions: render ---- */
  requestRender: () => void;

  /* ---- actions: panels ---- */
  setRightPanel: (panel: "layers" | "adjust" | "filters") => void;

  /* ---- actions: misc ---- */
  setCursorDoc: (pt: { x: number; y: number } | null) => void;
  setExporting: (v: boolean) => void;
  exportImage: (options: ExportOptions) => Promise<Blob | null>;
}

function freshDoc(width: number, height: number, bg?: string): DocumentModel {
  const bgLayer = createLayer(width, height, { name: "Background" });
  if (bg) {
    bgLayer.ctx.fillStyle = bg;
    bgLayer.ctx.fillRect(0, 0, width, height);
  }
  return {
    id: Math.random().toString(36).slice(2),
    name: "Untitled",
    width,
    height,
    layers: [bgLayer],
    activeLayerId: bgLayer.id,
  };
}

export const useEditor = create<EditorState>((set, get) => ({
  doc: null,
  docName: "Untitled",

  tool: "brush",
  primaryColor: "#e8b14a",
  secondaryColor: "#1c1c22",
  brush: { ...DEFAULT_BRUSH },
  shape: { ...DEFAULT_SHAPE },
  text: { ...DEFAULT_TEXT },
  fill: { ...DEFAULT_FILL },
  view: { ...DEFAULT_VIEW },

  selection: null,

  history: createHistory(),
  pendingLabel: null,

  renderToken: 0,

  rightPanel: "layers",

  cursorDoc: null,
  exporting: false,

  /* ---------------- document ---------------- */
  newDocument: (width, height, bg = "#ffffff") => {
    const doc = freshDoc(width, height, bg);
    const history = initHistory(createHistory(), doc, null);
    set({
      doc,
      docName: "Untitled",
      history,
      selection: null,
      view: { ...DEFAULT_VIEW },
    });
    get().requestRender();
  },

  importImage: (img, name) => {
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const layer = createLayer(width, height, { name: name ?? "Imported" });
    layer.ctx.drawImage(img, 0, 0);
    const doc: DocumentModel = {
      id: Math.random().toString(36).slice(2),
      name: name ?? "Imported",
      width,
      height,
      layers: [layer],
      activeLayerId: layer.id,
    };
    const history = initHistory(createHistory(), doc, null);
    set({
      doc,
      docName: doc.name,
      history,
      selection: null,
      view: { ...DEFAULT_VIEW },
    });
    // fit happens via CanvasStage effect using stage size
    get().requestRender();
  },

  setDocName: (name) => set({ docName: name }),

  resizeDocument: (w, h) => {
    const { doc } = get();
    if (!doc) return;
    // resize each layer's canvas (nearest-neighbor)
    for (const layer of doc.layers) {
      const tmp = document.createElement("canvas");
      tmp.width = layer.canvas.width;
      tmp.height = layer.canvas.height;
      tmp.getContext("2d")!.drawImage(layer.canvas, 0, 0);
      layer.canvas.width = w;
      layer.canvas.height = h;
      layer.ctx.imageSmoothingEnabled = true;
      layer.ctx.drawImage(tmp, 0, 0, w, h);
    }
    doc.width = w;
    doc.height = h;
    get().beginHistory("Resize Document");
    get().commit();
    get().requestRender();
  },

  /* ---------------- layers ---------------- */
  addLayer: (name) => {
    const { doc } = get();
    if (!doc) return;
    const layer = createLayer(doc.width, doc.height, {
      name: name ?? `Layer ${doc.layers.length + 1}`,
    });
    doc.layers.push(layer);
    doc.activeLayerId = layer.id;
    get().beginHistory("Add Layer");
    get().commit();
    get().requestRender();
  },

  removeLayer: (id) => {
    const { doc } = get();
    if (!doc || doc.layers.length <= 1) return;
    deleteLayer(doc, id);
    get().beginHistory("Delete Layer");
    get().commit();
    get().requestRender();
  },

  duplicateLayer: (id) => {
    const { doc } = get();
    if (!doc) return;
    duplicateLayer(doc, id);
    get().beginHistory("Duplicate Layer");
    get().commit();
    get().requestRender();
  },

  mergeDown: (id) => {
    const { doc } = get();
    if (!doc) return;
    mergeLayerDown(doc, id);
    get().beginHistory("Merge Down");
    get().commit();
    get().requestRender();
  },

  flatten: () => {
    const { doc } = get();
    if (!doc) return;
    const flat = flattenDocument(doc);
    flat.name = doc.name;
    doc.layers = [flat];
    doc.activeLayerId = flat.id;
    get().beginHistory("Flatten");
    get().commit();
    get().requestRender();
  },

  setActiveLayer: (id) => {
    const { doc } = get();
    if (!doc) return;
    doc.activeLayerId = id;
    set({}); // trigger update
    get().requestRender();
  },

  moveLayer: (id, dir) => {
    const { doc } = get();
    if (!doc) return;
    moveLayer(doc, id, dir);
    get().beginHistory("Reorder Layer");
    get().commit();
    get().requestRender();
  },

  reorderLayer: (id, toIndex) => {
    const { doc } = get();
    if (!doc) return;
    reorderLayer(doc, id, toIndex);
    get().beginHistory("Reorder Layer");
    get().commit();
    get().requestRender();
  },

  renameLayer: (id, name) => {
    const { doc } = get();
    if (!doc) return;
    const l = doc.layers.find((x) => x.id === id);
    if (l) l.name = name;
    get().beginHistory("Rename Layer");
    get().commit();
    get().requestRender();
  },

  setLayerOpacity: (id, opacity) => {
    const { doc } = get();
    if (!doc) return;
    const l = doc.layers.find((x) => x.id === id);
    if (l) l.opacity = opacity;
    get().requestRender();
  },

  setLayerBlend: (id, mode) => {
    const { doc } = get();
    if (!doc) return;
    const l = doc.layers.find((x) => x.id === id);
    if (l) l.blendMode = mode as never;
    get().beginHistory("Change Blend");
    get().commit();
    get().requestRender();
  },

  toggleLayerVisible: (id) => {
    const { doc } = get();
    if (!doc) return;
    const l = doc.layers.find((x) => x.id === id);
    if (l) l.visible = !l.visible;
    get().beginHistory("Toggle Visibility");
    get().commit();
    get().requestRender();
  },

  toggleLayerLocked: (id) => {
    const { doc } = get();
    if (!doc) return;
    const l = doc.layers.find((x) => x.id === id);
    if (l) l.locked = !l.locked;
    get().beginHistory("Toggle Lock");
    get().commit();
    get().requestRender();
  },

  setLayerFilters: (id, filters) => {
    const { doc } = get();
    if (!doc) return;
    setLayerFiltersOp(doc, id, filters);
    get().requestRender();
  },

  applyFilterPreset: (id, preset) => {
    const { doc } = get();
    if (!doc) return;
    const l = doc.layers.find((x) => x.id === id);
    if (!l) return;
    l.filters = { ...l.filters, ...preset(l.filters) };
    get().commit();
    get().requestRender();
  },

  /* ---------------- tool / settings ---------------- */
  setTool: (tool) => set({ tool }),

  setPrimaryColor: (hex) => set({ primaryColor: hex }),
  setSecondaryColor: (hex) => set({ secondaryColor: hex }),
  swapColors: () =>
    set((s) => ({
      primaryColor: s.secondaryColor,
      secondaryColor: s.primaryColor,
    })),
  resetColors: () =>
    set({ primaryColor: "#e8b14a", secondaryColor: "#1c1c22" }),

  setBrush: (patch) => set((s) => ({ brush: { ...s.brush, ...patch } })),
  setShape: (patch) => set((s) => ({ shape: { ...s.shape, ...patch } })),
  setText: (patch) => set((s) => ({ text: { ...s.text, ...patch } })),
  setFill: (patch) => set((s) => ({ fill: { ...s.fill, ...patch } })),

  /* ---------------- view ---------------- */
  setView: (patch) => set((s) => ({ view: { ...s.view, ...patch } })),
  zoomIn: () => set((s) => ({ view: { ...s.view, zoom: Math.min(32, s.view.zoom * 1.25) } })),
  zoomOut: () => set((s) => ({ view: { ...s.view, zoom: Math.max(0.02, s.view.zoom / 1.25) } })),
  fitToScreen: (stageW, stageH) => {
    const { doc } = get();
    if (!doc) return;
    const pad = 64;
    const z = Math.min(
      (stageW - pad) / doc.width,
      (stageH - pad) / doc.height,
    );
    const zoom = Math.max(0.02, Math.min(8, z));
    set({
      view: {
        zoom,
        panX: (stageW - doc.width * zoom) / 2,
        panY: (stageH - doc.height * zoom) / 2,
      },
    });
  },
  actualSize: () => {
    const { doc, view } = get();
    if (!doc) return;
    set({
      view: {
        zoom: 1,
        panX: (typeof window !== "undefined" ? window.innerWidth : 800) / 2 - doc.width / 2,
        panY: view.panY,
      },
    });
  },

  /* ---------------- selection ---------------- */
  setSelection: (sel) => set({ selection: sel }),
  clearSelection: () => set({ selection: null }),
  selectAll: () => {
    const { doc } = get();
    if (!doc) return;
    set({
      selection: {
        x: 0,
        y: 0,
        width: doc.width,
        height: doc.height,
        mask: null,
      },
    });
  },

  /* ---------------- history ---------------- */
  beginHistory: (label) => set({ pendingLabel: label }),

  commit: () => {
    const { doc, history, selection, pendingLabel } = get();
    if (!doc || !pendingLabel) {
      set({ pendingLabel: null });
      return;
    }
    const next = pushHistory(history, doc, pendingLabel, selection);
    set({ history: next, pendingLabel: null });
  },

  undo: async () => {
    const { history } = get();
    if (!canUndo(history)) return;
    const target = history.cursor - 1;
    const restored = await restoreAt(history, target);
    if (!restored) return;
    set({
      doc: restored.doc,
      selection: restored.selection,
      history: { ...history, cursor: target },
    });
    get().requestRender();
  },

  redo: async () => {
    const { history } = get();
    if (!canRedo(history)) return;
    const target = history.cursor + 1;
    const restored = await restoreAt(history, target);
    if (!restored) return;
    set({
      doc: restored.doc,
      selection: restored.selection,
      history: { ...history, cursor: target },
    });
    get().requestRender();
  },

  /* ---------------- render ---------------- */
  requestRender: () => set({ renderToken: ++renderToken }),

  /* ---------------- panels ---------------- */
  setRightPanel: (panel) => set({ rightPanel: panel }),

  /* ---------------- misc ---------------- */
  setCursorDoc: (pt) => set({ cursorDoc: pt }),
  setExporting: (v) => set({ exporting: v }),

  exportImage: async (options) => {
    const { doc } = get();
    if (!doc) return null;
    get().setExporting(true);
    try {
      const w = Math.round(doc.width * options.scale);
      const h = Math.round(doc.height * options.scale);
      const out = document.createElement("canvas");
      out.width = w;
      out.height = h;
      const ctx = out.getContext("2d")!;
      if (!options.transparent || options.format === "jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
      }
      ctx.scale(options.scale, options.scale);
      // composite layers
      for (const layer of doc.layers) {
        if (!layer.visible) continue;
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
        const f = layer.filters;
        const parts: string[] = [];
        if (f.brightness) parts.push(`brightness(${1 + f.brightness / 100})`);
        if (f.contrast) parts.push(`contrast(${1 + f.contrast / 100})`);
        if (f.saturation) parts.push(`saturate(${1 + f.saturation / 100})`);
        if (f.hue) parts.push(`hue-rotate(${f.hue}deg)`);
        if (f.blur > 0) parts.push(`blur(${f.blur}px)`);
        if (f.invert) parts.push(`invert(${f.invert / 100})`);
        if (f.grayscale) parts.push(`grayscale(${f.grayscale / 100})`);
        if (f.sepia) parts.push(`sepia(${f.sepia / 100})`);
        if (parts.length) ctx.filter = parts.join(" ");
        ctx.drawImage(layer.canvas, 0, 0);
        ctx.restore();
      }
      const mime =
        options.format === "png"
          ? "image/png"
          : options.format === "jpeg"
            ? "image/jpeg"
            : "image/webp";
      const blob: Blob = await new Promise((resolve, reject) => {
        out.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
          mime,
          options.format === "png" ? undefined : options.quality,
        );
      });
      return blob;
    } finally {
      get().setExporting(false);
    }
  },
}));

/** Convenience selector for the active layer. */
export function selectActiveLayer(state: EditorState) {
  return state.doc ? getActiveLayer(state.doc) : null;
}

/** Re-export for tests/components that want snapshot helpers. */
export { snapshotDocument, restoreSnapshot };
