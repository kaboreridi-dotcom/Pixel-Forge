"use client";

/**
 * AdjustPanel — non-destructive per-layer color adjustments.
 *
 * These map directly to the CSS `filter` property applied at
 * composite time (see CanvasEngine.drawLayer). Moving a slider
 * updates the layer's `filters` object and triggers a re-render;
 * committing to history happens on pointer-up.
 */
import { useEditor } from "@/lib/store/editor-store";
import { DEFAULT_LAYER_FILTERS } from "@/lib/editor/types";
import type { LayerFilters } from "@/lib/editor/types";
import { Slider } from "@/components/ui/slider";
import { ResetIcon } from "../icons";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AdjustRow {
  key: keyof LayerFilters;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

const ROWS: AdjustRow[] = [
  { key: "brightness", label: "Brightness", min: -100, max: 100, step: 1 },
  { key: "contrast", label: "Contrast", min: -100, max: 100, step: 1 },
  { key: "saturation", label: "Saturation", min: -100, max: 100, step: 1 },
  { key: "hue", label: "Hue", min: -180, max: 180, step: 1, unit: "°" },
  { key: "blur", label: "Blur", min: 0, max: 50, step: 0.5, unit: "px" },
  { key: "grayscale", label: "Grayscale", min: 0, max: 100, step: 1, unit: "%" },
  { key: "sepia", label: "Sepia", min: 0, max: 100, step: 1, unit: "%" },
  { key: "invert", label: "Invert", min: 0, max: 100, step: 1, unit: "%" },
];

export function AdjustPanel() {
  const doc = useEditor((s) => s.doc);
  const setLayerFilters = useEditor((s) => s.setLayerFilters);
  const beginHistory = useEditor((s) => s.beginHistory);
  const commit = useEditor((s) => s.commit);
  const requestRender = useEditor((s) => s.requestRender);

  if (!doc) return null;
  const active = doc.layers.find((l) => l.id === doc.activeLayerId);
  if (!active) {
    return (
      <div className="flex-1 grid place-items-center p-6 text-center text-xs text-muted-foreground">
        Select a layer to adjust.
      </div>
    );
  }

  const f = active.filters;

  const update = (patch: Partial<LayerFilters>, label: string) => {
    beginHistory(label);
    setLayerFilters(active.id, { ...f, ...patch });
    requestRender();
  };

  const finalize = () => commit();

  const reset = () => {
    beginHistory("Reset Adjustments");
    setLayerFilters(active.id, { ...DEFAULT_LAYER_FILTERS });
    commit();
    requestRender();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Adjustments
          </span>
          <span className="text-[11px] truncate">{active.name}</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={reset}
            >
              <ResetIcon className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">Reset all</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {ROWS.map((row) => {
          const val = f[row.key];
          const display =
            row.step < 1 ? val.toFixed(1) : Math.round(val).toString();
          return (
            <div key={row.key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-muted-foreground">{row.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] tabular-nums w-10 text-right">
                    {display}
                    {row.unit ?? ""}
                  </span>
                  <button
                    onClick={() => update({ [row.key]: DEFAULT_LAYER_FILTERS[row.key] }, `Reset ${row.label}`)}
                    className="text-muted-foreground/50 hover:text-foreground text-[9px]"
                    title="Reset"
                  >
                    ⟲
                  </button>
                </div>
              </div>
              <Slider
                value={[val]}
                min={row.min}
                max={row.max}
                step={row.step}
                onValueChange={([v]) => update({ [row.key]: v }, row.label)}
                onValueCommit={() => finalize()}
                className="mt-1"
              />
            </div>
          );
        })}
      </div>

      <div className="border-t border-border p-2 shrink-0">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Adjustments are non-destructive and live-applied at composite time.
          Export bakes them into the final pixels.
        </p>
      </div>
    </div>
  );
}
