import * as React from "react";
import type { VideoContent } from "@/lib/case-builder/types";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import VideoPlayer from "@/components/ui/VideoPlayer";

const ASPECT_MAP: Record<string, string> = {
  "16/9": "aspect-video",
  "9/16": "aspect-[9/16]",
  "1/1": "aspect-square",
  original: "",
};

/** CSS aspect-ratio value used as inline style on the player itself. */
const ASPECT_RATIO_VALUE: Record<string, string> = {
  "16/9": "16/9",
  "9/16": "9/16",
  "1/1": "1/1",
  original: "",
};

function getEmbedUrl(url: string, provider: string): string | null {
  if (provider === "youtube") {
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/,
    );
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  }
  if (provider === "vimeo") {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}` : null;
  }
  return null;
}

type Props = { content: VideoContent; accentColor?: string };

function clampPct(v: any, fallback = 100) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function clampPx(v: any, fallback = 0, max = 200) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(max, Math.round(n)));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const v = hex.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(v)) return null;
  const r = parseInt(v.slice(1, 3), 16);
  const g = parseInt(v.slice(3, 5), 16);
  const b = parseInt(v.slice(5, 7), 16);
  return { r, g, b };
}

function VideoFrame({
  content,
  children,
}: {
  content: VideoContent;
  children: React.ReactNode;
}) {
  const widthMobilePct = clampPct(content.widthMobilePct, 100);
  const widthDesktopPct = clampPct(content.widthDesktopPct, 100);

  const borderStyle = content.borderStyle ?? "none";
  const borderColor = (content.borderColor || "#000000").trim() || "#000000";
  const borderWidth = clampPx(content.borderWidth, 1, 24);
  const borderOpacity = clampPct(content.borderOpacity, 100);
  const radius = clampPx(content.radius, 0, 80);
  const padding = {
    top: clampPx(content.padding?.top, 0, 240),
    bottom: clampPx(content.padding?.bottom, 0, 240),
    left: clampPx(content.padding?.left, 0, 240),
    right: clampPx(content.padding?.right, 0, 240),
  };

  const rgb = hexToRgb(borderColor);
  const borderAlpha = borderOpacity / 100;
  const border =
    borderStyle === "solid" && borderWidth > 0 && rgb
      ? `${borderWidth}px solid rgba(${rgb.r},${rgb.g},${rgb.b},${borderAlpha.toFixed(3)})`
      : undefined;

  const needsCenter = widthMobilePct < 100 || widthDesktopPct < 100;

  return (
    <div
      className="block-content-padding block-content-padding-keep w-full"
      style={{
        paddingTop: padding.top,
        paddingBottom: padding.bottom,
        paddingLeft: padding.left,
        paddingRight: padding.right,
        fontSize: 0,
        lineHeight: 0,
      }}
    >
      <div
        className={cn("onmx-media-width", needsCenter ? "mx-auto" : "")}
        style={
          {
            ["--onmx-media-w-mobile" as any]: widthMobilePct,
            ["--onmx-media-w-desktop" as any]: widthDesktopPct,
            fontSize: 0,
            lineHeight: 0,
          } as React.CSSProperties
        }
      >
        <div style={{ borderRadius: radius, border, overflow: radius > 0 || border ? "hidden" : undefined, fontSize: 0, lineHeight: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function VideoFallback({
  aspectClass,
  label,
  content,
}: {
  aspectClass: string;
  label: string;
  content: VideoContent;
}) {
  const showPlaceholderBorder = (content.borderStyle ?? "none") !== "solid";
  return (
    <VideoFrame content={content}>
      <div
        className={cn(
          "w-full",
          "rounded-xl",
          showPlaceholderBorder ? "border border-dashed border-primary/35" : "",
          "bg-accent/20",
          "grid place-items-center",
          aspectClass,
        )}
        aria-label="Vídeo (placeholder)"
      >
        <div className="text-center space-y-2">
          <div className="mx-auto h-10 w-10 rounded-full bg-white/70 ring-1 ring-black/5 grid place-items-center">
            <Play className="h-4 w-4 text-black/60" aria-hidden="true" />
          </div>
          <div className="text-sm font-medium text-black/50">{label}</div>
        </div>
      </div>
    </VideoFrame>
  );
}

export default function PublicVideoBlock({ content, accentColor }: Props) {
  const aspectKey = content.aspect ?? "16/9";
  const aspect = ASPECT_MAP[aspectKey] ?? ASPECT_MAP["16/9"];
  const isOriginalAspect = aspectKey === "original";
  const controls = content.controls ?? true;
  const autoPlay = content.autoplay ?? false;
  const loop = content.loop ?? false;

  // Fallback: show placeholder when empty or processing.
  const hasMux = content.provider === "mux";
  const hasPlayableMux = hasMux && Boolean(content.muxPlaybackId);
  const hasUrl = Boolean(content.url?.trim?.());

  if (!hasUrl && !hasPlayableMux) {
    return (
      <VideoFallback
        aspectClass={aspect || "aspect-video"}
        label={hasMux ? "Processando vídeo…" : "Vídeo"}
        content={content}
      />
    );
  }

  if (content.provider === "mux" && content.muxPlaybackId) {
    const hlsUrl = `https://stream.mux.com/${content.muxPlaybackId}.m3u8`;
    const aspectRatio = isOriginalAspect ? undefined : (ASPECT_RATIO_VALUE[aspectKey] || "16/9");

    return (
      <VideoFrame content={content}>
        <VideoPlayer
          src={hlsUrl}
          controls={controls}
          autoPlay={autoPlay}
          muted={autoPlay || !controls}
          loop={loop}
          accentColor={accentColor}
          aspectRatio={aspectRatio}
          className="w-full h-auto"
        />
      </VideoFrame>
    );
  }

  if (content.provider === "file") {
    const fileAspectRatio = isOriginalAspect ? undefined : (ASPECT_RATIO_VALUE[aspectKey] || "16/9");

    return (
      <VideoFrame content={content}>
        <VideoPlayer
          src={content.url}
          controls={controls}
          autoPlay={autoPlay}
          muted={autoPlay || !controls}
          loop={loop}
          accentColor={accentColor}
          aspectRatio={fileAspectRatio}
          className="w-full h-auto"
        />
      </VideoFrame>
    );
  }

  const embedUrlBase = getEmbedUrl(content.url, content.provider);
  const embedUrl = (() => {
    if (!embedUrlBase) return null;

    const params = new URLSearchParams();
    if (autoPlay) {
      params.set("autoplay", "1");
      // browsers typically require muted autoplay
      params.set("mute", "1");
      params.set("muted", "1");
    }
    if (!controls) {
      params.set("controls", "0");
    }
    if (loop) {
      params.set("loop", "1");
    }

    // YouTube requires playlist=<id> for looping a single video
    if (content.provider === "youtube" && loop) {
      const idMatch = embedUrlBase.match(/\/embed\/([^?]+)/);
      const vid = idMatch?.[1];
      if (vid) params.set("playlist", vid);
    }

    const query = params.toString();
    return query ? `${embedUrlBase}?${query}` : embedUrlBase;
  })();
  if (!embedUrl) {
    return (
      <VideoFallback
        aspectClass={aspect || "aspect-video"}
        label="Vídeo"
        content={content}
      />
    );
  }

  const embedAspectRatio = isOriginalAspect ? "16/9" : (ASPECT_RATIO_VALUE[aspectKey] || "16/9");

  return (
    <VideoFrame content={content}>
      <iframe
        src={embedUrl}
        title="Video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full"
        style={{ aspectRatio: embedAspectRatio, display: "block", border: 0 }}
      />
    </VideoFrame>
  );
}
