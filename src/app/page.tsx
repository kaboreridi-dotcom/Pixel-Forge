"use client";

/**
 * Pixel Forge — main editor shell.
 *
 * Assembles the full application chrome:
 *   ┌───────────────────────────────────────────┐
 *   │ TopBar                                    │
 *   ├───────────────────────────────────────────┤
 *   │ ToolOptions                               │
 *   ├─────┬─────────────────────────────┬───────┤
 *   │Tool │ CanvasStage                 │ Right │
 *   │ bar │                             │ Panel │
 *   ├─────┴─────────────────────────────┴───────┤
 *   │ StatusBar                                 │
 *   └───────────────────────────────────────────┘
 *
 * The shell also routes global keyboard "command" events
 * (pf:new-doc / pf:open / pf:export) emitted by the shortcuts
 * hook into dialog open states. The ImportButton (rendered inside
 * TopBar) listens for `pf:open` itself and opens its file picker.
 */
import { useEffect, useState } from "react";
import { TopBar } from "@/components/editor/TopBar";
import { ToolOptions } from "@/components/editor/ToolOptions";
import { Toolbar } from "@/components/editor/Toolbar";
import { CanvasStage } from "@/components/editor/CanvasStage";
import { RightPanel } from "@/components/editor/RightPanel";
import { StatusBar } from "@/components/editor/StatusBar";
import { NewDocumentDialog } from "@/components/editor/NewDocumentDialog";
import { ExportDialog } from "@/components/editor/ExportDialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEditor } from "@/lib/store/editor-store";

export default function Home() {
  const [newOpen, setNewOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const doc = useEditor((s) => s.doc);

  // Boot: create a starter canvas so the app is immediately usable.
  useEffect(() => {
    if (!useEditor.getState().doc) {
      useEditor.getState().newDocument(1280, 800, "#ffffff");
    }
  }, []);

  // listen to global command events from keyboard shortcuts
  useEffect(() => {
    const onNew = () => setNewOpen(true);
    const onExport = () => doc && setExportOpen(true);
    window.addEventListener("pf:new-doc", onNew);
    window.addEventListener("pf:export", onExport);
    return () => {
      window.removeEventListener("pf:new-doc", onNew);
      window.removeEventListener("pf:export", onExport);
    };
  }, [doc]);

  return (
    <TooltipProvider delayDuration={250}>
      <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
        <TopBar />
        <ToolOptions />
        <div className="flex-1 min-h-0 flex">
          <Toolbar />
          <CanvasStage />
          <RightPanel />
        </div>
        <StatusBar />

        {/* Shared dialogs (also opened from TopBar but kept here so
            keyboard shortcuts can trigger them). */}
        <NewDocumentDialog open={newOpen} onOpenChange={setNewOpen} />
        <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      </div>
    </TooltipProvider>
  );
}

