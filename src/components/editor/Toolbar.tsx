"use client";

/**
 * Toolbar — vertical strip of tool buttons grouped by function,
 * plus the primary/secondary color swatches with swap & reset.
 *
 * Deliberately dense (no labels by default; tooltip on hover).
 */
import { useEditor } from "@/lib/store/editor-store";
import { TOOLS } from "@/lib/editor/constants";
import { TOOL_ICONS, ResetIcon, SwapIcon } from "./icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import type { ToolId } from "@/lib/editor/types";

const GROUPS: ToolId[][] = [
  ["move", "hand", "zoom"],
  ["select-rect", "select-lasso", "eyedropper"],
  ["brush", "eraser", "fill"],
  ["shape-rect", "shape-ellipse", "shape-line"],
  ["text"],
];

export function Toolbar() {
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  const primary = useEditor((s) => s.primaryColor);
  const secondary = useEditor((s) => s.secondaryColor);
  const setPrimary = useEditor((s) => s.setPrimaryColor);
  const setSecondary = useEditor((s) => s.setSecondaryColor);
  const swap = useEditor((s) => s.swapColors);
  const reset = useEditor((s) => s.resetColors);

  return (
    <aside className="w-12 shrink-0 border-r border-border bg-panel flex flex-col items-center py-2 gap-1 select-none">
      {GROUPS.map((group, gi) => (
        <div key={gi} className="flex flex-col items-center gap-0.5">
          {gi > 0 && <Separator className="w-6 my-1.5" />}
          {group.map((id) => {
            const def = TOOLS.find((t) => t.id === id)!;
            const Icon = TOOL_ICONS[id];
            const active = tool === id;
            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setTool(id)}
                    aria-pressed={active}
                    aria-label={def.label}
                    className={`group relative w-9 h-9 grid place-items-center rounded-[2px] transition-colors ${
                      active
                        ? "bg-accent-amber text-accent-amber-foreground shadow-[inset_0_0_0_1px_oklch(0.78_0.16_75)]"
                        : "text-muted-foreground hover:text-foreground hover:bg-tool-hover"
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    {active && (
                      <span className="absolute left-[-3px] top-1/2 -translate-y-1/2 w-[2px] h-5 bg-accent-amber rounded-r" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  <span className="font-medium">{def.label}</span>
                  <span className="ml-2 text-muted-foreground uppercase tracking-wider text-[10px]">
                    {def.shortcut}
                  </span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      ))}

      <div className="flex-1" />

      {/* Color swatches */}
      <div className="relative w-9 h-9 mb-1">
        <label
          className="absolute top-0 left-0 w-6 h-6 rounded-[2px] border border-black/60 shadow-md cursor-pointer checkerboard"
          style={{ background: secondary }}
          title="Background color"
        >
          <input
            type="color"
            value={secondary}
            onChange={(e) => setSecondary(e.target.value)}
            className="opacity-0 w-full h-full cursor-pointer"
          />
        </label>
        <label
          className="absolute bottom-0 right-0 w-6 h-6 rounded-[2px] border border-black/60 shadow-md cursor-pointer checkerboard"
          style={{ background: primary }}
          title="Foreground color"
        >
          <input
            type="color"
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            className="opacity-0 w-full h-full cursor-pointer"
          />
        </label>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={swap}
            className="w-9 h-7 grid place-items-center rounded-[2px] text-muted-foreground hover:text-foreground hover:bg-tool-hover"
            aria-label="Swap colors"
          >
            <SwapIcon className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          Swap colors <span className="ml-2 text-muted-foreground text-[10px] uppercase">X</span>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={reset}
            className="w-9 h-7 grid place-items-center rounded-[2px] text-muted-foreground hover:text-foreground hover:bg-tool-hover"
            aria-label="Reset colors"
          >
            <ResetIcon className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">Reset to defaults</TooltipContent>
      </Tooltip>
    </aside>
  );
}
