const IMAGEKIT_ENDPOINT = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT as
  | string
  | undefined;

export type ImageTransformOptions = {
  w?: number;
  h?: number;
  q?: number;
  f?: "auto" | "avif" | "webp" | "jpg" | "png";
  fo?: "center" | "top" | "bottom" | "left" | "right" | "auto";
};

export const IMAGE_PRESETS = {
  hero: { w: 1920, q: 78, f: "auto", fo: "center" } as const,
  card: { w: 800, q: 80, f: "auto", fo: "center" } as const,
  thumb: { w: 300, q: 80, f: "auto" } as const,
  logo: { w: 280, q: 85, f: "auto" } as const,
  lightbox: { q: 82, f: "auto" } as const,
  gallery: { w: 600, q: 80, f: "auto" } as const,
} satisfies Record<string, ImageTransformOptions>;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

function buildTransformString(opts: ImageTransformOptions): string {
  const parts: string[] = [];
  if (opts.w) parts.push(`w-${opts.w}`);
  if (opts.h) parts.push(`h-${opts.h}`);
  if (opts.q) parts.push(`q-${opts.q}`);
  if (opts.f) parts.push(`f-${opts.f}`);
  if (opts.fo) parts.push(`fo-${opts.fo}`);
  return parts.join(",");
}

function isAbsoluteUrl(src: string): boolean {
  return src.startsWith("http://") || src.startsWith("https://");
}

function supabasePublicUrlToFolderPath(src: string): string | null {
  // If your ImageKit origin is configured as a "Web Folder" pointing to:
  //   https://<project>.supabase.co/storage/v1/object/public/
  // then the folder path should be:
  //   <bucket>/<path>
  //
  // Example:
  //   src: https://<project>.supabase.co/storage/v1/object/public/case-covers/covers/a.jpg
  //   ->   case-covers/covers/a.jpg
  try {
    const u = new URL(src);
    const marker = "/storage/v1/object/public/";
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    const rest = u.pathname.slice(idx + marker.length).replace(/^\/+/, "");
    return rest.length > 0 ? rest : null;
  } catch {
    return null;
  }
}

export function getImageKitUrl(
  src: string,
  options: ImageTransformOptions = {},
): string {
  // Only proxy absolute URLs through ImageKit (web proxy / fetch).
  // Relative paths (local assets) should remain untouched.
  if (!IMAGEKIT_ENDPOINT || !isAbsoluteUrl(src)) return src;

  const tr = buildTransformString(options);
  const base = IMAGEKIT_ENDPOINT.replace(/\/$/, "");

  // Prefer "Web Folder" style for Supabase public URLs, because
  // some setups/accounts return 404 with absolute URL web-proxy fetch.
  const folderPath = supabasePublicUrlToFolderPath(src);
  if (folderPath) return tr ? `${base}/tr:${tr}/${folderPath}` : `${base}/${folderPath}`;

  // Fallback to absolute URL fetch (web proxy).
  return tr ? `${base}/tr:${tr}/${src}` : `${base}/${src}`;
}

export function getResponsiveSrcset(
  src: string,
  options: ImageTransformOptions = {},
  widths: number[] = [],
): string {
  if (!IMAGEKIT_ENDPOINT || !isAbsoluteUrl(src) || widths.length === 0)
    return "";

  return widths
    .map((w) => {
      const url = getImageKitUrl(src, { ...options, w });
      return `${url} ${w}w`;
    })
    .join(", ");
}
