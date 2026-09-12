/**
 * Pixel Forge — image & color utilities.
 *
 * Pure helpers used by the canvas engine, filter engine, and tools.
 * Nothing here touches React or the store — keeping them pure makes
 * them trivial to test and reuse.
 */
import type { RGBA } from "@/lib/editor/types";

/** Clamp to 0..255 and round to int. */
export function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** "#rrggbb" + alpha(0..1) -> RGBA(0..1). */
export function hexToRGBA(hex: string, alpha = 1): RGBA {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return { r, g, b, a: alpha };
}

/** RGBA(0..1) -> "#rrggbb". */
export function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) =>
    clamp8(Math.round(v * 255)).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** RGBA(0..1) -> "rgba(r,g,b,a)". */
export function rgbaToCss({ r, g, b, a }: RGBA): string {
  return `rgba(${clamp8(r * 255)}, ${clamp8(g * 255)}, ${clamp8(b * 255)}, ${a.toFixed(3)})`;
}

/** Read a single pixel (as 0..1 RGBA) from an ImageData at (x,y). */
export function samplePixel(data: ImageData, x: number, y: number): RGBA {
  const i = (y * data.width + x) * 4;
  return {
    r: data.data[i] / 255,
    g: data.data[i + 1] / 255,
    b: data.data[i + 2] / 255,
    a: data.data[i + 3] / 255,
  };
}

/** Create a new off-screen canvas + context for a layer. */
export function makeLayerCanvas(
  width: number,
  height: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", {
    willReadFrequently: true,
  }) as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { canvas, ctx };
}

/** Promise-based image load. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/** Read a File into an HTMLImageElement. */
export async function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = await readFileAsDataURL(file);
  return loadImage(url);
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/** Format bytes as a human-readable string. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** Distance between two points. */
export function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Round to N decimals. */
export function round(v: number, decimals = 0): number {
  const m = 10 ** decimals;
  return Math.round(v * m) / m;
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/**
 * Box-blur an ImageData in place using a fast separable box filter.
 * Good enough for layer previews / non-destructive soft blur.
 */
export function boxBlur(src: ImageData, radius: number): ImageData {
  if (radius < 1) return src;
  const { width: w, height: h, data } = src;
  const tmp = new Uint8ClampedArray(data.length);
  const r = Math.round(radius);
  // horizontal
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let R = 0,
        G = 0,
        B = 0,
        A = 0,
        n = 0;
      for (let k = -r; k <= r; k++) {
        const xx = x + k;
        if (xx < 0 || xx >= w) continue;
        const i = (y * w + xx) * 4;
        R += data[i];
        G += data[i + 1];
        B += data[i + 2];
        A += data[i + 3];
        n++;
      }
      const o = (y * w + x) * 4;
      tmp[o] = R / n;
      tmp[o + 1] = G / n;
      tmp[o + 2] = B / n;
      tmp[o + 3] = A / n;
    }
  }
  // vertical
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let R = 0,
        G = 0,
        B = 0,
        A = 0,
        n = 0;
      for (let k = -r; k <= r; k++) {
        const yy = y + k;
        if (yy < 0 || yy >= h) continue;
        const i = (yy * w + x) * 4;
        R += tmp[i];
        G += tmp[i + 1];
        B += tmp[i + 2];
        A += tmp[i + 3];
        n++;
      }
      const o = (y * w + x) * 4;
      data[o] = R / n;
      data[o + 1] = G / n;
      data[o + 2] = B / n;
      data[o + 3] = A / n;
    }
  }
  return src;
}

/** rgb -> hsl (all 0..1) */
export function rgbToHsl(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h, s, l];
}

/** hsl (0..1) -> rgb (0..1) */
export function hslToRgb(
  h: number,
  s: number,
  l: number,
): [number, number, number] {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}
