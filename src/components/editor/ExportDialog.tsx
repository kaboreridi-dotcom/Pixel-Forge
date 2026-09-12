"use client";

/**
 * ExportDialog — bake the document to a blob and download it.
 * Format, quality, scale, transparency/flatten toggles.
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useEditor } from "@/lib/store/editor-store";
import type { ExportFormat } from "@/lib/editor/types";
import { formatBytes } from "@/lib/utils/image-utils";
import { toast } from "sonner";

export function ExportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* DialogContent mounts fresh on each open, so the inner form's
          useState initializes from current docName automatically. */}
      <ExportForm onDone={() => onOpenChange(false)} />
    </Dialog>
  );
}

function ExportForm({ onDone }: { onDone: () => void }) {
  const doc = useEditor((s) => s.doc);
  const docName = useEditor((s) => s.docName);
  const exportImage = useEditor((s) => s.exportImage);
  const exporting = useEditor((s) => s.exporting);

  const [format, setFormat] = useState<ExportFormat>("png");
  const [quality, setQuality] = useState(0.9);
  const [scale, setScale] = useState(1);
  const [transparent, setTransparent] = useState(true);
  const [flatten, setFlatten] = useState(true);
  const [filename, setFilename] = useState(docName || "untitled");

  const handleExport = async () => {
    if (!doc) return;
    const blob = await exportImage({
      format,
      quality,
      scale,
      transparent: format !== "jpeg" && transparent,
      flatten,
    });
    if (!blob) {
      toast.error("Export failed");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename || "untitled"}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported .${format}`, {
      description: `${doc.width * scale}×${doc.height * scale} · ${formatBytes(blob.size)}`,
    });
    onDone();
  };

  const outW = doc ? Math.round(doc.width * scale) : 0;
  const outH = doc ? Math.round(doc.height * scale) : 0;

  return (
    <DialogContent className="max-w-[440px] bg-panel border-border">
        <DialogHeader>
          <DialogTitle className="text-sm tracking-tight">Export Image</DialogTitle>
          <DialogDescription className="text-xs">
            Rendered locally and downloaded directly. Nothing is uploaded.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Filename
            </Label>
            <Input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="h-8 text-xs"
              placeholder="untitled"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Format
              </Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG — lossless</SelectItem>
                  <SelectItem value="jpeg">JPEG — compressed</SelectItem>
                  <SelectItem value="webp">WebP — modern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Scale ({scale}×)
              </Label>
              <Slider
                value={[scale]}
                min={0.25}
                max={4}
                step={0.25}
                onValueChange={([v]) => setScale(v)}
                className="mt-3"
              />
            </div>
          </div>

          {format !== "png" && (
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Quality — {Math.round(quality * 100)}%
              </Label>
              <Slider
                value={[quality]}
                min={0.1}
                max={1}
                step={0.05}
                onValueChange={([v]) => setQuality(v)}
                className="mt-3"
              />
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={flatten}
                onCheckedChange={(v) => setFlatten(!!v)}
              />
              <span>Flatten layers (recommended for export)</span>
            </label>
            <label
              className={`flex items-center gap-2 text-xs ${
                format === "jpeg" ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <Checkbox
                checked={transparent}
                disabled={format === "jpeg"}
                onCheckedChange={(v) => setTransparent(!!v)}
              />
              <span>Preserve transparency {format === "jpeg" && "(not supported by JPEG)"}</span>
            </label>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1 pt-1 border-t border-border">
            <span>Output</span>
            <span className="tabular-nums">
              {outW}×{outH}px
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onDone}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-accent-amber text-accent-amber-foreground hover:bg-accent-amber/90"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? "Rendering…" : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
  );
}
