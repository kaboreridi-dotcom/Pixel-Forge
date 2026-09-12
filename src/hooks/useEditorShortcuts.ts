"use client";

/**
 * useEditorShortcuts — global keyboard bindings for the editor.
 *
 * Single-letter tool switches, ctrl/shift combos for undo/redo,
 * new/open/export, numeric zoom, etc. Binds on mount, unbinds on
 * unmount. Text inputs are exempted so typing in panels is unaffected.
 */
import { useEffect } from "react";
import { useEditor } from "@/lib/store/editor-store";
import { TOOLS } from "@/lib/editor/constants";
import type { ToolId } from "@/lib/editor/types";

export function useEditorShortcuts(): void {
  const setTool = useEditor((s) => s.setTool);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const zoomIn = useEditor((s) => s.zoomIn);
  const zoomOut = useEditor((s) => s.zoomOut);
  const actualSize = useEditor((s) => s.actualSize);
  const swapColors = useEditor((s) => s.swapColors);
  const clearSelection = useEditor((s) => s.clearSelection);
  const selectAll = useEditor((s) => s.selectAll);
  const addLayer = useEditor((s) => s.addLayer);
  const fitToScreen = useEditor((s) => s.fitToScreen);
  const setView = useEditor((s) => s.setView);

  useEffect(() => {
    const shortcutMap: Record<string, ToolId> = Object.fromEntries(
      TOOLS.map((t) => [t.shortcut, t.id]),
    );

    const isText = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || el.isContentEditable;
    };

    const handler = (e: KeyboardEvent) => {
      if (isText(e.target)) return;
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      // Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y)
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && key === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && key === "n") {
        e.preventDefault();
        // open new doc dialog via store signal
        window.dispatchEvent(new CustomEvent("pf:new-doc"));
        return;
      }
      if (mod && key === "o") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("pf:open"));
        return;
      }
      if (mod && key === "e") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("pf:export"));
        return;
      }
      if (mod && key === "s") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("pf:export"));
        return;
      }
      if (mod && key === "0") {
        e.preventDefault();
        const el = document.getElementById("pf-stage");
        if (el) fitToScreen(el.clientWidth, el.clientHeight);
        return;
      }
      if (mod && key === "=") {
        e.preventDefault();
        zoomIn();
        return;
      }
      if (mod && key === "-") {
        e.preventDefault();
        zoomOut();
        return;
      }
      if (mod && key === "1") {
        e.preventDefault();
        actualSize();
        return;
      }
      if (mod && key === "a") {
        e.preventDefault();
        selectAll();
        return;
      }
      if (mod && key === "d") {
        e.preventDefault();
        useEditor.getState().resetColors();
        return;
      }
      if (mod && key === "shift+n") {
        e.preventDefault();
        addLayer();
        return;
      }
      if (key === "x" && !mod) {
        swapColors();
        return;
      }
      if (key === "1" && !mod) {
        setView({ zoom: 1 });
        return;
      }
      if (key === "escape") {
        clearSelection();
        return;
      }
      if (key === "+" && !mod) {
        zoomIn();
        return;
      }
      if (key === "-" && !mod) {
        zoomOut();
        return;
      }
      // tool shortcuts
      if (!mod && shortcutMap[key]) {
        e.preventDefault();
        setTool(shortcutMap[key]);
        return;
      }
      // bracket = brush size
      if (key === "[") {
        const b = useEditor.getState().brush;
        useEditor.getState().setBrush({ size: Math.max(1, b.size - 2) });
        return;
      }
      if (key === "]") {
        const b = useEditor.getState().brush;
        useEditor.getState().setBrush({ size: Math.min(800, b.size + 2) });
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    setTool,
    undo,
    redo,
    zoomIn,
    zoomOut,
    actualSize,
    swapColors,
    clearSelection,
    selectAll,
    addLayer,
    fitToScreen,
    setView,
  ]);
}
