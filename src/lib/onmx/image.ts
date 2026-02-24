// ── Supabase Image Transformation ────────────────────────────
// Uses Supabase's native /render/image/ endpoint to resize and
// optimise images on the fly. No external service needed.
//
// Docs: https://supabase.com/docs/guides/storage/serving/image-transformations

export type ImageTransformOptions = {
  w?: number;
  h?: number;
  q?: number;
  f?: "origin" | "avif" | "webp";
  resize?: "cover" | "contain" | "fill";
};

export const IMAGE_PRESETS = {
  hero: { w: 1920, q: 78 } as const,
  card: { w: 800, q: 80 } as const,
  thumb: { w: 300, q: 80 } as const,
  logo: { w: 280, q: 85 } as const,
  lightbox: { q: 82 } as const,
  gallery: { w: 600, q: 80 } as const,
} satisfies Record<string, ImageTransformOptions>;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

// ── Helpers ──────────────────────────────────────────────────

const OBJECT_PUBLIC = "/storage/v1/object/public/";
const RENDER_IMAGE = "/storage/v1/render/image/public/";

function isSupabasePublicUrl(src: string): boolean {
  return src.includes(OBJECT_PUBLIC);
}

function toRenderUrl(src: string, opts: ImageTransformOptions): string {
  // Replace /object/public/ → /render/image/public/ and append query params.
  const base = src.replace(OBJECT_PUBLIC, RENDER_IMAGE);
  const params = new URLSearchParams();
  if (opts.w) params.set("width", String(opts.w));
  if (opts.h) params.set("height", String(opts.h));
  if (opts.q) params.set("quality", String(opts.q));
  if (opts.f) params.set("format", opts.f);
  // Supabase defaults to crop when only width or height is set.
  // Use "contain" to scale proportionally unless explicitly overridden.
  params.set("resize", opts.resize ?? "contain");
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

// ── Public API (same signatures as before) ───────────────────

export function getOptimizedUrl(
  src: string,
  options: ImageTransformOptions = {},
): string {
  if (!isSupabasePublicUrl(src)) return src;
  const hasTransform = options.w || options.h || options.q || options.f || options.resize;
  if (!hasTransform) return src;
  return toRenderUrl(src, options);
}

export function getResponsiveSrcset(
  src: string,
  options: ImageTransformOptions = {},
  widths: number[] = [],
): string {
  if (!isSupabasePublicUrl(src) || widths.length === 0) return "";

  return widths
    .map((w) => {
      const url = getOptimizedUrl(src, { ...options, w });
      return `${url} ${w}w`;
    })
    .join(", ");
}
