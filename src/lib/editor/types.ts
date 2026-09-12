/**
 * Pixel Forge — Core type definitions.
 *
 * The editor is organized around an immutable-ish document model:
 * a `Document` holds a stack of `Layer`s. Each layer owns its own
 * `ImageData`-backed pixel buffer plus metadata (opacity, blend mode,
 * visibility, locks). All mutating operations flow through the Zustand
 * store, which snapshots state into the history manager before each
 * commit so undo/redo is always consistent.
 */

/** Tool identifiers. Keep these stable — they are persisted in shortcuts. */
export type ToolId =
  | "move"
  | "select-rect"
  | "select-lasso"
  | "brush"
  | "eraser"
  | "fill"
  | "eyedropper"
  | "text"
  | "shape-rect"
  | "shape-ellipse"
  | "shape-line"
  | "zoom"
  | "hand";

export type BlendMode =
  | "source-over"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity";

export interface LayerFilters {
  brightness: number; // -100..100
  contrast: number; // -100..100
  saturation: number; // -100..100
  hue: number; // -180..180
  blur: number; // 0..50 px
  invert: number; // 0..100
  grayscale: number; // 0..100
  sepia: number; // 0..100
}

export const DEFAULT_LAYER_FILTERS: LayerFilters = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  blur: 0,
  invert: 0,
  grayscale: 0,
  sepia: 0,
};

/**
 * A single layer.
 *
 * `canvas` is an off-screen HTMLCanvasElement holding the raw pixels.
 * It is NOT serializable — that is why layers are split between the
 * runtime store (with canvas) and serializable snapshots (without).
 */
export interface Layer {
  id: string;
  name: string;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0..1
  blendMode: BlendMode;
  filters: LayerFilters;
  /** Optional mask canvas (same dimensions). White = visible. */
  maskCanvas: HTMLCanvasElement | null;
}

/** Serializable copy of a layer for history snapshots. */
export interface LayerSnapshot {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  filters: LayerFilters;
  /** PNG data URLs for pixels + mask. */
  pixels: string;
  mask: string | null;
}

export interface DocumentModel {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: Layer[];
  activeLayerId: string | null;
}

export interface DocumentSnapshot {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: LayerSnapshot[];
  activeLayerId: string | null;
}

/** Brush tip configuration. */
export interface BrushSettings {
  size: number; // px
  opacity: number; // 0..1
  hardness: number; // 0..1  (0 = soft, 1 = hard)
  spacing: number; // 0.05..2  (fraction of size)
  flow: number; // 0..1
  smoothing: number; // 0..1  stroke point smoothing
}

export const DEFAULT_BRUSH: BrushSettings = {
  size: 24,
  opacity: 1,
  hardness: 0.85,
  spacing: 0.15,
  flow: 1,
  smoothing: 0.3,
};

export type ShapeFillMode = "stroke" | "fill" | "both";

export interface ShapeSettings {
  strokeWidth: number;
  fillMode: ShapeFillMode;
}

export const DEFAULT_SHAPE: ShapeSettings = {
  strokeWidth: 2,
  fillMode: "stroke",
};

export interface TextSettings {
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  align: CanvasTextAlign;
}

export const DEFAULT_TEXT: TextSettings = {
  fontSize: 48,
  fontFamily: "JetBrains Mono, monospace",
  bold: false,
  italic: false,
  align: "left",
};

export interface FillSettings {
  tolerance: number; // 0..100 for magic-ish fill
  contiguous: boolean;
}

export const DEFAULT_FILL: FillSettings = {
  tolerance: 16,
  contiguous: true,
};

/** A selection region. `rect` is the fast path; `mask` is per-pixel. */
export interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Uint8Array (width*height) — 255 inside selection, 0 outside. null = full rect. */
  mask: Uint8Array | null;
}

export interface ViewTransform {
  zoom: number; // 1 = 100%
  panX: number;
  panY: number;
}

export const DEFAULT_VIEW: ViewTransform = {
  zoom: 1,
  panX: 0,
  panY: 0,
};

/** Color in normalized RGB (0..1) plus alpha. */
export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type ExportFormat = "png" | "jpeg" | "webp";

export interface ExportOptions {
  format: ExportFormat;
  quality: number; // 0..1 for jpeg/webp
  scale: number; // 1 = 1x
  transparent: boolean; // png/webp only
  flatten: boolean;
}

/** History entry. */
export interface HistoryEntry {
  label: string;
  snapshot: DocumentSnapshot;
  /** Selection at the time of the snapshot, if any. */
  selection: Selection | null;
}

/** A live pointer sample used while drawing strokes. */
export interface PointerSample {
  x: number; // document coords
  y: number;
  pressure: number; // 0..1
  t: number; // timestamp
}

/** Filter recipe presets shown in the UI. */
export interface FilterPreset {
  id: string;
  name: string;
  apply: (filters: LayerFilters) => Partial<LayerFilters>;
  category: "blur" | "sharpen" | "stylize" | "color";
}
