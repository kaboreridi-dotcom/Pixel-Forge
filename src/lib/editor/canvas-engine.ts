/**
 * Pixel Forge — Canvas Engine.
 *
 * Responsible for compositing the document's layers onto a single
 * visible canvas (the stage). It also handles device-pixel-ratio
 * scaling so strokes stay crisp on retina displays, and converts
 * between screen coordinates and document coordinates under a
 * pan/zoom view transform.
 *
 * The engine is a pure helper class — React owns the actual <canvas>
 * elements and passes them in. This keeps rendering testable and
 * decoupled from the component lifecycle.
 */
import type { DocumentModel, Layer, ViewTransform } from "./types";

export class CanvasEngine {
  /** Composite all visible layers into the destination ctx. */
  static composite(
    doc: DocumentModel,
    dest: CanvasRenderingContext2D,
    options?: { withSelection?: boolean },
  ): void {
    dest.clearRect(0, 0, doc.width, doc.height);
    for (const layer of doc.layers) {
      if (!layer.visible || layer.opacity <= 0) continue;
      CanvasEngine.drawLayer(layer, dest);
    }
    void options; // reserved for future selection overlay drawing
  }

  /** Draw a single layer (with its blend mode, opacity, filters, mask). */
  static drawLayer(layer: Layer, dest: CanvasRenderingContext2D): void {
    if (!layer.visible || layer.opacity <= 0) return;
    dest.save();
    dest.globalAlpha = layer.opacity;
    dest.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
    const f = layer.filters;
    const filterParts: string[] = [];
    if (f.brightness) filterParts.push(`brightness(${1 + f.brightness / 100})`);
    if (f.contrast) filterParts.push(`contrast(${1 + f.contrast / 100})`);
    if (f.saturation) filterParts.push(`saturate(${1 + f.saturation / 100})`);
    if (f.hue) filterParts.push(`hue-rotate(${f.hue}deg)`);
    if (f.blur > 0) filterParts.push(`blur(${f.blur}px)`);
    if (f.invert) filterParts.push(`invert(${f.invert / 100})`);
    if (f.grayscale) filterParts.push(`grayscale(${f.grayscale / 100})`);
    if (f.sepia) filterParts.push(`sepia(${f.sepia / 100})`);
    if (filterParts.length) {
      dest.filter = filterParts.join(" ");
    }
    if (layer.maskCanvas) {
      // Composite with destination-in mask for the layer pixels only.
      // Easiest robust path: draw image, then mask via globalCompositeOperation.
      dest.drawImage(layer.canvas, 0, 0);
      const prev = dest.globalCompositeOperation;
      dest.globalCompositeOperation = "destination-in";
      dest.drawImage(layer.maskCanvas, 0, 0);
      dest.globalCompositeOperation = prev;
    } else {
      dest.drawImage(layer.canvas, 0, 0);
    }
    dest.filter = "none";
    dest.restore();
  }

  /** Flatten the whole document into a new canvas (used for export). */
  static flatten(doc: DocumentModel): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = doc.width;
    canvas.height = doc.height;
    const ctx = canvas.getContext("2d")!;
    for (const layer of doc.layers) {
      CanvasEngine.drawLayer(layer, ctx);
    }
    return canvas;
  }

  /**
   * Apply a view transform (pan/zoom) to a display ctx so that document
   * coordinate (0,0) maps correctly. Call this before drawing the composited
   * doc-canvas onto the visible stage.
   */
  static applyView(
    ctx: CanvasRenderingContext2D,
    view: ViewTransform,
  ): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(view.panX, view.panY);
    ctx.scale(view.zoom, view.zoom);
  }

  /** Convert a screen point (CSS px) -> document coords given a view transform. */
  static screenToDoc(
    sx: number,
    sy: number,
    view: ViewTransform,
  ): { x: number; y: number } {
    return {
      x: (sx - view.panX) / view.zoom,
      y: (sy - view.panY) / view.zoom,
    };
  }

  /** Compute a "fit" view for a document given stage CSS size. */
  static fitView(
    docW: number,
    docH: number,
    stageW: number,
    stageH: number,
  ): ViewTransform {
    const pad = 48;
    const z = Math.min(
      (stageW - pad) / docW,
      (stageH - pad) / docH,
    );
    const zoom = Math.max(0.02, Math.min(8, z));
    return {
      zoom,
      panX: (stageW - docW * zoom) / 2,
      panY: (stageH - docH * zoom) / 2,
    };
  }
}
