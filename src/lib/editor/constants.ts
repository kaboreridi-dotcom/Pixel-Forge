/**
 * Pixel Forge — static constants: tools, blend modes, filter presets.
 */
import type {
  BlendMode,
  FilterPreset,
  LayerFilters,
  ToolId,
} from "./types";

export interface ToolDef {
  id: ToolId;
  label: string;
  /** Single-char shortcut. */
  shortcut: string;
  group: "navigate" | "select" | "draw" | "shape" | "text" | "fill";
}

export const TOOLS: ToolDef[] = [
  { id: "move", label: "Move", shortcut: "v", group: "navigate" },
  { id: "hand", label: "Pan", shortcut: "h", group: "navigate" },
  { id: "zoom", label: "Zoom", shortcut: "z", group: "navigate" },
  { id: "select-rect", label: "Rect Select", shortcut: "m", group: "select" },
  { id: "select-lasso", label: "Lasso", shortcut: "l", group: "select" },
  { id: "eyedropper", label: "Eyedropper", shortcut: "i", group: "select" },
  { id: "brush", label: "Brush", shortcut: "b", group: "draw" },
  { id: "eraser", label: "Eraser", shortcut: "e", group: "draw" },
  { id: "fill", label: "Fill", shortcut: "g", group: "fill" },
  { id: "shape-rect", label: "Rectangle", shortcut: "r", group: "shape" },
  { id: "shape-ellipse", label: "Ellipse", shortcut: "o", group: "shape" },
  { id: "shape-line", label: "Line", shortcut: "u", group: "shape" },
  { id: "text", label: "Text", shortcut: "t", group: "text" },
];

export const TOOL_MAP: Record<ToolId, ToolDef> = Object.fromEntries(
  TOOLS.map((t) => [t.id, t]),
) as Record<ToolId, ToolDef>;

export interface BlendModeDef {
  id: BlendMode;
  label: string;
}

export const BLEND_MODES: BlendModeDef[] = [
  { id: "source-over", label: "Normal" },
  { id: "multiply", label: "Multiply" },
  { id: "screen", label: "Screen" },
  { id: "overlay", label: "Overlay" },
  { id: "darken", label: "Darken" },
  { id: "lighten", label: "Lighten" },
  { id: "color-dodge", label: "Color Dodge" },
  { id: "color-burn", label: "Color Burn" },
  { id: "hard-light", label: "Hard Light" },
  { id: "soft-light", label: "Soft Light" },
  { id: "difference", label: "Difference" },
  { id: "exclusion", label: "Exclusion" },
  { id: "hue", label: "Hue" },
  { id: "saturation", label: "Saturation" },
  { id: "color", label: "Color" },
  { id: "luminosity", label: "Luminosity" },
];

export const BLEND_LABEL: Record<BlendMode, string> = Object.fromEntries(
  BLEND_MODES.map((b) => [b.id, b.label]),
) as Record<BlendMode, string>;

export const FONT_FAMILIES = [
  "JetBrains Mono, monospace",
  "ui-monospace, monospace",
  "Georgia, serif",
  "Times New Roman, serif",
  "Helvetica, Arial, sans-serif",
  "Impact, sans-serif",
  "Courier New, monospace",
];

/** Filter presets surfaced in the UI. */
export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: "gaussian-blur",
    name: "Gaussian Blur",
    category: "blur",
    apply: (f: LayerFilters) => ({ blur: Math.max(f.blur, 6) }),
  },
  {
    id: "strong-blur",
    name: "Heavy Blur",
    category: "blur",
    apply: () => ({ blur: 18 }),
  },
  {
    id: "sharpen",
    name: "Sharpen",
    category: "sharpen",
    apply: (f: LayerFilters) => ({
      contrast: Math.min(100, f.contrast + 25),
      blur: 0,
    }),
  },
  {
    id: "brighten",
    name: "Brighten",
    category: "color",
    apply: (f: LayerFilters) => ({ brightness: Math.min(100, f.brightness + 20) }),
  },
  {
    id: "darken",
    name: "Darken",
    category: "color",
    apply: (f: LayerFilters) => ({ brightness: Math.max(-100, f.brightness - 20) }),
  },
  {
    id: "punch",
    name: "Punch",
    category: "color",
    apply: (f: LayerFilters) => ({
      contrast: Math.min(100, f.contrast + 30),
      saturation: Math.min(100, f.saturation + 25),
    }),
  },
  {
    id: "grayscale",
    name: "Grayscale",
    category: "color",
    apply: () => ({ grayscale: 100 }),
  },
  {
    id: "sepia",
    name: "Sepia",
    category: "color",
    apply: () => ({ sepia: 80, saturation: -20 }),
  },
  {
    id: "invert",
    name: "Invert",
    category: "color",
    apply: () => ({ invert: 100 }),
  },
  {
    id: "hue-shift",
    name: "Hue Shift",
    category: "color",
    apply: (f: LayerFilters) => ({ hue: (f.hue + 120) % 360 - 180 }),
  },
  {
    id: "cool",
    name: "Cool Tone",
    category: "color",
    apply: (f: LayerFilters) => ({ hue: Math.max(-180, f.hue - 12) }),
  },
  {
    id: "warm",
    name: "Warm Tone",
    category: "color",
    apply: (f: LayerFilters) => ({ hue: Math.min(180, f.hue + 12) }),
  },
];

export const MIN_DOC_DIMENSION = 8;
export const MAX_DOC_DIMENSION = 8192;
export const MAX_HISTORY = 60;
