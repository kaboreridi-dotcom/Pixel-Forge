"use client";

/**
 * LayersPanel — layer stack with thumbnails + per-layer controls.
 *
 * Order is "topmost first" in the UI (standard image-editor
 * convention), while the underlying array stores bottom-first.
 * Thumbnails are rendered from the layer's canvas on every render
 * tick (driven by `renderToken`).
 */
import { useEffect, useRef, useState } from "react";
import { useEditor } from "@/lib/store/editor-store";
import { BLEND_MODES } from "@/lib/editor/constants";
import type { Layer } from "@/lib/editor/types";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  DuplicateIcon,
  EyeIcon,
  EyeOffIcon,
  FlattenIcon,
  LockIcon,
  MergeDownIcon,
  PlusIcon,
  TrashIcon,
  UnlockIcon,
} from "../icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

export function LayersPanel() {
  const doc = useEditor((s) => s.doc);
  const renderToken = useEditor((s) => s.renderToken);
  const setActiveLayer = useEditor((s) => s.setActiveLayer);
  const addLayer = useEditor((s) => s.addLayer);
  const removeLayer = useEditor((s) => s.removeLayer);
  const duplicateLayer = useEditor((s) => s.duplicateLayer);
  const mergeDown = useEditor((s) => s.mergeDown);
  const flatten = useEditor((s) => s.flatten);
  const moveLayer = useEditor((s) => s.moveLayer);
  const toggleVisible = useEditor((s) => s.toggleLayerVisible);
  const toggleLocked = useEditor((s) => s.toggleLayerLocked);
  const setLayerOpacity = useEditor((s) => s.setLayerOpacity);
  const setLayerBlend = useEditor((s) => s.setLayerBlend);
  const renameLayer = useEditor((s) => s.renameLayer);
  const beginHistory = useEditor((s) => s.beginHistory);
  const commit = useEditor((s) => s.commit);

  if (!doc) return null;
  const activeId = doc.activeLayerId;
  // top-most layer shown first
  const layers = [...doc.layers].reverse();
  const activeIndex = layers.findIndex((l) => l.id === activeId);

  return (
    <div className="flex flex-col h-full">
      {/* Active layer controls */}
      <div className="p-3 border-b border-border space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Blend Mode
          </span>
        </div>
        <Select
          value={doc.layers.find((l) => l.id === activeId)?.blendMode ?? "source-over"}
          onValueChange={(v) => activeId && setLayerBlend(activeId, v)}
          disabled={!activeId}
        >
          <SelectTrigger className="h-7 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BLEND_MODES.map((b) => (
              <SelectItem key={b.id} value={b.id} className="text-[11px]">
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Opacity
            </span>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {Math.round(
                (doc.layers.find((l) => l.id === activeId)?.opacity ?? 1) * 100,
              )}
              %
            </span>
          </div>
          <Slider
            value={[
              (doc.layers.find((l) => l.id === activeId)?.opacity ?? 1) * 100,
            ]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => activeId && setLayerOpacity(activeId, v / 100)}
            onValueCommit={() => {
              if (activeId) {
                beginHistory("Set Opacity");
                commit();
              }
            }}
            disabled={!activeId}
            className="mt-2"
          />
        </div>
      </div>

      {/* Layer stack */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-2 py-1.5 flex items-center justify-between sticky top-0 bg-panel z-10 border-b border-border">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground pl-1">
            Layers · {layers.length}
          </span>
        </div>
        <ul className="py-1">
          {layers.map((layer, i) => (
            <LayerRow
              key={layer.id}
              layer={layer}
              active={layer.id === activeId}
              renderToken={renderToken}
              onSelect={() => setActiveLayer(layer.id)}
              onToggleVisible={() => toggleVisible(layer.id)}
              onToggleLocked={() => toggleLocked(layer.id)}
              onRename={(name) => renameLayer(layer.id, name)}
              onMoveUp={() => moveLayer(layer.id, "up")}
              onMoveDown={() => moveLayer(layer.id, "down")}
              canMoveUp={i > 0}
              canMoveDown={i < layers.length - 1}
            />
          ))}
        </ul>
      </div>

      {/* Action bar */}
      <div className="border-t border-border p-1.5 flex items-center gap-0.5 shrink-0">
        <PanelButton title="New layer (Ctrl+Shift+N)" onClick={() => addLayer()}>
          <PlusIcon className="w-4 h-4" />
        </PanelButton>
        <PanelButton
          title="Duplicate layer"
          onClick={() => activeId && duplicateLayer(activeId)}
          disabled={!activeId}
        >
          <DuplicateIcon className="w-4 h-4" />
        </PanelButton>
        <PanelButton
          title="Merge down"
          onClick={() => activeId && mergeDown(activeId)}
          disabled={activeIndex === layers.length - 1}
        >
          <MergeDownIcon className="w-4 h-4" />
        </PanelButton>
        <PanelButton
          title="Flatten all"
          onClick={flatten}
          disabled={layers.length < 2}
        >
          <FlattenIcon className="w-4 h-4" />
        </PanelButton>
        <Separator orientation="vertical" className="h-5 mx-0.5" />
        <PanelButton
          title="Delete layer"
          onClick={() => activeId && removeLayer(activeId)}
          disabled={layers.length <= 1}
          danger
        >
          <TrashIcon className="w-4 h-4" />
        </PanelButton>
      </div>
    </div>
  );
}

function PanelButton({
  children,
  title,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          title={title}
          onClick={onClick}
          disabled={disabled}
          className={`flex-1 h-8 grid place-items-center rounded-[2px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
            danger
              ? "text-muted-foreground hover:text-[oklch(0.7_0.2_25)] hover:bg-[oklch(0.3_0.08_25)]"
              : "text-muted-foreground hover:text-foreground hover:bg-tool-hover"
          }`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {title}
      </TooltipContent>
    </Tooltip>
  );
}

function LayerRow({
  layer,
  active,
  renderToken,
  onSelect,
  onToggleVisible,
  onToggleLocked,
  onRename,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  layer: Layer;
  active: boolean;
  renderToken: number;
  onSelect: () => void;
  onToggleVisible: () => void;
  onToggleLocked: () => void;
  onRename: (name: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(layer.name);
  const thumbRef = useRef<HTMLCanvasElement>(null);

  const startEditing = () => {
    setDraft(layer.name);
    setEditing(true);
  };

  // render thumbnail whenever renderToken changes (doc re-rendered)
  useEffect(() => {
    const c = thumbRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    // checkerboard
    const s = 6;
    for (let y = 0; y < c.height; y += s) {
      for (let x = 0; x < c.width; x += s) {
        ctx.fillStyle = ((x / s + y / s) | 0) % 2 ? "#2a2a32" : "#222228";
        ctx.fillRect(x, y, s, s);
      }
    }
    const ratio = layer.canvas.width / layer.canvas.height;
    let tw = c.width;
    let th = c.height;
    if (ratio > 1) th = c.width / ratio;
    else tw = c.height * ratio;
    ctx.drawImage(
      layer.canvas,
      (c.width - tw) / 2,
      (c.height - th) / 2,
      tw,
      th,
    );
  }, [layer, renderToken]);

  return (
    <li
      onClick={onSelect}
      className={`group flex items-center gap-1.5 px-1.5 py-1 mx-1 my-0.5 rounded-[2px] cursor-pointer transition-colors ${
        active
          ? "bg-accent-amber/15 ring-1 ring-inset ring-accent-amber/40"
          : "hover:bg-accent"
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisible();
        }}
        className="w-5 h-5 grid place-items-center text-muted-foreground hover:text-foreground shrink-0"
        title={layer.visible ? "Hide" : "Show"}
      >
        {layer.visible ? <EyeIcon className="w-3.5 h-3.5" /> : <EyeOffIcon className="w-3.5 h-3.5" />}
      </button>

      <canvas
        ref={thumbRef}
        width={36}
        height={28}
        className="rounded-[2px] border border-border shrink-0"
      />

      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              onRename(draft.trim() || layer.name);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRename(draft.trim() || layer.name);
                setEditing(false);
              } else if (e.key === "Escape") {
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-background border border-accent-amber/50 px-1 py-0 text-[11px] rounded-[1px] outline-none"
          />
        ) : (
          <button
            onDoubleClick={startEditing}
            className="block w-full text-left text-[11px] truncate"
            title="Double-click to rename"
          >
            {layer.name}
          </button>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleLocked();
        }}
        className={`w-5 h-5 grid place-items-center shrink-0 ${
          layer.locked ? "text-accent-amber" : "text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
        }`}
        title={layer.locked ? "Unlock" : "Lock"}
      >
        {layer.locked ? <LockIcon className="w-3.5 h-3.5" /> : <UnlockIcon className="w-3.5 h-3.5" />}
      </button>
    </li>
  );
}
