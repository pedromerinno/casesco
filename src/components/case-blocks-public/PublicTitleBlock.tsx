import type { TitleContent, TitlePreset } from "@/lib/case-builder/types";
import { cn } from "@/lib/utils";

type Props = { content: TitleContent };

function clampPadding(p: Partial<{ top: number; bottom: number; left: number; right: number }> | undefined) {
  return {
    top: Math.max(0, Number(p?.top ?? 0)),
    bottom: Math.max(0, Number(p?.bottom ?? 0)),
    left: Math.max(0, Number(p?.left ?? 0)),
    right: Math.max(0, Number(p?.right ?? 0)),
  };
}

const PRESET_CLASS: Record<TitlePreset, string> = {
  title_1: "text-3xl md:text-4xl font-semibold tracking-tight leading-[1.08]",
  title_2: "text-2xl md:text-3xl font-semibold tracking-tight leading-tight",
  title_3: "text-xl md:text-2xl font-medium tracking-tight leading-snug",
};

export default function PublicTitleBlock({ content }: Props) {
  const text = (content.text ?? "").trim();
  if (!text) return null;

  const align = content.align ?? "left";
  const preset: TitlePreset = content.preset ?? "title_1";
  const padding = clampPadding(content.padding);

  return (
    <div
      className={cn(
        "block-content-padding w-full",
        align === "center" ? "text-center" : "",
      )}
      style={{
        paddingTop: padding.top,
        paddingBottom: padding.bottom,
        paddingLeft: padding.left,
        paddingRight: padding.right,
        ...(content.color?.trim() ? { color: content.color.trim() } : {}),
      }}
    >
      <h2
        className={cn(
          "w-full",
          align === "center" ? "mx-auto" : "",
          PRESET_CLASS[preset],
        )}
      >
        {text}
      </h2>
    </div>
  );
}
