"use client";

/**
 * TopBar — application chrome: logo, file menu, undo/redo, view,
 * and primary export / new actions.
 */
import { useCallback } from "react";
import { useEditor } from "@/lib/store/editor-store";
import {
  DownloadIcon,
  GitHubIcon,
  NewFileIcon,
  RedoIcon,
  ResetIcon,
  UndoIcon,
} from "./icons";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ImportButton } from "./ImportButton";

const openNew = () => window.dispatchEvent(new CustomEvent("pf:new-doc"));
const openExport = () => window.dispatchEvent(new CustomEvent("pf:export"));

export function TopBar() {
  const doc = useEditor((s) => s.doc);
  const docName = useEditor((s) => s.docName);
  const history = useEditor((s) => s.history);
  const view = useEditor((s) => s.view);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const zoomIn = useEditor((s) => s.zoomIn);
  const zoomOut = useEditor((s) => s.zoomOut);
  const fitToScreen = useEditor((s) => s.fitToScreen);
  const actualSize = useEditor((s) => s.actualSize);

  const handleFit = useCallback(() => {
    const el = document.getElementById("pf-stage");
    if (el) fitToScreen(el.clientWidth, el.clientHeight);
  }, [fitToScreen]);

  const canUndo = history.cursor > 0;
  const canRedo = history.cursor < history.entries.length - 1;

  return (
    <header className="flex items-center gap-1 h-11 px-2 border-b border-border bg-panel shrink-0 select-none">
      {/* Brand */}
      <div className="flex items-center gap-2 px-2">
        <div className="w-6 h-6 grid place-items-center bg-accent-amber text-accent-amber-foreground rounded-[2px] shadow-sm">
          <span className="text-[11px] font-bold tracking-tighter">PF</span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[12px] font-semibold tracking-tight">
            Pixel Forge
          </span>
          <span className="text-[9px] text-muted-foreground tracking-widest uppercase">
            offline editor
          </span>
        </div>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={openNew}
          >
            <NewFileIcon className="w-4 h-4" />
            <span className="hidden sm:inline">New</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">New document (Ctrl+N)</TooltipContent>
      </Tooltip>

      <ImportButton />

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!canUndo}
            onClick={() => undo()}
          >
            <UndoIcon className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Undo (Ctrl+Z)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!canRedo}
            onClick={() => redo()}
          >
            <RedoIcon className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Redo (Ctrl+Shift+Z)</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="h-8 w-7 text-xs" onClick={zoomOut}>
          −
        </Button>
        <button
          onClick={actualSize}
          className="h-8 px-2 text-[11px] tabular-nums text-muted-foreground hover:text-foreground hover:bg-accent rounded-[2px] transition-colors min-w-[3.5rem]"
          title="Actual size (Ctrl+0)"
        >
          {Math.round(view.zoom * 100)}%
        </button>
        <Button variant="ghost" size="icon" className="h-8 w-7 text-xs" onClick={zoomIn}>
          +
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleFit}
            >
              <ResetIcon className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Fit to screen (Ctrl+0)</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Document name */}
      <div className="hidden md:flex items-center gap-1.5 px-2 text-[11px] text-muted-foreground min-w-0">
        <span className="truncate max-w-[14rem]">
          {doc ? docName : "No document"}
        </span>
        {doc && (
          <span className="text-muted-foreground/60">
            · {doc.width}×{doc.height}
          </span>
        )}
      </div>

      <div className="flex-1" />

      {/* Right side actions */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className="h-8 gap-1.5 bg-accent-amber text-accent-amber-foreground hover:bg-accent-amber/90"
            disabled={!doc}
            onClick={openExport}
          >
            <DownloadIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Export image (Ctrl+E)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-[2px] transition-colors"
            aria-label="View on GitHub"
          >
            <GitHubIcon className="w-4 h-4" />
          </a>
        </TooltipTrigger>
        <TooltipContent side="bottom">Open source on GitHub</TooltipContent>
      </Tooltip>

    </header>
  );
}
