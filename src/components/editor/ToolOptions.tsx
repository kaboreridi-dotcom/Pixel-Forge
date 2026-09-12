"use client";

/**
 * ToolOptions — a thin contextual bar under the TopBar.
 *
 * Shows the controls relevant to the currently active tool:
 * brush/eraser → size, opacity, hardness, spacing, flow, smoothing
 * shapes       → fill mode, stroke width
 * text         → font, size, weight, align
 * fill         → tolerance, contiguity
 * selection    → info + clear / select-all buttons
 * eyedropper   → current color
 */
import { useEditor } from "@/lib/store/editor-store";
import { FONT_FAMILIES } from "@/lib/editor/constants";
import type { ToolId } from "@/lib/editor/types";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TOOLS } from "@/lib/editor/constants";
import { DropIcon } from "./icons";

export function ToolOptions() {
  const tool = useEditor((s) => s.tool);
  const def = TOOLS.find((t) => t.id === tool)!;
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);

  const clearSelection = useEditor((s) => s.clearSelection);
  const selectAll = useEditor((s) => s.selectAll);

  const active = doc?.layers.find((l) => l.id === doc.activeLayerId);
  const lockedHint = active?.locked ? " (layer locked)" : "";

  return (
    <div className="flex items-center gap-3 h-9 px-3 border-b border-border bg-panel shrink-0 overflow-x-auto select-none">
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] uppercase tracking-widest text-accent-amber">
          {def.label}
        </span>
        {active && (
          <span className="text-[10px] text-muted-foreground hidden md:inline">
            · {active.name}
            {lockedHint}
          </span>
        )}
      </div>

      <Separator orientation="vertical" className="h-5 shrink-0" />

      <div className="flex items-center gap-3 min-w-0">
        {tool === "brush" || tool === "eraser" ? (
          <BrushOptions />
        ) : tool.startsWith("shape-") ? (
          <ShapeOptions />
        ) : tool === "text" ? (
          <TextOptions />
        ) : tool === "fill" ? (
          <FillOptions />
        ) : tool === "select-rect" || tool === "select-lasso" ? (
          <div className="flex items-center gap-2">
            {selection ? (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {selection.width}×{selection.height} @ ({selection.x}, {selection.y})
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">
                Drag to select · Esc to deselect
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={selectAll}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={clearSelection}
              disabled={!selection}
            >
              Deselect
            </Button>
          </div>
        ) : tool === "eyedropper" ? (
          <EyedropperOptions />
        ) : tool === "zoom" ? (
          <span className="text-[10px] text-muted-foreground">
            Click to zoom in · Alt+Click to zoom out
          </span>
        ) : tool === "hand" ? (
          <span className="text-[10px] text-muted-foreground">
            Drag to pan · Hold Space for temporary pan
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">
            {doc ? `${doc.width}×${doc.height}px` : ""}
          </span>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">
      {children}
    </span>
  );
}

function BrushOptions() {
  const brush = useEditor((s) => s.brush);
  const setBrush = useEditor((s) => s.setBrush);
  return (
    <div className="flex items-center gap-4">
      <Field label="Size" value={`${Math.round(brush.size)}px`} width="w-28">
        <Slider
          value={[brush.size]}
          min={1}
          max={400}
          step={1}
          onValueChange={([v]) => setBrush({ size: v })}
          className="mt-2.5"
        />
      </Field>
      <Field label="Opacity" value={`${Math.round(brush.opacity * 100)}%`} width="w-24">
        <Slider
          value={[brush.opacity * 100]}
          min={1}
          max={100}
          step={1}
          onValueChange={([v]) => setBrush({ opacity: v / 100 })}
          className="mt-2.5"
        />
      </Field>
      <Field label="Hardness" value={`${Math.round(brush.hardness * 100)}%`} width="w-24">
        <Slider
          value={[brush.hardness * 100]}
          min={0}
          max={100}
          step={1}
          onValueChange={([v]) => setBrush({ hardness: v / 100 })}
          className="mt-2.5"
        />
      </Field>
      <Field label="Flow" value={`${Math.round(brush.flow * 100)}%`} width="w-24">
        <Slider
          value={[brush.flow * 100]}
          min={1}
          max={100}
          step={1}
          onValueChange={([v]) => setBrush({ flow: v / 100 })}
          className="mt-2.5"
        />
      </Field>
      <Field label="Smoothing" value={`${Math.round(brush.smoothing * 100)}%`} width="w-24">
        <Slider
          value={[brush.smoothing * 100]}
          min={0}
          max={100}
          step={5}
          onValueChange={([v]) => setBrush({ smoothing: v / 100 })}
          className="mt-2.5"
        />
      </Field>
    </div>
  );
}

function ShapeOptions() {
  const shape = useEditor((s) => s.shape);
  const setShape = useEditor((s) => s.setShape);
  const modes: { id: typeof shape.fillMode; label: string }[] = [
    { id: "stroke", label: "Outline" },
    { id: "fill", label: "Fill" },
    { id: "both", label: "Both" },
  ];
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setShape({ fillMode: m.id })}
            className={`px-2 h-6 text-[10px] rounded-[2px] transition-colors ${
              shape.fillMode === m.id
                ? "bg-accent-amber text-accent-amber-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <Field label="Stroke" value={`${shape.strokeWidth}px`} width="w-28">
        <Slider
          value={[shape.strokeWidth]}
          min={1}
          max={100}
          step={1}
          onValueChange={([v]) => setShape({ strokeWidth: v })}
          className="mt-2.5"
        />
      </Field>
    </div>
  );
}

function TextOptions() {
  const text = useEditor((s) => s.text);
  const setText = useEditor((s) => s.setText);
  const aligns: CanvasTextAlign[] = ["left", "center", "right"];
  return (
    <div className="flex items-center gap-3">
      <Select
        value={text.fontFamily}
        onValueChange={(v) => setText({ fontFamily: v })}
      >
        <SelectTrigger className="h-7 w-44 text-[11px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_FAMILIES.map((f) => (
            <SelectItem key={f} value={f} className="text-[11px]">
              {f.split(",")[0]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Field label="Size" value={`${Math.round(text.fontSize)}px`} width="w-28">
        <Slider
          value={[text.fontSize]}
          min={6}
          max={400}
          step={1}
          onValueChange={([v]) => setText({ fontSize: v })}
          className="mt-2.5"
        />
      </Field>
      <button
        onClick={() => setText({ bold: !text.bold })}
        className={`w-7 h-7 grid place-items-center text-[11px] font-bold rounded-[2px] ${
          text.bold ? "bg-accent-amber text-accent-amber-foreground" : "hover:bg-accent"
        }`}
      >
        B
      </button>
      <button
        onClick={() => setText({ italic: !text.italic })}
        className={`w-7 h-7 grid place-items-center text-[11px] italic rounded-[2px] ${
          text.italic ? "bg-accent-amber text-accent-amber-foreground" : "hover:bg-accent"
        }`}
      >
        I
      </button>
      <div className="flex items-center gap-0.5">
        {aligns.map((a) => (
          <button
            key={a}
            onClick={() => setText({ align: a })}
            className={`px-1.5 h-7 text-[9px] uppercase rounded-[2px] ${
              text.align === a ? "bg-accent-amber text-accent-amber-foreground" : "hover:bg-accent text-muted-foreground"
            }`}
          >
            {a.slice(0, 1)}
          </button>
        ))}
      </div>
    </div>
  );
}

function FillOptions() {
  const fill = useEditor((s) => s.fill);
  const setFill = useEditor((s) => s.setFill);
  return (
    <div className="flex items-center gap-3">
      <Field label="Tolerance" value={String(Math.round(fill.tolerance))} width="w-28">
        <Slider
          value={[fill.tolerance]}
          min={0}
          max={100}
          step={1}
          onValueChange={([v]) => setFill({ tolerance: v })}
          className="mt-2.5"
        />
      </Field>
      <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={fill.contiguous}
          onChange={(e) => setFill({ contiguous: e.target.checked })}
          className="accent-accent-amber"
        />
        Contiguous
      </label>
    </div>
  );
}

function EyedropperOptions() {
  const primary = useEditor((s) => s.primaryColor);
  return (
    <div className="flex items-center gap-2">
      <DropIcon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-[10px] text-muted-foreground">Sampled:</span>
      <span
        className="w-5 h-5 rounded-[2px] border border-black/50"
        style={{ background: primary }}
      />
      <span className="text-[10px] font-mono uppercase">{primary}</span>
      <span className="text-[10px] text-muted-foreground ml-2">
        Click to set foreground · Right-click for background
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  width,
  children,
}: {
  label: string;
  value: string;
  width?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`shrink-0 ${width ?? "w-32"}`}>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-[10px] tabular-nums text-muted-foreground">{value}</span>
      </div>
      {children}
    </div>
  );
}
