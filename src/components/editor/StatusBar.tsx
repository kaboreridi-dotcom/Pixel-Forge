"use client";

/**
 * StatusBar — bottom info strip: cursor position, zoom, doc dims,
 * active tool, history cursor, memory hint.
 */
import { useEditor } from "@/lib/store/editor-store";
import { TOOLS } from "@/lib/editor/constants";

export function StatusBar() {
  const doc = useEditor((s) => s.doc);
  const view = useEditor((s) => s.view);
  const tool = useEditor((s) => s.tool);
  const cursor = useEditor((s) => s.cursorDoc);
  const history = useEditor((s) => s.history);
  const renderToken = useEditor((s) => s.renderToken);

  const toolDef = TOOLS.find((t) => t.id === tool);
  const layers = doc?.layers.length ?? 0;
  const activeLayer = doc?.layers.find((l) => l.id === doc.activeLayerId);

  return (
    <footer className="flex items-center gap-4 h-6 px-3 border-t border-border bg-panel text-[10px] text-muted-foreground shrink-0 select-none">
      <span className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-amber" />
        <span className="text-foreground">{toolDef?.label ?? tool}</span>
      </span>

      <Sep />

      {activeLayer && (
        <span className="hidden sm:inline truncate max-w-[10rem]">
          {activeLayer.name}
          {activeLayer.locked && " 🔒"}
          {!activeLayer.visible && " 👁"}
        </span>
      )}

      <Sep />

      <span className="hidden md:inline">{layers} layer{layers !== 1 ? "s" : ""}</span>

      <Sep />

      {cursor ? (
        <span className="tabular-nums">
          x: {cursor.x}  y: {cursor.y}
        </span>
      ) : (
        <span className="tabular-nums opacity-50">x: –  y: –</span>
      )}

      <div className="flex-1" />

      {doc && (
        <span className="tabular-nums hidden lg:inline">
          {doc.width}×{doc.height}px
        </span>
      )}

      <Sep />

      <span className="tabular-nums">{Math.round(view.zoom * 100)}%</span>

      <Sep />

      <span className="hidden md:inline">
        {history.cursor + 1}/{history.entries.length} history
      </span>

      <Sep className="hidden md:block" />

      <span className="hidden lg:inline text-muted-foreground/70">
        render #{renderToken}
      </span>

      <Sep className="hidden lg:block" />

      <span className="text-muted-foreground/70">100% offline</span>
    </footer>
  );
}

function Sep() {
  return <span className="w-px h-3 bg-border" />;
}
