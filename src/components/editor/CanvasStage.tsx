"use client";

/**
 * CanvasStage — the interactive editing surface.
 *
 * Owns two stacked canvases:
 *   - base:   the composited document (all layers, blend modes, filters)
 *   - overlay: live previews (shape-in-progress, brush cursor, selection ants)
 *
 * Pointer events are routed to the active tool. Brush strokes stamp
 * spaced dabs directly into the active layer's canvas; shape tools
 * render a preview onto the overlay during drag and commit to the
 * active layer on pointer-up.
 *
 * Rendering is driven by a `renderToken` from the store so that any
 * store mutation (layer opacity change, filter tweak, undo/redo)
 * triggers a fresh composite without React re-rendering the canvas
 * DOM node.
 */
import { useCallback, useEffect, useRef } from "react";
import { useEditor } from "@/lib/store/editor-store";
import { CanvasEngine } from "@/lib/editor/canvas-engine";
import {
  drawEllipseShape,
  drawLineShape,
  drawRectShape,
  floodFill,
  sampleColorAt,
  stampBrush,
  strokeSegment,
} from "@/lib/editor/drawing";
import type { PointerSample, Selection, ShapeFillMode } from "@/lib/editor/types";
import { useEditorShortcuts } from "@/hooks/useEditorShortcuts";

interface DragState {
  tool: string;
  startDocX: number;
  startDocY: number;
  curDocX: number;
  curDocY: number;
  samples: PointerSample[];
  button: number;
  panStartX: number;
  panStartY: number;
  panOrigX: number;
  panOrigY: number;
}

export function CanvasStage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const compositedRef = useRef<HTMLCanvasElement | null>(null);

  const doc = useEditor((s) => s.doc);
  const view = useEditor((s) => s.view);
  const tool = useEditor((s) => s.tool);
  const renderToken = useEditor((s) => s.renderToken);
  const primaryColor = useEditor((s) => s.primaryColor);
  const secondaryColor = useEditor((s) => s.secondaryColor);
  const brush = useEditor((s) => s.brush);
  const shape = useEditor((s) => s.shape);
  const fill = useEditor((s) => s.fill);
  const text = useEditor((s) => s.text);
  const selection = useEditor((s) => s.selection);
  const spaceHeld = useRef(false);

  // pull live actions
  const setView = useEditor((s) => s.setView);
  const setPrimaryColor = useEditor((s) => s.setPrimaryColor);
  const setSecondaryColor = useEditor((s) => s.setSecondaryColor);
  const swapColors = useEditor((s) => s.swapColors);
  const setCursorDoc = useEditor((s) => s.setCursorDoc);
  const setSelection = useEditor((s) => s.setSelection);
  const clearSelection = useEditor((s) => s.clearSelection);
  const beginHistory = useEditor((s) => s.beginHistory);
  const commit = useEditor((s) => s.commit);
  const requestRender = useEditor((s) => s.requestRender);
  const setTool = useEditor((s) => s.setTool);
  const fitToScreen = useEditor((s) => s.fitToScreen);

  useEditorShortcuts();

  /* Resize the display canvases to match the stage size (× DPR). */
  const resizeCanvases = useCallback(() => {
    const stage = stageRef.current;
    const base = baseRef.current;
    const overlay = overlayRef.current;
    if (!stage || !base || !overlay) return;
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (base.width !== w || base.height !== h) {
      base.width = w;
      base.height = h;
      overlay.width = w;
      overlay.height = h;
      base.style.width = `${rect.width}px`;
      base.style.height = `${rect.height}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
    }
    return { w, h, dpr, rect };
  }, []);

  /* Composite the document onto the base canvas (DPR-aware). */
  const render = useCallback(() => {
    const base = baseRef.current;
    const stage = stageRef.current;
    if (!base || !stage || !doc) return;
    const ctx = base.getContext("2d", { alpha: true })!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, base.width, base.height);
    // draw the canvas-bg pattern
    ctx.fillStyle = "#0e0e12";
    ctx.fillRect(0, 0, base.width, base.height);

    // composite doc into an offscreen at doc resolution (for crispness)
    if (!compositedRef.current || compositedRef.current.width !== doc.width || compositedRef.current.height !== doc.height) {
      const c = document.createElement("canvas");
      c.width = doc.width;
      c.height = doc.height;
      compositedRef.current = c;
    }
    const comp = compositedRef.current;
    const cctx = comp.getContext("2d", { willReadFrequently: true })!;
    cctx.clearRect(0, 0, doc.width, doc.height);
    for (const layer of doc.layers) {
      CanvasEngine.drawLayer(layer, cctx);
    }

    // apply DPR + view transform
    ctx.scale(dpr, dpr);
    ctx.translate(view.panX, view.panY);
    ctx.scale(view.zoom, view.zoom);

    // checkerboard for transparent areas
    drawCheckerboard(ctx, 0, 0, doc.width, doc.height, view.zoom);

    ctx.drawImage(comp, 0, 0);
  }, [doc, view, renderToken]);

  const lastCursorRef = useRef<{ x: number; y: number } | null>(null);

  const renderOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (!doc) return;
    ctx.scale(dpr, dpr);
    ctx.translate(view.panX, view.panY);
    ctx.scale(view.zoom, view.zoom);

    // selection
    if (selection) {
      drawSelectionAnts(ctx, selection, view.zoom);
    }

    // live shape preview during drag
    const drag = dragRef.current;
    if (drag && (drag.tool.startsWith("shape-") || drag.tool === "select-rect")) {
      const x1 = drag.startDocX;
      const y1 = drag.startDocY;
      const x2 = drag.curDocX;
      const y2 = drag.curDocY;
      const x = Math.min(x1, x2);
      const y = Math.min(y1, y2);
      const w = Math.abs(x2 - x1);
      const h = Math.abs(y2 - y1);
      if (drag.tool.startsWith("shape-")) {
        const color = drag.button === 2 ? secondaryColor : primaryColor;
        const fillMode = shape.fillMode;
        if (drag.tool === "shape-rect") {
          drawRectShape(ctx, { x, y, w, h }, color, fillMode !== "stroke" ? color : null, shape.strokeWidth);
        } else if (drag.tool === "shape-ellipse") {
          drawEllipseShape(ctx, { x, y, w, h }, color, fillMode !== "stroke" ? color : null, shape.strokeWidth);
        } else if (drag.tool === "shape-line") {
          drawLineShape(ctx, x1, y1, x2, y2, color, shape.strokeWidth);
        }
      } else if (drag.tool === "select-rect") {
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 1 / view.zoom;
        ctx.setLineDash([4 / view.zoom, 3 / view.zoom]);
        ctx.strokeRect(x, y, w, h);
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.lineDashOffset = 4 / view.zoom;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
      }
    }

    // brush cursor outline
    if (doc && (tool === "brush" || tool === "eraser")) {
      const cur = drag?.curDocX != null
        ? { x: drag.curDocX, y: drag.curDocY }
        : lastCursorRef.current;
      if (cur) {
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = tool === "eraser" ? "rgba(255,90,90,0.95)" : "rgba(255,255,255,0.95)";
        ctx.lineWidth = 1 / view.zoom;
        ctx.beginPath();
        ctx.arc(cur.x, cur.y, brush.size / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(0,0,0,0.7)";
        ctx.beginPath();
        ctx.arc(cur.x, cur.y, brush.size / 2 + 1 / view.zoom, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }, [doc, view, selection, tool, brush, shape, primaryColor, secondaryColor, renderToken]);

  // re-render on any dependency change
  useEffect(() => {
    render();
    renderOverlay();
  }, [render, renderOverlay, renderToken, view, doc, tool, brush, selection, primaryColor, secondaryColor, shape]);

  // resize observer
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => {
      resizeCanvases();
      render();
    });
    ro.observe(stage);
    resizeCanvases();
    // initial fit when a doc first appears
    if (doc) {
      const r = stage.getBoundingClientRect();
      fitToScreen(r.width, r.height);
    }
    return () => ro.disconnect();
  }, [doc?.id, doc?.width, doc?.height]);

  // overlay marching-ants animation
  useEffect(() => {
    if (!selection) return;
    let raf = 0;
    let t = 0;
    const tick = () => {
      t = (t + 0.5) % 8;
      renderOverlay();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [selection, renderOverlay]);

  /* ---------------- pointer handling ---------------- */

  const toDocCoords = useCallback(
    (clientX: number, clientY: number) => {
      const base = baseRef.current!;
      const rect = base.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      return CanvasEngine.screenToDoc(sx, sy, view);
    },
    [view],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!doc) return;
      const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
      const base = baseRef.current!;
      base.setPointerCapture(e.pointerId);
      const p = toDocCoords(e.clientX, e.clientY);
      const button = e.button;
      lastCursorRef.current = p;

      // space = pan regardless of tool
      if (spaceHeld.current || tool === "hand") {
        dragRef.current = {
          tool: "hand",
          startDocX: p.x,
          startDocY: p.y,
          curDocX: p.x,
          curDocY: p.y,
          samples: [],
          button,
          panStartX: e.clientX,
          panStartY: e.clientY,
          panOrigX: view.panX,
          panOrigY: view.panY,
        };
        return;
      }

      if (tool === "zoom") {
        const factor = e.altKey ? 1 / 1.5 : 1.5;
        const rect = base.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const newZoom = Math.max(0.02, Math.min(32, view.zoom * factor));
        // keep cursor anchored
        const dx = sx - view.panX;
        const dy = sy - view.panY;
        const nx = sx - dx * (newZoom / view.zoom);
        const ny = sy - dy * (newZoom / view.zoom);
        setView({ zoom: newZoom, panX: nx, panY: ny });
        return;
      }

      // tools that need an editable, unlocked layer
      if (
        activeLayer &&
        (tool === "brush" ||
          tool === "eraser" ||
          tool === "fill" ||
          tool.startsWith("shape-") ||
          tool === "text")
      ) {
        if (activeLayer.locked) return;
      }

      dragRef.current = {
        tool,
        startDocX: p.x,
        startDocY: p.y,
        curDocX: p.x,
        curDocY: p.y,
        samples: [{ x: p.x, y: p.y, pressure: e.pressure || 1, t: performance.now() }],
        button,
        panStartX: 0,
        panStartY: 0,
        panOrigX: 0,
        panOrigY: 0,
      };

      if (tool === "brush" || tool === "eraser") {
        beginHistory(tool === "brush" ? "Brush Stroke" : "Erase");
        const color = tool === "eraser" ? "#000000" : (button === 2 ? secondaryColor : primaryColor);
        stampBrush(activeLayer!.ctx, p.x, p.y, brush, color, tool === "eraser");
        requestRender();
      } else if (tool === "fill") {
        beginHistory("Fill");
        const color = button === 2 ? secondaryColor : primaryColor;
        const ok = floodFill(
          activeLayer!.ctx,
          doc.width,
          doc.height,
          p.x,
          p.y,
          color,
          fill.tolerance,
        );
        if (ok) {
          commit();
        } else {
          // rollback: just don't commit (no history pushed since label cleared in commit-less path)
          // commit() with no label is a no-op, so we manually clear
          useEditor.setState({ pendingLabel: null });
        }
        requestRender();
      } else if (tool === "eyedropper") {
        // sample from composited doc
        const comp = compositedRef.current;
        if (comp) {
          const cctx = comp.getContext("2d", { willReadFrequently: true })!;
          const hex = sampleColorAt(cctx, p.x, p.y);
          if (hex) {
            if (button === 2) setSecondaryColor(hex);
            else setPrimaryColor(hex);
          }
        }
      } else if (tool === "select-rect") {
        // selection drag — preview on overlay
      } else if (tool === "text") {
        const txt = window.prompt("Enter text:");
        if (txt && activeLayer) {
          beginHistory("Add Text");
          const c = activeLayer.ctx;
          c.save();
          const weight = text.bold ? "700" : "400";
          const italic = text.italic ? "italic " : "";
          c.font = `${italic}${weight} ${text.fontSize}px ${text.fontFamily}`;
          c.fillStyle = button === 2 ? secondaryColor : primaryColor;
          c.textBaseline = "top";
          c.textAlign = text.align;
          const lines = txt.split("\n");
          let y = p.y;
          for (const ln of lines) {
            c.fillText(ln, p.x, y);
            y += text.fontSize * 1.2;
          }
          c.restore();
          commit();
          requestRender();
        }
      } else if (tool === "move") {
        if (activeLayer) {
          beginHistory("Move Layer");
        }
      }
    },
    [doc, tool, view, toDocCoords, beginHistory, brush, primaryColor, secondaryColor, fill, text, commit, requestRender, setView, setPrimaryColor, setSecondaryColor],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!doc) return;
      const p = toDocCoords(e.clientX, e.clientY);
      lastCursorRef.current = p;
      setCursorDoc({ x: Math.round(p.x), y: Math.round(p.y) });

      const drag = dragRef.current;
      if (!drag) {
        renderOverlay();
        return;
      }
      drag.curDocX = p.x;
      drag.curDocY = p.y;

      if (drag.tool === "hand") {
        const dx = e.clientX - drag.panStartX;
        const dy = e.clientY - drag.panStartY;
        setView({ panX: drag.panOrigX + dx, panY: drag.panOrigY + dy });
        return;
      }

      if (drag.tool === "brush" || drag.tool === "eraser") {
        const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
        if (!activeLayer || activeLayer.locked) return;
        const last = drag.samples[drag.samples.length - 1];
        const sample: PointerSample = {
          x: p.x,
          y: p.y,
          pressure: e.pressure || 1,
          t: performance.now(),
        };
        const color = drag.tool === "eraser" ? "#000000" : (drag.button === 2 ? secondaryColor : primaryColor);
        const effBrush = drag.tool === "eraser" ? { ...brush, opacity: 1 } : brush;
        strokeSegment(activeLayer.ctx, last, sample, effBrush, color, drag.tool === "eraser");
        drag.samples.push(sample);
        requestRender();
        return;
      }

      if (drag.tool === "move") {
        const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
        if (!activeLayer) return;
        const dx = p.x - drag.startDocX;
        const dy = p.y - drag.startDocY;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
        const tmp = document.createElement("canvas");
        tmp.width = activeLayer.canvas.width;
        tmp.height = activeLayer.canvas.height;
        tmp.getContext("2d")!.drawImage(activeLayer.canvas, 0, 0);
        activeLayer.ctx.clearRect(0, 0, activeLayer.canvas.width, activeLayer.canvas.height);
        activeLayer.ctx.drawImage(tmp, dx, dy);
        drag.startDocX = p.x;
        drag.startDocY = p.y;
        requestRender();
        return;
      }

      // preview tools (shapes / select-rect) — just re-render overlay
      renderOverlay();
    },
    [doc, view, toDocCoords, setCursorDoc, setView, brush, primaryColor, secondaryColor, requestRender, renderOverlay],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const base = baseRef.current;
      if (base) base.releasePointerCapture(e.pointerId);
      const drag = dragRef.current;
      dragRef.current = null;
      if (!doc || !drag) {
        renderOverlay();
        return;
      }

      if (drag.tool === "hand") {
        return;
      }

      if (drag.tool === "brush" || drag.tool === "eraser" || drag.tool === "move") {
        commit();
        requestRender();
        return;
      }

      if (drag.tool.startsWith("shape-")) {
        const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
        if (!activeLayer) return;
        beginHistory("Draw Shape");
        const color = drag.button === 2 ? secondaryColor : primaryColor;
        const x1 = drag.startDocX;
        const y1 = drag.startDocY;
        const x2 = drag.curDocX;
        const y2 = drag.curDocY;
        let dx = Math.min(x1, x2);
        let dy = Math.min(y1, y2);
        let w = Math.abs(x2 - x1);
        let h = Math.abs(y2 - y1);
        if (e.shiftKey) {
          const m = Math.max(w, h);
          w = h = m;
          dx = x1 < x2 ? dx : dx - (m - Math.abs(x2 - x1));
        }
        const fillMode: ShapeFillMode = shape.fillMode;
        const fillC = fillMode !== "stroke" ? color : null;
        if (drag.tool === "shape-rect") {
          drawRectShape(activeLayer.ctx, { x: dx, y: dy, w, h }, color, fillC, shape.strokeWidth);
        } else if (drag.tool === "shape-ellipse") {
          drawEllipseShape(activeLayer.ctx, { x: dx, y: dy, w, h }, color, fillC, shape.strokeWidth);
        } else if (drag.tool === "shape-line") {
          drawLineShape(activeLayer.ctx, x1, y1, x2, y2, color, shape.strokeWidth);
        }
        commit();
        requestRender();
        return;
      }

      if (drag.tool === "select-rect") {
        const x = Math.min(drag.startDocX, drag.curDocX);
        const y = Math.min(drag.startDocY, drag.curDocY);
        const w = Math.abs(drag.curDocX - drag.startDocX);
        const h = Math.abs(drag.curDocY - drag.startDocY);
        if (w < 2 || h < 2) {
          clearSelection();
        } else {
          const sel: Selection = {
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(w),
            height: Math.round(h),
            mask: null,
          };
          setSelection(sel);
        }
        renderOverlay();
        return;
      }
    },
    [doc, shape, primaryColor, secondaryColor, commit, requestRender, beginHistory, renderOverlay, setSelection, clearSelection],
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!doc) return;
      const base = baseRef.current!;
      const rect = base.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      if (e.ctrlKey || e.metaKey) {
        // zoom to cursor
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        const newZoom = Math.max(0.02, Math.min(32, view.zoom * factor));
        const dx = sx - view.panX;
        const dy = sy - view.panY;
        const nx = sx - dx * (newZoom / view.zoom);
        const ny = sy - dy * (newZoom / view.zoom);
        setView({ zoom: newZoom, panX: nx, panY: ny });
      } else {
        setView({ panX: view.panX - e.deltaX, panY: view.panY - e.deltaY });
      }
    },
    [doc, view, setView],
  );

  // track space for pan
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTextInput(e.target)) {
        e.preventDefault();
        spaceHeld.current = true;
      }
      if (e.key === "Escape") {
        dragRef.current = null;
        clearSelection();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceHeld.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [clearSelection]);

  if (!doc) return <EmptyStage />;

  const cursorClass =
    tool === "hand"
      ? "cursor-grab"
      : tool === "brush" || tool === "eraser"
        ? "cursor-none"
        : tool === "text"
          ? "cursor-text"
          : tool === "eyedropper"
            ? "cursor-crosshair"
            : tool === "zoom"
              ? "cursor-zoom-in"
              : "cursor-crosshair";

  return (
    <div
      id="pf-stage"
      ref={stageRef}
      className={`relative flex-1 min-h-0 overflow-hidden bg-canvas-bg ${cursorClass}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => {
        setCursorDoc(null);
        lastCursorRef.current = null;
        renderOverlay();
      }}
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={baseRef} className="absolute inset-0 block" />
      <canvas
        ref={overlayRef}
        className="absolute inset-0 block pointer-events-none"
      />
    </div>
  );
}

function isTextInput(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || t.isContentEditable;
}

/* ------------------------ drawing helpers ------------------------ */

function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  zoom: number,
): void {
  const size = Math.max(8, Math.round(12 * zoom));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const startX = Math.floor(x / size) * size;
  const startY = Math.floor(y / size) * size;
  for (let yy = startY; yy < y + h + size; yy += size) {
    for (let xx = startX; xx < x + w + size; xx += size) {
      const odd = ((xx / size) | 0) + ((yy / size) | 0);
      ctx.fillStyle = odd % 2 === 0 ? "#2a2a32" : "#222228";
      ctx.fillRect(xx, yy, size, size);
    }
  }
  ctx.restore();
}

let antsOffset = 0;
function drawSelectionAnts(
  ctx: CanvasRenderingContext2D,
  sel: Selection,
  zoom: number,
): void {
  ctx.save();
  antsOffset = (antsOffset + 0.5) % 6;
  ctx.lineWidth = 1 / zoom;
  // white dashes
  ctx.strokeStyle = "#ffffff";
  ctx.setLineDash([4 / zoom, 4 / zoom]);
  ctx.lineDashOffset = -antsOffset / zoom;
  ctx.strokeRect(sel.x, sel.y, sel.width, sel.height);
  // black dashes offset
  ctx.strokeStyle = "#000000";
  ctx.lineDashOffset = (-antsOffset + 4) / zoom;
  ctx.strokeRect(sel.x, sel.y, sel.width, sel.height);
  ctx.restore();
}

/* ------------------------ empty state ------------------------ */

function EmptyStage() {
  const newDocument = useEditor((s) => s.newDocument);
  return (
    <div className="flex-1 grid place-items-center bg-canvas-bg p-8">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 w-12 h-12 grid place-items-center bg-accent-amber/10 border border-accent-amber/30 rounded-[3px]">
          <span className="text-accent-amber text-lg font-bold">PF</span>
        </div>
        <h2 className="text-sm font-semibold mb-1.5">No canvas yet</h2>
        <p className="text-xs text-muted-foreground leading-relaxed mb-6">
          Create a new document or open an existing image to start editing.
          Everything happens locally in your browser — no uploads, no account.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => newDocument(1280, 800, "#ffffff")}
            className="px-3 py-2 text-xs bg-accent-amber text-accent-amber-foreground hover:bg-accent-amber/90 rounded-[2px] transition-colors"
          >
            New 1280×800 canvas
          </button>
          <label className="px-3 py-2 text-xs border border-border hover:bg-accent rounded-[2px] transition-colors cursor-pointer">
            Open image…
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const url = URL.createObjectURL(f);
                const img = new Image();
                img.onload = () => {
                  useEditor.getState().importImage(img, f.name.replace(/\.[^.]+$/, ""));
                  URL.revokeObjectURL(url);
                };
                img.src = url;
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
