"use client";

/**
 * RightPanel — tabbed inspector on the right side.
 * Tabs: Layers (stack + per-layer props), Adjust (non-destructive
 * layer adjustments), Filters (presets + destructive effects).
 */
import { useEditor } from "@/lib/store/editor-store";
import { LayersPanel } from "./panels/LayersPanel";
import { AdjustPanel } from "./panels/AdjustPanel";
import { FiltersPanel } from "./panels/FiltersPanel";
import { LayersIcon, SlidersIcon, WandIcon } from "./icons";
import { Separator } from "@/components/ui/separator";

type Tab = "layers" | "adjust" | "filters";

const TABS: { id: Tab; label: string; icon: (p: { className?: string }) => React.JSX.Element }[] = [
  { id: "layers", label: "Layers", icon: LayersIcon },
  { id: "adjust", label: "Adjust", icon: SlidersIcon },
  { id: "filters", label: "Filters", icon: WandIcon },
];

export function RightPanel() {
  const rightPanel = useEditor((s) => s.rightPanel);
  const setRightPanel = useEditor((s) => s.setRightPanel);
  const doc = useEditor((s) => s.doc);

  return (
    <aside className="w-[300px] shrink-0 border-l border-border bg-panel flex flex-col h-full">
      {/* Tab strip */}
      <div className="flex items-stretch border-b border-border shrink-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = rightPanel === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setRightPanel(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 text-[11px] tracking-wide transition-colors relative ${
                active
                  ? "text-foreground bg-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent-amber" />
              )}
            </button>
          );
        })}
      </div>

      <Separator className="hidden" />

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {!doc ? (
          <div className="flex-1 grid place-items-center p-6 text-center text-xs text-muted-foreground">
            Create or open a document to access layer controls.
          </div>
        ) : rightPanel === "layers" ? (
          <LayersPanel />
        ) : rightPanel === "adjust" ? (
          <AdjustPanel />
        ) : (
          <FiltersPanel />
        )}
      </div>
    </aside>
  );
}
