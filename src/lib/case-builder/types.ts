// ── Content types (live inside container slots) ─────────────────────

export type ContentBlockType = "image" | "text" | "video" | "title" | "button";
export type TextAlign = "left" | "center";
export type VideoProvider = "youtube" | "vimeo" | "file" | "mux";
export type VideoAspect = "16/9" | "9/16" | "1/1" | "original";

export type ImageContent = {
  url: string;
  alt: string;
  cover?: boolean;
  aspect?: ImageAspect;
  widthDesktop?: ImageWidthMode;
  widthMobile?: ImageWidthMode;
  borderStyle?: ImageBorderStyle;
  /** When borderStyle === "solid": border color (hex). */
  borderColor?: string;
  /** When borderStyle === "solid": border width in px. */
  borderWidth?: number;
  radius?: number;
  padding?: Partial<ImagePadding>;
  /** Zoom on hover (0 = off, 5–20 = percentage scale, e.g. 10 → scale 1.1) */
  zoom?: number;
};

export type ImageAspect = "auto" | "1/1" | "16/9" | "9/16";
export type ImageWidthMode = "fit" | "fill";
export type ImageBorderStyle = "none" | "solid";
export type ImagePadding = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type TextWidthMode = "auto" | "fill";
export type TextMaxWidth = "normal" | "wide" | "full";
export type TextPreset = "body" | "title_1";
export type TextColorRole = "text" | "title" | "link";
export type TextFormat = "plain" | "rich";

export type TextPadding = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type TextColors = Partial<Record<TextColorRole, string>>;

export type TextContent = {
  /**
   * Backward-compatible plain text value.
   * When `format === "rich"`, `html` is used for rendering,
   * and `body` may be kept as a readable fallback.
   */
  body: string;
  align: TextAlign;

  // Rich text (optional).
  format?: TextFormat;
  html?: string;

  // Inspector properties (optional; defaults handled in UI/render).
  widthMode?: TextWidthMode;
  maxWidth?: TextMaxWidth;
  preset?: TextPreset;
  colorRole?: TextColorRole;
  colors?: TextColors;
  background?: boolean;
  padding?: Partial<TextPadding>;
};

export type VideoContent = {
  url: string;
  /**
   * UI hint: where the user picked this from.
   * - uploaded: selected from Media Library (Mux/file)
   * - external: pasted URL (YouTube/Vimeo/file URL)
   */
  source?: VideoSource;
  provider: VideoProvider;
  aspect: VideoAspect;
  muxPlaybackId?: string;
  autoplay?: boolean;
  controls?: boolean;
  loop?: boolean;

  // Inspector properties (optional; defaults handled in UI/render).
  widthDesktopPct?: number; // 0..100
  widthMobilePct?: number; // 0..100
  borderStyle?: VideoBorderStyle;
  borderColor?: string; // hex #rrggbb
  borderWidth?: number; // px
  borderOpacity?: number; // 0..100
  radius?: number; // px
  padding?: Partial<VideoPadding>;
};

export type VideoSource = "uploaded" | "external";
export type VideoBorderStyle = "none" | "solid";
export type VideoPadding = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type TitlePreset = "title_1" | "title_2" | "title_3";
export type TitleContent = {
  text: string;
  align?: TextAlign;
  preset?: TitlePreset;
  color?: string;
  padding?: Partial<TextPadding>;
};

export type ButtonVariant = "primary" | "secondary" | "outline";
export type ButtonContent = {
  label: string;
  href: string;
  align?: TextAlign;
  variant?: ButtonVariant;
  padding?: Partial<TextPadding>;
};

export type ContentBlockContentMap = {
  image: ImageContent;
  text: TextContent;
  video: VideoContent;
  title: TitleContent;
  button: ButtonContent;
};

// ── Slot (one content block or empty) ───────────────────────────────

export type SlotContent = {
  /**
   * Local-stable key for UI lists / DnD.
   * Persisted in JSON content (safe to ignore server-side).
   */
  _key?: string;
  type: ContentBlockType;
  content: ContentBlockContentMap[ContentBlockType];
  /**
   * Optional label for the sidebar tree (e.g. "Hero", "Imagem destaque").
   */
  name?: string;
};

// ── Top-level block types ───────────────────────────────────────────

export type ContainerColumns = 1 | 2 | 3 | 4;

// New model: each column holds a vertical list of content items.
// Backward-compat: older data stored a single SlotContent (or null) per column.
export type ContainerColumnItems = SlotContent[];

export type ContainerContent = {
  /**
   * Optional human-friendly label for the block (used in the builder sidebar).
   * Persisted in JSON content.
   */
  name?: string;
  columns: ContainerColumns;
  slots: ContainerColumnItems[]; // one array per column
  /** Background color (CSS color or hex). */
  backgroundColor?: string | null;
  /** Padding (px) around the container. */
  padding?: Partial<TextPadding>;
};

export type SpacerHeight = "sm" | "md" | "lg";

export type SpacerContent = {
  /**
   * Optional human-friendly label for the block (used in the builder sidebar).
   * Persisted in JSON content.
   */
  name?: string;
  height: SpacerHeight;
};

export type BlockType = "container" | "spacer";

export type BlockContentMap = {
  container: ContainerContent;
  spacer: SpacerContent;
};

// ── DB / Draft shapes ───────────────────────────────────────────────

export type CaseBlock = {
  id: string;
  case_id: string;
  type: BlockType;
  content: BlockContentMap[BlockType];
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DraftBlock = {
  _key: string;
  id: string | null;
  type: BlockType;
  content: BlockContentMap[BlockType];
  sort_order: number;
};

// ── Defaults ────────────────────────────────────────────────────────

export const DEFAULT_SLOT_CONTENT: Record<ContentBlockType, ContentBlockContentMap[ContentBlockType]> = {
  image: {
    url: "",
    alt: "",
    cover: false,
    aspect: "auto",
    widthDesktop: "fill",
    widthMobile: "fill",
    borderStyle: "none",
    radius: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  },
  text: {
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    align: "left",
    format: "plain",
    html: "",
    widthMode: "auto",
    maxWidth: "normal",
    preset: "body",
    colorRole: "text",
    colors: {},
    background: false,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  },
  video: {
    url: "",
    provider: "youtube",
    aspect: "16/9",
    autoplay: false,
    controls: true,
    loop: false,
    source: "uploaded",
    widthDesktopPct: 100,
    widthMobilePct: 100,
    borderStyle: "none",
    borderColor: "#000000",
    borderWidth: 1,
    borderOpacity: 100,
    radius: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  },
  title: {
    text: "Título",
    align: "left",
    preset: "title_1",
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  },
  button: {
    label: "Botão",
    href: "#",
    align: "left",
    variant: "primary",
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  },
};

export function createContainerContent(columns: ContainerColumns): ContainerContent {
  return {
    columns,
    slots: Array.from({ length: columns }, () => []),
  };
}

export const DEFAULT_SPACER_CONTENT: SpacerContent = { height: "md" };

export function normalizeContainerContent(input: any): ContainerContent {
  const columns: ContainerColumns =
    input?.columns === 1 || input?.columns === 2 || input?.columns === 3 || input?.columns === 4
      ? input.columns
      : 1;

  const rawSlots: any[] = Array.isArray(input?.slots) ? input.slots : [];
  const slots: ContainerColumnItems[] = Array.from({ length: columns }, (_, i) => {
    const v = rawSlots[i];
    if (!v) return [];
    if (Array.isArray(v)) return (v as SlotContent[]).filter(Boolean);
    // old shape: SlotContent
    return [v as SlotContent].filter(Boolean);
  });

  const pad = input?.padding;
  const clampPx = (v: unknown, min: number, max: number) =>
    Math.max(min, Math.min(max, Number(v ?? 0)));
  const padding =
    pad && (pad.top != null || pad.bottom != null || pad.left != null || pad.right != null)
      ? {
          top: clampPx(pad.top, 0, 240),
          bottom: clampPx(pad.bottom, 0, 240),
          left: clampPx(pad.left, 0, 240),
          right: clampPx(pad.right, 0, 240),
        }
      : undefined;

  return {
    columns,
    slots,
    name: input?.name,
    backgroundColor: input?.backgroundColor ?? undefined,
    padding,
  };
}
