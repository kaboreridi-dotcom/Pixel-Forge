"use client";

/**
 * ImportButton — accepts image files via file picker or drag-drop.
 * Supports png, jpeg, webp, bmp, gif. Each import becomes the base
 * layer of a fresh document sized to the image.
 */
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UploadIcon } from "./icons";
import { useEditor } from "@/lib/store/editor-store";
import { fileToImage } from "@/lib/utils/image-utils";
import { toast } from "sonner";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/bmp", "image/gif"];

export function ImportButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const importImage = useEditor((s) => s.importImage);
  const setView = useEditor((s) => s.setView);
  const doc = useEditor((s) => s.doc);

  // listen to global "open" command from keyboard shortcuts
  useEffect(() => {
    const onOpen = () => inputRef.current?.click();
    window.addEventListener("pf:open", onOpen);
    return () => window.removeEventListener("pf:open", onOpen);
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!ACCEPTED.includes(file.type)) {
        toast.error("Unsupported file type", {
          description: `Pixel Forge accepts PNG, JPEG, WebP, BMP, GIF. Got ${file.type || "unknown"}.`,
        });
        return;
      }
      try {
        const img = await fileToImage(file);
        const name = file.name.replace(/\.[^.]+$/, "") || "Imported";
        importImage(img, name);
        toast.success(`Imported ${file.name}`, {
          description: `${img.naturalWidth}×${img.naturalHeight} px`,
        });
        // fit after the doc mounts
        requestAnimationFrame(() => {
          const el = document.getElementById("pf-stage");
          if (el) {
            const pad = 64;
            const z = Math.min(
              (el.clientWidth - pad) / img.naturalWidth,
              (el.clientHeight - pad) / img.naturalHeight,
            );
            const zoom = Math.max(0.05, Math.min(4, z));
            setView({
              zoom,
              panX: (el.clientWidth - img.naturalWidth * zoom) / 2,
              panY: (el.clientHeight - img.naturalHeight * zoom) / 2,
            });
          }
        });
      } catch (err) {
        console.error(err);
        toast.error("Could not read image", {
          description: "The file may be corrupted or unsupported.",
        });
      }
    },
    [importImage, setView],
  );

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => inputRef.current?.click()}
          >
            <UploadIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Open</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Open image (Ctrl+O)</TooltipContent>
      </Tooltip>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );
}
