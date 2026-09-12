"use client";

/**
 * NewDocumentDialog — create a fresh blank canvas.
 * Presets + custom dimensions + optional background fill.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEditor } from "@/lib/store/editor-store";
import { MAX_DOC_DIMENSION, MIN_DOC_DIMENSION } from "@/lib/editor/constants";
import { clamp } from "@/lib/utils/image-utils";

const PRESETS = [
  { name: "Web Banner", w: 1920, h: 600 },
  { name: "Square Post", w: 1080, h: 1080 },
  { name: "Instagram Story", w: 1080, h: 1920 },
  { name: "HD 1080p", w: 1920, h: 1080 },
  { name: "4K UHD", w: 3840, h: 2160 },
  { name: "Sketchpad", w: 1200, h: 900 },
  { name: "Icon 512", w: 512, h: 512 },
  { name: "A4 @ 96dpi", w: 794, h: 1123 },
];

const BGS = [
  { name: "White", hex: "#ffffff" },
  { name: "Black", hex: "#1c1c22" },
  { name: "Amber", hex: "#e8b14a" },
  { name: "Transparent", hex: "" },
];

export function NewDocumentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* DialogContent only mounts when open, so the inner form's
          useState re-initializes fresh on each open — no reset effect. */}
      <NewDocumentForm onDone={() => onOpenChange(false)} />
    </Dialog>
  );
}

function NewDocumentForm({ onDone }: { onDone: () => void }) {
  const newDocument = useEditor((s) => s.newDocument);
  const [w, setW] = useState(1280);
  const [h, setH] = useState(800);
  const [bg, setBg] = useState("#ffffff");

  const handleCreate = () => {
    const cw = clamp(Math.round(w) || 800, MIN_DOC_DIMENSION, MAX_DOC_DIMENSION);
    const ch = clamp(Math.round(h) || 800, MIN_DOC_DIMENSION, MAX_DOC_DIMENSION);
    newDocument(cw, ch, bg || undefined);
    onDone();
  };

  return (
    <DialogContent className="max-w-[460px] bg-panel border-border">
        <DialogHeader>
          <DialogTitle className="text-sm tracking-tight">
            New Document
          </DialogTitle>
          <DialogDescription className="text-xs">
            Choose a preset or set custom dimensions. Everything runs
            locally — no upload, no account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 block">
              Presets
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => {
                    setW(p.w);
                    setH(p.h);
                  }}
                  className="group flex items-center justify-between px-2.5 py-1.5 text-[11px] border border-border hover:border-accent-amber/60 hover:bg-accent rounded-[2px] transition-colors"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-muted-foreground tabular-nums text-[10px]">
                    {p.w}×{p.h}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nd-w" className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Width (px)
              </Label>
              <Input
                id="nd-w"
                type="number"
                value={w}
                min={MIN_DOC_DIMENSION}
                max={MAX_DOC_DIMENSION}
                onChange={(e) => setW(Number(e.target.value))}
                className="h-8 text-xs tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nd-h" className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Height (px)
              </Label>
              <Input
                id="nd-h"
                type="number"
                value={h}
                min={MIN_DOC_DIMENSION}
                max={MAX_DOC_DIMENSION}
                onChange={(e) => setH(Number(e.target.value))}
                className="h-8 text-xs tabular-nums"
              />
            </div>
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 block">
              Background
            </Label>
            <div className="flex gap-1.5">
              {BGS.map((b) => (
                <button
                  key={b.name}
                  onClick={() => setBg(b.hex)}
                  className={`flex-1 flex items-center gap-2 px-2 py-1.5 border rounded-[2px] text-[11px] transition-colors ${
                    bg === b.hex
                      ? "border-accent-amber bg-accent"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-[1px] border border-black/30 checkerboard"
                    style={b.hex ? { background: b.hex } : undefined}
                  />
                  <span className="truncate">{b.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onDone}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-accent-amber text-accent-amber-foreground hover:bg-accent-amber/90"
            onClick={handleCreate}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
  );
}
