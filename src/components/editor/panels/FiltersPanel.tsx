"use client";

/**
 * FiltersPanel — one-click filter presets + destructive pixel filters.
 *
 * Presets (left) tweak the non-destructive `LayerFilters` so they
 * remain adjustable afterwards. Destructive filters (right) bake
 * pixel effects (sharpen, posterize, edges…) directly into the
 * active layer's canvas — each one pushes a history entry.
 */
import { useState } from "react";
import { useEditor } from "@/lib/store/editor-store";
import { FILTER_PRESETS } from "@/lib/editor/constants";
import {
  DESTRUCTIVE_FILTERS,
  type DestructiveFilterDef,
} from "@/lib/editor/filter-engine";
import { getActiveLayer } from "@/lib/editor/layer-manager";
import { Slider } from "@/components/ui/slider";
import { SparkIcon, WandIcon } from "../icons";
import { toast } from "sonner";

export function FiltersPanel() {
  const doc = useEditor((s) => s.doc);
  const applyPreset = useEditor((s) => s.applyFilterPreset);
  const beginHistory = useEditor((s) => s.beginHistory);
  const commit = useEditor((s) => s.commit);
  const requestRender = useEditor((s) => s.requestRender);

  const [activeId, setActiveId] = useState<string>(DESTRUCTIVE_FILTERS[0].id);
  const def: DestructiveFilterDef =
    DESTRUCTIVE_FILTERS.find((d) => d.id === activeId) ?? DESTRUCTIVE_FILTERS[0];
  const [param, setParam] = useState<number>(def.paramDefault ?? 1);

  if (!doc) return null;
  const active = doc.layers.find((l) => l.id === doc.activeLayerId);

  const runDestructive = () => {
    if (!active) {
      toast.error("No active layer");
      return;
    }
    if (active.locked) {
      toast.error("Layer is locked");
      return;
    }
    beginHistory(def.name);
    def.run(active, param);
    commit();
    requestRender();
    toast.success(`${def.name} applied`, {
      description: active.name,
    });
  };

  const presetsByCategory = (cat: string) =>
    FILTER_PRESETS.filter((p) => p.category === cat);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <SparkIcon className="w-3.5 h-3.5 text-accent-amber" />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Filter Presets
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Presets */}
        <div className="p-3 space-y-3 border-b border-border">
          {["color", "blur", "sharpen", "stylize"].map((cat) => {
            const items = presetsByCategory(cat);
            if (items.length === 0) return null;
            const label =
              cat === "color" ? "Color" : cat === "blur" ? "Blur" : cat === "sharpen" ? "Sharpen" : "Stylize";
            return (
              <div key={cat}>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                  {label}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {items.map((p) => {
                    const isActive =
                      active &&
                      Object.entries(p.apply(active.filters)).every(
                        ([k, v]) => (active.filters as Record<string, number>)[k] === v,
                      );
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          if (!active) {
                            toast.error("No active layer");
                            return;
                          }
                          applyPreset(active.id, p.apply);
                          toast.success(p.name);
                        }}
                        className={`px-2 py-1.5 text-[11px] border rounded-[2px] transition-colors ${
                          isActive
                            ? "border-accent-amber bg-accent-amber/10 text-foreground"
                            : "border-border text-muted-foreground hover:text-foreground hover:bg-accent hover:border-accent-amber/40"
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Destructive filters */}
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <WandIcon className="w-3.5 h-3.5 text-accent-amber" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Destructive
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1">
            {DESTRUCTIVE_FILTERS.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setActiveId(d.id);
                  setParam(d.paramDefault ?? 1);
                }}
                className={`px-2 py-1.5 text-[11px] border rounded-[2px] transition-colors text-left ${
                  activeId === d.id
                    ? "border-accent-amber bg-accent-amber/10"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>

          {def.paramLabel && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-muted-foreground">{def.paramLabel}</span>
                <span className="text-[11px] tabular-nums">
                  {def.step && def.step < 1 ? param.toFixed(2) : Math.round(param)}
                </span>
              </div>
              <Slider
                value={[param]}
                min={def.paramMin}
                max={def.paramMax}
                step={def.paramStep}
                onValueChange={([v]) => setParam(v)}
                className="mt-1"
              />
            </div>
          )}

          <button
            onClick={runDestructive}
            disabled={!active || active.locked}
            className="w-full h-8 text-[11px] bg-accent-amber text-accent-amber-foreground hover:bg-accent-amber/90 disabled:opacity-40 rounded-[2px] transition-colors"
          >
            Apply {def.name}
          </button>

          {active && active.locked && (
            <p className="text-[10px] text-[oklch(0.7_0.2_25)]">
              Unlock the active layer to apply destructive filters.
            </p>
          )}
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Destructive filters bake into the layer's pixels and push a new
            history entry. Use Undo (Ctrl+Z) to revert.
          </p>
        </div>
      </div>
    </div>
  );
}
