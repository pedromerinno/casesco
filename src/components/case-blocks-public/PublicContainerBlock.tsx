import type {
  ContainerContent,
  SlotContent,
  ContainerColumnItems,
  ImageContent,
  TextContent,
  VideoContent,
  TitleContent,
  ButtonContent,
} from "@/lib/case-builder/types";
import { normalizeContainerContent } from "@/lib/case-builder/types";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { cn } from "@/lib/utils";
import PublicImageBlock from "./PublicImageBlock";
import PublicTextBlock from "./PublicTextBlock";
import PublicVideoBlock from "./PublicVideoBlock";
import PublicTitleBlock from "./PublicTitleBlock";
import PublicButtonBlock from "./PublicButtonBlock";

export type PreviewHoverTarget =
  | { blockId: string }
  | { blockId: string; columnIndex: number; itemIndex: number };

function ItemRenderer({ item, accentColor }: { item: SlotContent; accentColor?: string }) {
  switch (item.type) {
    case "image":
      return <PublicImageBlock content={item.content as ImageContent} />;
    case "text":
      return <PublicTextBlock content={item.content as TextContent} />;
    case "video":
      return <PublicVideoBlock content={item.content as VideoContent} accentColor={accentColor} />;
    case "title":
      return <PublicTitleBlock content={item.content as TitleContent} />;
    case "button":
      return <PublicButtonBlock content={item.content as ButtonContent} />;
    default:
      return null;
  }
}

type Props = {
  content: ContainerContent;
  accentColor?: string;
  interactive?: {
    blockId: string;
    onHover: (target: PreviewHoverTarget) => void;
    active: PreviewHoverTarget | null;
  };
};

function clampPadding(p: ContainerContent["padding"]) {
  if (!p) return undefined;
  return {
    top: Math.max(0, Number(p.top ?? 0)),
    bottom: Math.max(0, Number(p.bottom ?? 0)),
    left: Math.max(0, Number(p.left ?? 0)),
    right: Math.max(0, Number(p.right ?? 0)),
  };
}

export default function PublicContainerBlock({ content, accentColor, interactive }: Props) {
  const c = normalizeContainerContent(content);
  const bgColor = c.backgroundColor?.trim?.() || undefined;
  const padding = clampPadding(c.padding);
  return (
    <div
      className="public-container-block grid"
      style={{
        gridTemplateColumns: `repeat(${c.columns}, 1fr)`,
        gridAutoRows: "min-content",
        gap: 0,
        rowGap: 0,
        columnGap: 0,
        fontSize: 0,
        lineHeight: 0,
        ...(bgColor ? { backgroundColor: bgColor } : {}),
        ...(padding
          ? {
              paddingTop: padding.top,
              paddingBottom: padding.bottom,
              paddingLeft: padding.left,
              paddingRight: padding.right,
            }
          : {}),
      }}
    >
      {c.slots.map((items: ContainerColumnItems, colIdx) => {
        const coverIndex = items.findIndex(
          (it) =>
            it?.type === "image" &&
            Boolean((it.content as ImageContent | undefined)?.cover),
        );
        const coverItem = coverIndex >= 0 ? (items[coverIndex] as SlotContent) : undefined;

        const rest = items
          .map((it, originalIndex) => ({ it, originalIndex }))
          .filter(({ it, originalIndex }) => Boolean(it) && originalIndex !== coverIndex) as Array<{
          it: SlotContent;
          originalIndex: number;
        }>;

        const hasOnlyCover = Boolean(coverItem) && rest.length === 0;

        return (
          <div
            key={colIdx}
            className={[
              "relative min-h-0",
              hasOnlyCover ? "min-h-[60vh]" : "",
            ].join(" ")}
          >
            {coverItem ? (
              <OptimizedImage
                src={
                  String((coverItem.content as ImageContent).url || "") ||
                  "/image-fallback.svg"
                }
                alt={(coverItem.content as ImageContent).alt || ""}
                preset="gallery"
                widths={[640, 960, 1280, 1920]}
                sizes="50vw"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : null}

            <div className={cn(coverItem ? "relative z-10" : "", "flex flex-col gap-0")}>
              {/* If this column is cover-only, allow selecting it by hover */}
              {interactive && hasOnlyCover && coverIndex >= 0 ? (
                <div
                  className={cn(
                    "absolute inset-0 z-10",
                    "transition-shadow",
                    "hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 hover:ring-offset-background",
                    interactive.active?.blockId === interactive.blockId &&
                      "columnIndex" in interactive.active &&
                      interactive.active.columnIndex === colIdx &&
                      interactive.active.itemIndex === coverIndex
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "",
                  )}
                  onMouseEnter={() =>
                    interactive.onHover({
                      blockId: interactive.blockId,
                      columnIndex: colIdx,
                      itemIndex: coverIndex,
                    })
                  }
                />
              ) : null}

              {rest.map(({ it: item, originalIndex }, itemIdx) => {
                const prev = rest[itemIdx - 1]?.it;
                const sameType = prev?.type === item.type;
                const mt =
                  itemIdx === 0
                    ? ""
                    : sameType
                      ? "mt-0"
                      : "mt-4";
                const isActive =
                  Boolean(interactive) &&
                  interactive!.active?.blockId === interactive!.blockId &&
                  "columnIndex" in (interactive!.active ?? {}) &&
                  (interactive!.active as any).columnIndex === colIdx &&
                  (interactive!.active as any).itemIndex === originalIndex;
                return (
                  <div
                    key={originalIndex}
                    className={cn(
                      mt,
                      "min-h-0 leading-none",
                      "[&>*]:my-0 [&>*]:min-h-0 [&>*]:leading-none", // no margin/min-height/line-gap from block content
                      interactive
                        ? cn(
                            "relative cursor-pointer transition-shadow",
                            "hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 hover:ring-offset-background",
                          )
                        : "",
                      isActive
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "",
                    )}
                    onMouseEnter={
                      interactive
                        ? () =>
                            interactive.onHover({
                              blockId: interactive.blockId,
                              columnIndex: colIdx,
                              itemIndex: originalIndex,
                            })
                        : undefined
                    }
                  >
                    <ItemRenderer item={item} accentColor={accentColor} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
