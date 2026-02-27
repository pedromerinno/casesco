import * as React from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import type { ImageContent } from "@/lib/case-builder/types";
import { cn } from "@/lib/utils";

type Props = { content: ImageContent };

export default function PublicImageBlock({ content }: Props) {
  const src = content.url?.trim?.() ? content.url : "/image-fallback.svg";

  const aspect = content.aspect ?? "auto";
  const widthMobile = content.widthMobile ?? "fill";
  const widthDesktop = content.widthDesktop ?? "fill";
  const borderStyle = content.borderStyle ?? "none";
  const borderWidth =
    borderStyle === "solid"
      ? Math.max(1, Math.min(24, Number(content.borderWidth ?? 2)))
      : 0;
  const borderColor =
    borderStyle === "solid" && content.borderColor?.trim?.()
      ? content.borderColor
      : undefined;
  const radius = Math.max(0, Math.min(80, Number(content.radius ?? 0)));
  const zoomPct = Math.max(0, Math.min(20, Number(content.zoom ?? 0)));
  const zoomScaleClass =
    zoomPct === 5
      ? "group-hover:scale-105"
      : zoomPct === 10
        ? "group-hover:scale-110"
        : zoomPct === 15
          ? "group-hover:scale-[1.15]"
          : zoomPct === 20
            ? "group-hover:scale-[1.2]"
            : "";
  const padding = {
    top: Math.max(0, Number(content.padding?.top ?? 0)),
    bottom: Math.max(0, Number(content.padding?.bottom ?? 0)),
    left: Math.max(0, Number(content.padding?.left ?? 0)),
    right: Math.max(0, Number(content.padding?.right ?? 0)),
  };

  const widthBase =
    widthMobile === "fill"
      ? "w-full max-w-none"
      : "w-full max-w-6xl mx-auto";
  const widthMd =
    widthDesktop === "fill"
      ? "md:w-full md:max-w-none md:mx-0"
      : "md:w-full md:max-w-6xl md:mx-auto";

  const chromeClass = cn(
    widthBase,
    widthMd,
    borderStyle === "solid" ? "box-border" : "",
    radius > 0 ? "overflow-hidden" : "",
  );
  const borderStyleInline: React.CSSProperties =
    borderStyle === "solid"
      ? {
          borderWidth: `${borderWidth}px`,
          borderStyle: "solid",
          borderColor: borderColor ?? "rgba(0,0,0,0.2)",
        }
      : {};

  const wrapperClass = cn(
    zoomPct > 0 && "overflow-hidden",
    zoomPct > 0 && "group",
  );
  const imageTransitionStyle: React.CSSProperties =
    zoomPct > 0 ? { transition: "transform 0.35s ease" } : {};

  return (
    <div
      className={cn("block-content-padding w-full", padding.top || padding.bottom || padding.left || padding.right ? "" : "")}
      style={{
        paddingTop: padding.top,
        paddingBottom: padding.bottom,
        paddingLeft: padding.left,
        paddingRight: padding.right,
      }}
    >
      {aspect !== "auto" ? (
        <div
          className={cn("relative", chromeClass, wrapperClass)}
          style={{
            borderRadius: radius,
            aspectRatio: aspect,
            ...borderStyleInline,
          }}
        >
          <OptimizedImage
            src={src}
            alt={content.alt || ""}
            preset="gallery"
            widths={[384, 640, 960, 1280, 1920]}
            sizes="(min-width:768px) 50vw, 100vw"
            className={cn(
              "absolute inset-0 w-full h-full object-cover",
              zoomScaleClass,
            )}
            style={imageTransitionStyle}
          />
        </div>
      ) : (
        <div
          className={cn(chromeClass, wrapperClass)}
          style={{ borderRadius: radius, ...borderStyleInline }}
        >
          <OptimizedImage
            src={src}
            alt={content.alt || ""}
            preset="gallery"
            widths={[384, 640, 960, 1280, 1920]}
            sizes="(min-width:768px) 50vw, 100vw"
            className={cn("w-full h-auto", zoomScaleClass)}
            style={imageTransitionStyle}
          />
        </div>
      )}
    </div>
  );
}
