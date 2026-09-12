/**
 * Pixel Forge — Custom tool icons.
 *
 * Hand-crafted SVG paths. Deliberately not pulled from a stock icon
 * set so the toolbar reads as bespoke rather than templated.
 * Each icon is a 20×20 stroke glyph on a transparent box.
 */
import type { SVGProps } from "react";
import type { ToolId } from "@/lib/editor/types";

type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const MoveIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3v18M3 12h18" />
    <path d="M12 3l-3 3M12 3l3 3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3M12 21l-3-3M12 21l3-3" />
  </svg>
);

export const HandIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M11 11V4.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M14 11V6.5a1.5 1.5 0 0 1 3 0V13" />
    <path d="M17 11.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.5a5 5 0 0 1-4-2L5 14.5a1.5 1.5 0 0 1 2-2L8 13.5" />
  </svg>
);

export const ZoomIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M11 8.5v5M8.5 11h5M21 21l-5-5" />
  </svg>
);

export const RectSelectIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M5 5h2M5 5v2M5 19h2M5 19v-2M19 5h-2M19 5v2M19 19h-2M19 19v-2" />
    <rect x="5" y="5" width="14" height="14" strokeDasharray="3 2" opacity="0.55" />
  </svg>
);

export const LassoIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M7 18c-3 0-4-4-2-7s7-4 10-2 3 8-1 9" />
    <path d="M9 18c0 1.5 1 3 3 3" />
  </svg>
);

export const EyedropperIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M18.5 5.5a2.12 2.12 0 0 0-3 0L9 12l-2.5 5.5L12 15l6.5-6.5a2.12 2.12 0 0 0 0-3z" />
    <path d="M9 12l3 3" />
  </svg>
);

export const BrushIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M14 4l6 6-9 9-3-3 6-12z" opacity="0.9" />
    <path d="M9.5 13.5L13 17" />
    <path d="M5 19c1.5 0 2.5-1 2.5-2.5S6 14 5 15s-1 4-1 4 0.5 0 1 0z" />
  </svg>
);

export const EraserIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M15 4l5 5-9 9H6l-3-3 9-9z" />
    <path d="M9 9l5 5M4 18h9" />
  </svg>
);

export const FillIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M5 11l7-7 7 7-7 7-7-7z" />
    <path d="M19 16c0 1.5-1 3-2.5 3S14 17.5 14 16s2.5-4 2.5-4 2.5 2.5 2.5 4z" />
  </svg>
);

export const RectShapeIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="4.5" y="6.5" width="15" height="11" rx="0.5" />
  </svg>
);

export const EllipseShapeIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <ellipse cx="12" cy="12" rx="8" ry="6" />
  </svg>
);

export const LineIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M5 19L19 5" />
    <circle cx="5" cy="19" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="19" cy="5" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const TextIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M5 6h14M12 6v13M9 19h6" />
  </svg>
);

export const TOOL_ICONS: Record<ToolId, (p: IconProps) => React.JSX.Element> = {
  move: MoveIcon,
  hand: HandIcon,
  zoom: ZoomIcon,
  "select-rect": RectSelectIcon,
  "select-lasso": LassoIcon,
  eyedropper: EyedropperIcon,
  brush: BrushIcon,
  eraser: EraserIcon,
  fill: FillIcon,
  "shape-rect": RectShapeIcon,
  "shape-ellipse": EllipseShapeIcon,
  "shape-line": LineIcon,
  text: TextIcon,
};

/* UI glyphs */

export const UndoIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M9 7L4 12l5 5" />
    <path d="M4 12h11a5 5 0 0 1 0 10h-1" />
  </svg>
);

export const RedoIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M15 7l5 5-5 5" />
    <path d="M20 12H9a5 5 0 0 0 0 10h1" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const TrashIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </svg>
);

export const DuplicateIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="8" y="8" width="12" height="12" rx="1" />
    <path d="M16 4H4v12" />
  </svg>
);

export const MergeDownIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 4v10M8 11l4 4 4-4" />
    <path d="M5 19h14" />
  </svg>
);

export const FlattenIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="4" y="4" width="16" height="16" rx="1" />
    <path d="M4 12h16" opacity="0.5" />
  </svg>
);

export const EyeIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
);

export const EyeOffIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M2 12s4-7 10-7c2 0 3.5 0.8 5 1.8M22 12s-4 7-10 7c-2 0-3.5-0.8-5-1.8" />
    <path d="M3 3l18 18" />
  </svg>
);

export const LockIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="5" y="11" width="14" height="9" rx="1.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export const UnlockIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="5" y="11" width="14" height="9" rx="1.5" />
    <path d="M8 11V8a4 4 0 0 1 7-2.8" />
  </svg>
);

export const ChevronUpIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 15l6-6 6 6" />
  </svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const SwapIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M7 4L3 8l4 4" />
    <path d="M3 8h14M17 20l4-4-4-4" />
    <path d="M21 16H7" />
  </svg>
);

export const ResetIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4" />
  </svg>
);

export const DownloadIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3v12M7 11l5 4 5-4M5 21h14" />
  </svg>
);

export const UploadIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 17V5M7 9l5-4 5 4M5 21h14" />
  </svg>
);

export const NewFileIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 3h8l4 4v14H6z" />
    <path d="M14 3v4h4" />
  </svg>
);

export const SparkIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" />
  </svg>
);

export const LayersIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 4l9 5-9 5-9-5 9-5z" />
    <path d="M3 12l9 5 9-5M3 15l9 5 9-5" opacity="0.6" />
  </svg>
);

export const SlidersIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M5 4v6M5 14v6M12 4v3M12 13v7M19 4v9M19 17v3" />
    <circle cx="5" cy="10" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="15" r="2" />
  </svg>
);

export const WandIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 20L16 8M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2zM6 12l0.5 1.2L8 14l-1.5 0.8L6 16l-0.5-1.2L4 14l1.5-0.8L6 12z" />
  </svg>
);

export const DropIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" />
  </svg>
);

export const GridIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="4" y="4" width="6" height="6" />
    <rect x="14" y="4" width="6" height="6" />
    <rect x="4" y="14" width="6" height="6" />
    <rect x="14" y="14" width="6" height="6" />
  </svg>
);

export const GitHubIcon = (p: IconProps) => (
  <svg {...base} {...p} strokeWidth={1.4}>
    <path d="M9 19c-4 1.5-4-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.5 3.1 5.5 3.1a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
  </svg>
);
