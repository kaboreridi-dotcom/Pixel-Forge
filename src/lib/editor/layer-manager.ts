/**
 * Pixel Forge — Layer Manager.
 *
 * Owns the lifecycle of layers within a Document: creation, cloning,
 * reordering, merging, and (de)serialization for the history stack.
 *
 * Layers are backed by off-screen HTMLCanvasElements. The manager never
 * reads the DOM of the visible stage — it only mutates layer canvases.
 * Compositing onto the visible canvas is the job of the CanvasEngine.
 */
import {
  DEFAULT_LAYER_FILTERS,
  type BlendMode,
  type DocumentModel,
  type DocumentSnapshot,
  type Layer,
  type LayerFilters,
  type LayerSnapshot,
} from "./types";
import { makeLayerCanvas, uid } from "@/lib/utils/image-utils";

export function createLayer(
  width: number,
  height: number,
  opts?: Partial<
    Pick<Layer, "name" | "opacity" | "blendMode" | "visible" | "locked">
  >,
): Layer {
  const { canvas, ctx } = makeLayerCanvas(width, height);
  return {
    id: uid(),
    name: opts?.name ?? "Layer",
    canvas,
    ctx,
    visible: opts?.visible ?? true,
    locked: opts?.locked ?? false,
    opacity: opts?.opacity ?? 1,
    blendMode: opts?.blendMode ?? "source-over",
    filters: { ...DEFAULT_LAYER_FILTERS },
    maskCanvas: null,
  };
}

export function cloneLayer(layer: Layer, newName?: string): Layer {
  const { canvas, ctx } = makeLayerCanvas(layer.canvas.width, layer.canvas.height);
  ctx.drawImage(layer.canvas, 0, 0);
  let maskCanvas: HTMLCanvasElement | null = null;
  if (layer.maskCanvas) {
    const m = makeLayerCanvas(layer.canvas.width, layer.canvas.height);
    m.ctx.drawImage(layer.maskCanvas, 0, 0);
    maskCanvas = m.canvas;
  }
  return {
    ...layer,
    id: uid(),
    name: newName ?? `${layer.name} copy`,
    canvas,
    ctx,
    filters: { ...layer.filters },
    maskCanvas,
  };
}

export function duplicateLayer(
  doc: DocumentModel,
  layerId: string,
): Layer | null {
  const idx = doc.layers.findIndex((l) => l.id === layerId);
  if (idx < 0) return null;
  const copy = cloneLayer(doc.layers[idx]);
  doc.layers.splice(idx + 1, 0, copy);
  doc.activeLayerId = copy.id;
  return copy;
}

export function mergeLayerDown(doc: DocumentModel, layerId: string): void {
  const idx = doc.layers.findIndex((l) => l.id === layerId);
  if (idx <= 0) return;
  const top = doc.layers[idx];
  const bottom = doc.layers[idx - 1];
  bottom.ctx.save();
  bottom.ctx.globalAlpha = top.opacity;
  bottom.ctx.globalCompositeOperation = top.blendMode as GlobalCompositeOperation;
  bottom.ctx.drawImage(top.canvas, 0, 0);
  bottom.ctx.restore();
  doc.layers.splice(idx, 1);
  doc.activeLayerId = bottom.id;
}

export function flattenDocument(doc: DocumentModel): Layer {
  const base = createLayer(doc.width, doc.height, { name: doc.name });
  for (const layer of doc.layers) {
    if (!layer.visible) continue;
    base.ctx.save();
    base.ctx.globalAlpha = layer.opacity;
    base.ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
    base.ctx.drawImage(layer.canvas, 0, 0);
    base.ctx.restore();
  }
  return base;
}

export function deleteLayer(doc: DocumentModel, layerId: string): void {
  const idx = doc.layers.findIndex((l) => l.id === layerId);
  if (idx < 0) return;
  doc.layers.splice(idx, 1);
  if (doc.activeLayerId === layerId) {
    doc.activeLayerId = doc.layers[Math.max(0, idx - 1)]?.id ?? null;
  }
}

export function moveLayer(
  doc: DocumentModel,
  layerId: string,
  direction: "up" | "down",
): void {
  const idx = doc.layers.findIndex((l) => l.id === layerId);
  if (idx < 0) return;
  const target = direction === "up" ? idx + 1 : idx - 1;
  if (target < 0 || target >= doc.layers.length) return;
  const [layer] = doc.layers.splice(idx, 1);
  doc.layers.splice(target, 0, layer);
}

export function reorderLayer(
  doc: DocumentModel,
  layerId: string,
  toIndex: number,
): void {
  const idx = doc.layers.findIndex((l) => l.id === layerId);
  if (idx < 0) return;
  const clamped = Math.max(0, Math.min(doc.layers.length - 1, toIndex));
  const [layer] = doc.layers.splice(idx, 1);
  doc.layers.splice(clamped, 0, layer);
}

export function getActiveLayer(doc: DocumentModel): Layer | null {
  if (!doc.activeLayerId) return null;
  return doc.layers.find((l) => l.id === doc.activeLayerId) ?? null;
}

/** Apply filter deltas to a layer's metadata. */
export function setLayerFilters(
  doc: DocumentModel,
  layerId: string,
  filters: LayerFilters,
): void {
  const layer = doc.layers.find((l) => l.id === layerId);
  if (layer) layer.filters = { ...filters };
}

/* ------------------------------------------------------------------ */
/* Snapshot (de)serialization for history.                            */
/* ------------------------------------------------------------------ */

/** Serialize a document to a snapshot (PNG data URLs for each layer). */
export function snapshotDocument(doc: DocumentModel): DocumentSnapshot {
  return {
    id: doc.id,
    name: doc.name,
    width: doc.width,
    height: doc.height,
    activeLayerId: doc.activeLayerId,
    layers: doc.layers.map(snapshotLayer),
  };
}

export function snapshotLayer(layer: Layer): LayerSnapshot {
  return {
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    locked: layer.locked,
    opacity: layer.opacity,
    blendMode: layer.blendMode,
    filters: { ...layer.filters },
    pixels: layer.canvas.toDataURL("image/png"),
    mask: layer.maskCanvas ? layer.maskCanvas.toDataURL("image/png") : null,
  };
}

/** Restore a snapshot into a fresh DocumentModel (new layer canvases). */
export async function restoreSnapshot(
  snap: DocumentSnapshot,
): Promise<DocumentModel> {
  const layers: Layer[] = [];
  for (const ls of snap.layers) {
    layers.push(await restoreLayer(ls, snap.width, snap.height));
  }
  return {
    id: snap.id,
    name: snap.name,
    width: snap.width,
    height: snap.height,
    layers,
    activeLayerId: snap.activeLayerId,
  };
}

async function restoreLayer(
  ls: LayerSnapshot,
  width: number,
  height: number,
): Promise<Layer> {
  const { canvas, ctx } = makeLayerCanvas(width, height);
  await drawDataURL(ls.pixels, ctx, width, height);
  let maskCanvas: HTMLCanvasElement | null = null;
  if (ls.mask) {
    const m = makeLayerCanvas(width, height);
    await drawDataURL(ls.mask, m.ctx, width, height);
    maskCanvas = m.canvas;
  }
  return {
    id: ls.id,
    name: ls.name,
    canvas,
    ctx,
    visible: ls.visible,
    locked: ls.locked,
    opacity: ls.opacity,
    blendMode: ls.blendMode as BlendMode,
    filters: { ...ls.filters },
    maskCanvas,
  };
}

function drawDataURL(
  dataUrl: string,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve();
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
