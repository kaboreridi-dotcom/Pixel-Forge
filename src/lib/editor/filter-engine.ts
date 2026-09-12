/**
 * Pixel Forge — Filter Engine.
 *
 * Non-destructive per-layer *adjustments* (brightness/contrast/etc.)
 * are applied live by the CanvasEngine via the CSS `filter` property
 * (see canvas-engine.ts). This module provides *destructive* pixel
 * operations that bake an effect into a layer's canvas, used by
 * Filters menu actions like "Sharpen", "Posterize", "Edge Detect",
 * "Add Noise".
 *
 * All functions operate on the layer's own canvas in place.
 */
import type { Layer } from "./types";

type Ctx = CanvasRenderingContext2D;

function getFullImageData(ctx: Ctx, w: number, h: number): ImageData {
  return ctx.getImageData(0, 0, w, h);
}

function putFullImageData(ctx: Ctx, data: ImageData): void {
  ctx.putImageData(data, 0, 0);
}

/** Unsharp-mask style sharpen via convolution. */
export function sharpen(layer: Layer, amount = 0.8): void {
  const { ctx, canvas } = layer;
  const { width: w, height: h } = canvas;
  const src = getFullImageData(ctx, w, h).data;
  const out = new Uint8ClampedArray(src);
  // kernel: center weight 1 + 4*amount, neighbors -amount
  const k = amount;
  const center = 1 + 4 * k;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const v =
          src[i + c] * center -
          src[i - 4 + c] * k -
          src[i + 4 + c] * k -
          src[i - w * 4 + c] * k -
          src[i + w * 4 + c] * k;
        out[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
    }
  }
  const img = new ImageData(out, w, h);
  putFullImageData(ctx, img);
}

/** Posterize to N levels per channel. */
export function posterize(layer: Layer, levels = 6): void {
  const { ctx, canvas } = layer;
  const { width: w, height: h } = canvas;
  const img = getFullImageData(ctx, w, h);
  const data = img.data;
  const step = 255 / (levels - 1);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i] / step) * step;
    data[i + 1] = Math.round(data[i + 1] / step) * step;
    data[i + 2] = Math.round(data[i + 2] / step) * step;
  }
  putFullImageData(ctx, img);
}

/** Emboss — directional convolution producing a bas-relief look. */
export function emboss(layer: Layer): void {
  const { ctx, canvas } = layer;
  const { width: w, height: h } = canvas;
  const src = getFullImageData(ctx, w, h).data;
  const out = new Uint8ClampedArray(src);
  // emboss kernel
  const kernel = [-2, -1, 0, -1, 1, 1, 0, 1, 2];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let ki = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * w + (x + kx)) * 4 + c;
            sum += src[idx] * kernel[ki++];
          }
        }
        const v = sum + 128;
        out[(y * w + x) * 4 + c] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
    }
  }
  putFullImageData(ctx, new ImageData(out, w, h));
}

/** Edge detection (Laplacian). Produces black bg + bright edges. */
export function findEdges(layer: Layer): void {
  const { ctx, canvas } = layer;
  const { width: w, height: h } = canvas;
  const src = getFullImageData(ctx, w, h).data;
  const out = new Uint8ClampedArray(src.length);
  const kernel = [-1, -1, -1, -1, 8, -1, -1, -1, -1];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let ki = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * w + (x + kx)) * 4 + c;
            sum += src[idx] * kernel[ki++];
          }
        }
        const v = sum;
        out[(y * w + x) * 4 + c] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
      out[(y * w + x) * 4 + 3] = 255;
    }
  }
  putFullImageData(ctx, new ImageData(out, w, h));
}

/** Add monochrome noise (0..1 strength). */
export function addNoise(layer: Layer, strength = 0.15): void {
  const { ctx, canvas } = layer;
  const { width: w, height: h } = canvas;
  const img = getFullImageData(ctx, w, h);
  const data = img.data;
  const amp = strength * 255;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 2 * amp;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
  putFullImageData(ctx, img);
}

/** Pixelate (mosaic) with a given block size. */
export function pixelate(layer: Layer, blockSize = 8): void {
  const { ctx, canvas } = layer;
  const { width: w, height: h } = canvas;
  const small = document.createElement("canvas");
  small.width = Math.max(1, Math.floor(w / blockSize));
  small.height = Math.max(1, Math.floor(h / blockSize));
  const sctx = small.getContext("2d")!;
  sctx.imageSmoothingEnabled = true;
  sctx.drawImage(canvas, 0, 0, small.width, small.height);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(small, 0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
}

/** Threshold (1-bit monochrome). */
export function threshold(layer: Layer, level = 128): void {
  const { ctx, canvas } = layer;
  const { width: w, height: h } = canvas;
  const img = getFullImageData(ctx, w, h);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const v = lum >= level ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = v;
  }
  putFullImageData(ctx, img);
}

/** Vignette: darken edges. */
export function vignette(layer: Layer, strength = 0.7): void {
  const { ctx, canvas } = layer;
  const { width: w, height: h } = canvas;
  const grad = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.3,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.75,
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export interface DestructiveFilterDef {
  id: string;
  name: string;
  category: "stylize" | "detail";
  paramLabel?: string;
  paramMin?: number;
  paramMax?: number;
  paramStep?: number;
  paramDefault?: number;
  run: (layer: Layer, param: number) => void;
}

export const DESTRUCTIVE_FILTERS: DestructiveFilterDef[] = [
  {
    id: "sharpen",
    name: "Sharpen",
    category: "detail",
    paramLabel: "Amount",
    paramMin: 0.1,
    paramMax: 2,
    paramStep: 0.1,
    paramDefault: 0.8,
    run: (l, p) => sharpen(l, p),
  },
  {
    id: "posterize",
    name: "Posterize",
    category: "stylize",
    paramLabel: "Levels",
    paramMin: 2,
    paramMax: 16,
    paramStep: 1,
    paramDefault: 6,
    run: (l, p) => posterize(l, Math.round(p)),
  },
  {
    id: "emboss",
    name: "Emboss",
    category: "stylize",
    run: (l) => emboss(l),
  },
  {
    id: "edges",
    name: "Find Edges",
    category: "stylize",
    run: (l) => findEdges(l),
  },
  {
    id: "noise",
    name: "Add Noise",
    category: "stylize",
    paramLabel: "Strength",
    paramMin: 0.02,
    paramMax: 0.6,
    paramStep: 0.02,
    paramDefault: 0.15,
    run: (l, p) => addNoise(l, p),
  },
  {
    id: "pixelate",
    name: "Pixelate",
    category: "stylize",
    paramLabel: "Block",
    paramMin: 2,
    paramMax: 48,
    paramStep: 1,
    paramDefault: 8,
    run: (l, p) => pixelate(l, Math.round(p)),
  },
  {
    id: "threshold",
    name: "Threshold",
    category: "stylize",
    paramLabel: "Level",
    paramMin: 0,
    paramMax: 255,
    paramStep: 1,
    paramDefault: 128,
    run: (l, p) => threshold(l, Math.round(p)),
  },
  {
    id: "vignette",
    name: "Vignette",
    category: "stylize",
    paramLabel: "Strength",
    paramMin: 0.1,
    paramMax: 1,
    paramStep: 0.05,
    paramDefault: 0.7,
    run: (l, p) => vignette(l, p),
  },
];
