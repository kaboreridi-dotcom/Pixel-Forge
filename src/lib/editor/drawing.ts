/**
 * Pixel Forge — drawing helpers.
 *
 * Pure(ish) functions used by the CanvasStage pointer handlers:
 * soft brush stamping, stroke interpolation with spacing, flood fill,
 * shape primitives, selection marching ants.
 *
 * None of these touch React or the store. They operate on a
 * CanvasRenderingContext2D + the active layer.
 */
import type {
  BrushSettings,
  PointerSample,
  RGBA,
} from "@/lib/editor/types";
import { clamp8, hexToRGBA, lerp } from "@/lib/utils/image-utils";

/* ----------------------------- brush ----------------------------- */

const stampCache = new Map<string, HTMLCanvasElement>();

/**
 * Build (or fetch from cache) a brush stamp canvas for the given
 * size + hardness + color. The stamp is a radial-gradient alpha disc.
 * Cached by a key so we don't re-render it on every dab.
 */
function getStamp(
  size: number,
  hardness: number,
  color: string,
): HTMLCanvasElement {
  const key = `${size.toFixed(1)}|${hardness.toFixed(2)}|${color}`;
  const cached = stampCache.get(key);
  if (cached) return cached;
  const s = Math.max(1, Math.ceil(size));
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d")!;
  const cx = s / 2;
  const r = s / 2;
  const inner = clamp8(hardness * 255) / 255 * r; // hard core radius
  const grad = ctx.createRadialGradient(cx, cx, inner, cx, cx, r);
  grad.addColorStop(0, color);
  grad.addColorStop(1, hexToRgbaCss(color, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cx, r, 0, Math.PI * 2);
  ctx.fill();
  stampCache.set(key, canvas);
  // keep cache from growing unbounded
  if (stampCache.size > 256) {
    const firstKey = stampCache.keys().next().value;
    if (firstKey) stampCache.delete(firstKey);
  }
  return canvas;
}

function hexToRgbaCss(hex: string, alpha: number): string {
  const { r, g, b } = hexToRGBA(hex);
  return `rgba(${clamp8(r * 255)}, ${clamp8(g * 255)}, ${clamp8(b * 255)}, ${alpha})`;
}

/** Stamp a single dab at (x,y) onto ctx. */
export function stampBrush(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  brush: BrushSettings,
  color: string,
  erase = false,
): void {
  const stamp = getStamp(brush.size, brush.hardness, color);
  ctx.save();
  ctx.globalAlpha = brush.opacity * brush.flow;
  ctx.globalCompositeOperation = erase ? "destination-out" : "source-over";
  ctx.drawImage(stamp, x - stamp.width / 2, y - stamp.height / 2);
  ctx.restore();
}

/**
 * Interpolate between two samples, stamping dabs spaced at
 * `brush.spacing * brush.size` pixels apart. Returns the number
 * of dabs drawn.
 */
export function strokeSegment(
  ctx: CanvasRenderingContext2D,
  from: PointerSample,
  to: PointerSample,
  brush: BrushSettings,
  color: string,
  erase = false,
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy);
  const step = Math.max(0.5, brush.spacing * brush.size);
  const steps = Math.max(1, Math.floor(d / step));
  let count = 0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    stampBrush(ctx, lerp(from.x, to.x, t), lerp(from.y, to.y, t), brush, color, erase);
    count++;
  }
  return count;
}

/** Draw a smooth dab line through samples (catmull-rom-ish via lerp). */
export function strokeThrough(
  ctx: CanvasRenderingContext2D,
  samples: PointerSample[],
  brush: BrushSettings,
  color: string,
  erase = false,
): void {
  if (samples.length === 0) return;
  if (samples.length === 1) {
    stampBrush(ctx, samples[0].x, samples[0].y, brush, color, erase);
    return;
  }
  for (let i = 1; i < samples.length; i++) {
    strokeSegment(ctx, samples[i - 1], samples[i], brush, color, erase);
  }
}

/* --------------------------- flood fill --------------------------- */

/**
 * Flood fill the active layer starting at (x,y) with `color`.
 * Tolerance is 0..100. If `mask` (Uint8Array length w*h) is provided,
 * only pixels where mask===255 are filled (used for selection-constrained fills).
 */
export function floodFill(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  x: number,
  y: number,
  color: string,
  tolerance: number,
  mask?: Uint8Array | null,
): boolean {
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  const img = ctx.getImageData(0, 0, width, height);
  const data = img.data;
  const sx = x | 0;
  const sy = y | 0;
  const startIdx = (sy * width + sx) * 4;
  const sr = data[startIdx];
  const sg = data[startIdx + 1];
  const sb = data[startIdx + 2];
  const sa = data[startIdx + 3];

  const target = hexToRGBA(color);
  const tr = clamp8(target.r * 255);
  const tg = clamp8(target.g * 255);
  const tb = clamp8(target.b * 255);
  const ta = clamp8(target.a * 255);

  if (sr === tr && sg === tg && sb === tb && sa === ta) return false;

  const tol = (tolerance / 100) * 255;
  const tol2 = tol * tol;
  const visited = new Uint8Array(width * height);

  const stack: number[] = [sx, sy];
  let filled = 0;
  while (stack.length) {
    const cy = stack.pop()!;
    const cx = stack.pop()!;
    if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue;
    const pi = cy * width + cx;
    if (visited[pi]) continue;
    if (mask && mask[pi] === 0) continue;
    const i = pi * 4;
    const dr = data[i] - sr;
    const dg = data[i + 1] - sg;
    const db = data[i + 2] - sb;
    const da = data[i + 3] - sa;
    const dist2 = dr * dr + dg * dg + db * db + da * da;
    if (dist2 > tol2) continue;
    visited[pi] = 1;
    data[i] = tr;
    data[i + 1] = tg;
    data[i + 2] = tb;
    data[i + 3] = ta;
    filled++;
    stack.push(cx + 1, cy);
    stack.push(cx - 1, cy);
    stack.push(cx, cy + 1);
    stack.push(cx, cy - 1);
  }
  if (filled === 0) return false;
  ctx.putImageData(img, 0, 0);
  return true;
}

/* ----------------------------- shapes ----------------------------- */

export interface ShapeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function drawRectShape(
  ctx: CanvasRenderingContext2D,
  rect: ShapeRect,
  stroke: string,
  fill: string | null,
  strokeWidth: number,
): void {
  ctx.save();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  if (strokeWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
}

export function drawEllipseShape(
  ctx: CanvasRenderingContext2D,
  rect: ShapeRect,
  stroke: string,
  fill: string | null,
  strokeWidth: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(
    rect.x + rect.w / 2,
    rect.y + rect.h / 2,
    Math.abs(rect.w / 2),
    Math.abs(rect.h / 2),
    0,
    0,
    Math.PI * 2,
  );
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (strokeWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawLineShape(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke: string,
  strokeWidth: number,
): void {
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/* --------------------------- eyedropper --------------------------- */

/** Sample the composited document color at (x,y). Returns hex. */
export function sampleColorAt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): string | null {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  try {
    const p = ctx.getImageData(xi, yi, 1, 1).data;
    if (!p || p.length < 4) return null;
    const toHex = (v: number) => v.toString(16).padStart(2, "0");
    return `#${toHex(p[0])}${toHex(p[1])}${toHex(p[2])}`;
  } catch {
    return null;
  }
}

/** Sample a color from an RGBA array (returns hex or null if out of bounds). */
export function sampleColorFromBuffer(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): RGBA | null {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  if (xi < 0 || yi < 0 || xi >= width || yi >= height) return null;
  const i = (yi * width + xi) * 4;
  return {
    r: data[i] / 255,
    g: data[i + 1] / 255,
    b: data[i + 2] / 255,
    a: data[i + 3] / 255,
  };
}
