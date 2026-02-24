import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import {
  Columns2,
  Columns3,
  Columns4,
  Copy,
  GripVertical,
  Heading as HeadingIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  Pencil,
  Square,
  Trash2,
  Type as TypeIcon,
  Video as VideoIcon,
} from "lucide-react";

import type {
  CaseBlock,
  ContainerContent,
  ContainerColumns,
  SpacerContent,
  SlotContent,
  ContainerColumnItems,
  ImageContent,
  TextContent,
  VideoContent,
  TitleContent,
  ButtonContent,
} from "@/lib/case-builder/types";
import { normalizeContainerContent } from "@/lib/case-builder/types";
import { cn } from "@/lib/utils";
import { OptimizedImage } from "@/components/ui/optimized-image";
import PublicImageBlock from "@/components/case-blocks-public/PublicImageBlock";
import PublicTextBlock from "@/components/case-blocks-public/PublicTextBlock";
import PublicVideoBlock from "@/components/case-blocks-public/PublicVideoBlock";
import PublicTitleBlock from "@/components/case-blocks-public/PublicTitleBlock";
import PublicButtonBlock from "@/components/case-blocks-public/PublicButtonBlock";
import PublicSpacerBlock from "@/components/case-blocks-public/PublicSpacerBlock";
import { PreviewDropArea } from "@/components/case-builder/PreviewDropArea";

export type PreviewTarget =
  | { blockId: string }
  | { blockId: string; columnIndex: number; itemIndex: number };

type MoveIntent = {
  from: { blockId: string; columnIndex: number; itemKey: string };
  to: {
    blockId: string;
    columnIndex: number;
    beforeItemKey: string | null; // null => append
  };
};

function ColumnDroppable({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode | ((args: { isOver: boolean }) => React.ReactNode);
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={className}>
      {typeof children === "function" ? children({ isOver }) : children}
    </div>
  );
}

function parseItemId(id: string): {
  blockId: string;
  columnIndex: number;
  itemKey: string;
} | null {
  // item:<blockId>:<colIdx>:<itemKey>
  const m = id.match(/^item:(.+):(\d+):(.+)$/);
  if (!m) return null;
  return {
    blockId: m[1],
    columnIndex: Number(m[2]),
    itemKey: m[3],
  };
}

function parseColumnId(id: string): { blockId: string; columnIndex: number } | null {
  // col:<blockId>:<colIdx>
  const m = id.match(/^col:(.+):(\d+)$/);
  if (!m) return null;
  return { blockId: m[1], columnIndex: Number(m[2]) };
}

function ItemRenderer({ item }: { item: SlotContent }) {
  switch (item.type) {
    case "image":
      return <PublicImageBlock content={item.content as ImageContent} />;
    case "text":
      return <PublicTextBlock content={item.content as TextContent} />;
    case "video":
      return <PublicVideoBlock content={item.content as VideoContent} />;
    case "title":
      return <PublicTitleBlock content={item.content as TitleContent} />;
    case "button":
      return <PublicButtonBlock content={item.content as ButtonContent} />;
    default:
      return null;
  }
}

function SortablePreviewItem({
  id,
  active,
  label,
  onHover,
  onActivate,
  onEdit,
  onDuplicate,
  onDelete,
  children,
}: {
  id: string;
  active: boolean;
  label?: string;
  onHover?: () => void;
  onActivate: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/item relative",
        "transition-shadow",
        "hover:z-[50] hover:ring-2 hover:ring-primary hover:ring-offset-0",
        active ? "z-[50] ring-2 ring-primary ring-offset-0" : "z-0",
      )}
      onMouseEnter={onHover}
      onClick={(e) => {
        e.preventDefault();
        onActivate();
      }}
    >
      {/* Nome do item (hover / selecionado) - group/item para não reagir ao group do container */}
      {label != null && label !== "" && (
        <div
          className={cn(
            "absolute left-0 -top-6 z-[60] pointer-events-none",
            "rounded-md px-2 py-1",
            "bg-primary text-primary-foreground text-[11px] font-medium",
            "opacity-0 group-hover/item:opacity-100 transition-opacity",
            active && "opacity-100",
          )}
        >
          {label}
        </div>
      )}

      {/* Drag handle */}
      <button
        type="button"
        className={cn(
          "absolute top-2 left-2 z-20",
          "h-8 w-8 rounded-full",
          "bg-background/85 backdrop-blur-md",
          "ring-1 ring-border/70 shadow-sm shadow-black/10",
          "grid place-items-center",
          "opacity-0 group-hover/item:opacity-100 transition-opacity",
          "cursor-grab active:cursor-grabbing",
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        aria-label="Reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-black/70" aria-hidden="true" />
      </button>

      {/* Actions */}
      <div className="absolute top-2 right-2 z-20 inline-flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
        <button
          type="button"
          className={cn(
            "h-8 w-8 rounded-full",
            "bg-background/85 backdrop-blur-md",
            "ring-1 ring-border/70 shadow-sm shadow-black/10",
            "grid place-items-center",
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          aria-label="Editar conteúdo"
          title="Editar"
        >
          <Pencil className="h-4 w-4 text-black/70" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={cn(
            "h-8 w-8 rounded-full",
            "bg-background/85 backdrop-blur-md",
            "ring-1 ring-border/70 shadow-sm shadow-black/10",
            "grid place-items-center",
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDuplicate();
          }}
          aria-label="Duplicar conteúdo"
          title="Duplicar"
        >
          <Copy className="h-4 w-4 text-black/70" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={cn(
            "h-8 w-8 rounded-full",
            "bg-background/85 backdrop-blur-md",
            "ring-1 ring-border/70 shadow-sm shadow-black/10",
            "grid place-items-center",
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Excluir conteúdo"
          title="Excluir"
        >
          <Trash2 className="h-4 w-4 text-black/70" aria-hidden="true" />
        </button>
      </div>

      {children}
    </div>
  );
}

type PreviewItemAction = {
  blockId: string;
  columnIndex: number;
  itemKey: string;
};

export default function BuilderPreview({
  blocks,
  active,
  onHover,
  onActivate,
  onMove,
  onDuplicateItem,
  onDeleteItem,
  onSetContainerColumns,
  onDuplicateBlock,
  onDeleteBlock,
  onOpenAddContentMenu,
  className,
  containerPadding = 0,
  containerRadius = 0,
}: {
  blocks: CaseBlock[];
  active: PreviewTarget | null;
  onHover?: (target: PreviewTarget | null) => void;
  onActivate: (target: PreviewTarget) => void;
  onMove: (intent: MoveIntent) => void;
  onDuplicateItem: (action: PreviewItemAction) => void;
  onDeleteItem: (action: PreviewItemAction) => void;
  onSetContainerColumns: (blockId: string, columns: ContainerColumns) => void;
  onDuplicateBlock: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onOpenAddContentMenu: (
    blockId: string,
    columnIndex: number,
    anchor: { top: number; left: number; right: number; bottom: number },
  ) => void;
  className?: string;
  containerPadding?: number;
  containerRadius?: number;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const [draggingId, setDraggingId] = React.useState<string | null>(null);

  function handleDragStart(e: DragStartEvent) {
    setDraggingId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId || activeId === overId) return;

    const from = parseItemId(activeId);
    if (!from) return;

    const overItem = parseItemId(overId);
    const overCol = parseColumnId(overId);
    if (overItem) {
      onMove({
        from: {
          blockId: from.blockId,
          columnIndex: from.columnIndex,
          itemKey: from.itemKey,
        },
        to: {
          blockId: overItem.blockId,
          columnIndex: overItem.columnIndex,
          beforeItemKey: overItem.itemKey,
        },
      });
      return;
    }

    if (overCol) {
      onMove({
        from: {
          blockId: from.blockId,
          columnIndex: from.columnIndex,
          itemKey: from.itemKey,
        },
        to: {
          blockId: overCol.blockId,
          columnIndex: overCol.columnIndex,
          beforeItemKey: null,
        },
      });
    }
  }

  function renderDragOverlay() {
    if (!draggingId) return null;
    const parsed = parseItemId(draggingId);
    if (!parsed) return null;

    const block = blocks.find((b) => b.id === parsed.blockId);
    if (!block || block.type !== "container") return null;

    const c = normalizeContainerContent(block.content as any);
    const col = c.slots[parsed.columnIndex] ?? [];

    let item = col.find((it) => (it as any)?._key === parsed.itemKey) as SlotContent | undefined;
    if (!item && parsed.itemKey.startsWith("idx-")) {
      const idx = Number(parsed.itemKey.replace("idx-", ""));
      const maybe = col[idx] as SlotContent | undefined;
      if (maybe) item = maybe;
    }
    if (!item) return null;

    const Icon =
      item.type === "image"
        ? ImageIcon
        : item.type === "text"
          ? TypeIcon
          : item.type === "video"
            ? VideoIcon
            : item.type === "title"
              ? HeadingIcon
              : LinkIcon;
    const label =
      item.type === "image"
        ? "Imagem"
        : item.type === "text"
          ? "Texto"
          : item.type === "video"
            ? "Vídeo"
            : item.type === "title"
              ? "Título"
              : "Botão";

    return (
      <div className="pointer-events-none rounded-xl bg-white ring-1 ring-black/10 shadow-lg px-3 py-2 text-sm font-medium flex items-center gap-2">
        <Icon className="h-4 w-4 text-black/60" aria-hidden="true" />
        {label}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn("builder-preview flex flex-col [&>div]:m-0 [&>div]:min-h-0", className)}
        style={{
          margin: 0,
          padding: containerPadding ?? 0,
          gap: 0,
        }}
        onMouseLeave={() => onHover?.(null)}
      >
        {blocks.map((block) => {
          if (block.type === "spacer") {
            return (
              <div
                key={block.id}
                className="m-0"
                onMouseEnter={() => {
                  if (draggingId) return;
                  onHover?.({ blockId: block.id });
                }}
                onClick={(e) => {
                  e.preventDefault();
                  onActivate({ blockId: block.id });
                }}
              >
                <PublicSpacerBlock content={block.content as SpacerContent} />
              </div>
            );
          }

          if (block.type !== "container") return null;

          const c = normalizeContainerContent(block.content as any);
          const radius = containerRadius ?? 0;

          return (
            <div
              key={block.id}
              className="relative group shrink-0"
              style={{
                margin: 0,
                ...(radius > 0
                  ? { borderRadius: `${radius}px`, overflow: "hidden" as const }
                  : {}),
              }}
            >
              {/* Container hover toolbar (over columns / drop areas) */}
              <div
                className={cn(
                  "absolute top-2 right-2 z-30",
                  "inline-flex items-center gap-1",
                  "opacity-0 group-hover:opacity-100 transition-opacity",
                  draggingId ? "hidden" : "",
                )}
                aria-label="Ações do container"
              >
                {(
                  [
                    { v: 1 as ContainerColumns, icon: Square, label: "1 coluna" },
                    { v: 2 as ContainerColumns, icon: Columns2, label: "2 colunas" },
                    { v: 3 as ContainerColumns, icon: Columns3, label: "3 colunas" },
                    { v: 4 as ContainerColumns, icon: Columns4, label: "4 colunas" },
                  ] as const
                ).map((opt) => {
                  const Icon = opt.icon;
                  const activeCols = c.columns === opt.v;
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      className={cn(
                        "h-8 w-8 rounded-full",
                        "bg-background/85 backdrop-blur-md",
                        "ring-1 ring-border/70 shadow-sm shadow-black/10",
                        "grid place-items-center",
                        activeCols ? "text-black" : "text-black/60 hover:text-black/75",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSetContainerColumns(block.id, opt.v);
                      }}
                      aria-label={opt.label}
                      title={opt.label}
                      aria-pressed={activeCols}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  );
                })}

                <div className="w-1" aria-hidden="true" />

                <button
                  type="button"
                  className={cn(
                    "h-8 w-8 rounded-full",
                    "bg-background/85 backdrop-blur-md",
                    "ring-1 ring-border/70 shadow-sm shadow-black/10",
                    "grid place-items-center",
                    "text-black/60 hover:text-black/75",
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDuplicateBlock(block.id);
                  }}
                  aria-label="Duplicar container"
                  title="Duplicar"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={cn(
                    "h-8 w-8 rounded-full",
                    "bg-background/85 backdrop-blur-md",
                    "ring-1 ring-border/70 shadow-sm shadow-black/10",
                    "grid place-items-center",
                    "text-destructive",
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDeleteBlock(block.id);
                  }}
                  aria-label="Excluir container"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${c.columns}, minmax(0, 1fr))`,
                  gridAutoRows: "min-content",
                  gap: 0,
                  rowGap: 0,
                  columnGap: 0,
                  margin: 0,
                  fontSize: 0,
                  lineHeight: 0,
                  ...(c.backgroundColor?.trim?.() ? { backgroundColor: c.backgroundColor } : {}),
                  ...(c.padding
                    ? {
                        paddingTop: Math.max(0, Number(c.padding.top ?? 0)),
                        paddingBottom: Math.max(0, Number(c.padding.bottom ?? 0)),
                        paddingLeft: Math.max(0, Number(c.padding.left ?? 0)),
                        paddingRight: Math.max(0, Number(c.padding.right ?? 0)),
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
                const coverItem =
                  coverIndex >= 0 ? (items[coverIndex] as SlotContent) : null;

                const rest = items
                  .map((it, idx) => ({
                    it,
                    idx,
                    key: it?._key ?? `idx-${idx}`,
                  }))
                  .filter(({ it, idx }) => Boolean(it) && idx !== coverIndex) as Array<{
                  it: SlotContent;
                  idx: number;
                  key: string;
                }>;

                const hasOnlyCover = Boolean(coverItem) && rest.length === 0;

                const columnDropId = `col:${block.id}:${colIdx}`;
                const sortableIds = rest.map(
                  ({ key }) => `item:${block.id}:${colIdx}:${key}`,
                );

                return (
                  <ColumnDroppable
                    key={colIdx}
                    id={columnDropId}
                    className={cn(
                      "relative min-h-0 min-w-0 p-0 m-0 overflow-visible",
                      hasOnlyCover ? "min-h-[60vh]" : "",
                    )}
                  >
                    {({ isOver }) => (
                      <>
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

                        <div
                          className={cn(
                            coverItem ? "relative z-10" : "",
                            "[&_img]:block [&_img]:m-0",
                            "overflow-visible",
                          )}
                        >
                      {/* Empty state (drop zone placeholder) */}
                      {!coverItem && rest.length === 0 ? (
                        <PreviewDropArea
                          as="button"
                          type="button"
                          variant="column"
                          isOver={isOver}
                          label="Solte aqui"
                          noLeftBorder={colIdx > 0}
                          onMouseEnter={() => {
                            if (draggingId) return;
                            onHover?.({ blockId: block.id });
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onActivate({ blockId: block.id });
                            const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                            onOpenAddContentMenu(block.id, colIdx, {
                              top: r.top,
                              left: r.left,
                              right: r.right,
                              bottom: r.bottom,
                            });
                          }}
                        />
                      ) : null}

                      {/* cover-only: selectable area + edit button + label */}
                      {hasOnlyCover && coverIndex >= 0 ? (
                        <div
                          className={cn(
                            "absolute inset-0 z-10",
                            "group/cover",
                            "transition-shadow",
                            "hover:z-[50] hover:ring-2 hover:ring-primary hover:ring-offset-0",
                            active?.blockId === block.id &&
                              "columnIndex" in (active ?? {}) &&
                              (active as any).columnIndex === colIdx &&
                              (active as any).itemIndex === coverIndex
                              ? "z-[50] ring-2 ring-primary ring-offset-0"
                              : "",
                          )}
                          onMouseEnter={() => {
                            if (draggingId) return;
                            onHover?.({
                              blockId: block.id,
                              columnIndex: colIdx,
                              itemIndex: coverIndex,
                            });
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onActivate({
                              blockId: block.id,
                              columnIndex: colIdx,
                              itemIndex: coverIndex,
                            });
                          }}
                        >
                          {/* Nome do item de capa (hover / selecionado) */}
                          {(() => {
                            const cover = coverItem as SlotContent;
                            const name = (cover as any)?.name?.trim?.();
                            const label = name || "Imagem";
                            return (
                              <div
                                className={cn(
                                  "absolute left-0 top-2 z-[60] pointer-events-none",
                                  "rounded-md px-2 py-1",
                                  "bg-primary text-primary-foreground text-[11px] font-medium",
                                  "opacity-0 group-hover/cover:opacity-100 transition-opacity",
                                  active?.blockId === block.id &&
                                    "columnIndex" in (active ?? {}) &&
                                    (active as any).columnIndex === colIdx &&
                                    (active as any).itemIndex === coverIndex &&
                                    "opacity-100",
                                )}
                              >
                                {label}
                              </div>
                            );
                          })()}
                          <div className="absolute top-2 right-2 z-20 inline-flex items-center gap-1 opacity-0 group-hover/cover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              className={cn(
                                "h-8 w-8 rounded-full",
                                "bg-background/85 backdrop-blur-md",
                                "ring-1 ring-border/70 shadow-sm shadow-black/10",
                                "grid place-items-center",
                              )}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onActivate({
                                  blockId: block.id,
                                  columnIndex: colIdx,
                                  itemIndex: coverIndex,
                                });
                              }}
                              aria-label="Editar conteúdo"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4 text-black/70" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={cn(
                                "h-8 w-8 rounded-full",
                                "bg-background/85 backdrop-blur-md",
                                "ring-1 ring-border/70 shadow-sm shadow-black/10",
                                "grid place-items-center",
                              )}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const itemKey = (coverItem as any)?._key ?? `idx-${coverIndex}`;
                                onDuplicateItem({
                                  blockId: block.id,
                                  columnIndex: colIdx,
                                  itemKey: String(itemKey),
                                });
                              }}
                              aria-label="Duplicar conteúdo"
                              title="Duplicar"
                            >
                              <Copy className="h-4 w-4 text-black/70" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={cn(
                                "h-8 w-8 rounded-full",
                                "bg-background/85 backdrop-blur-md",
                                "ring-1 ring-border/70 shadow-sm shadow-black/10",
                                "grid place-items-center",
                              )}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const itemKey = (coverItem as any)?._key ?? `idx-${coverIndex}`;
                                onDeleteItem({
                                  blockId: block.id,
                                  columnIndex: colIdx,
                                  itemKey: String(itemKey),
                                });
                              }}
                              aria-label="Excluir conteúdo"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-black/70" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <SortableContext
                        items={sortableIds}
                        strategy={verticalListSortingStrategy}
                      >
                        {rest.map(({ it: item, idx }, restIdx) => {
                          const spacingClass = restIdx === 0 ? "mb-0" : "mt-0 mb-0";

                          const isActive =
                            active?.blockId === block.id &&
                            "columnIndex" in (active ?? {}) &&
                            (active as any).columnIndex === colIdx &&
                            (active as any).itemIndex === idx;

                          const itemKey = item?._key ?? `idx-${idx}`;
                          const itemId = `item:${block.id}:${colIdx}:${itemKey}`;

                          const itemTypeLabel =
                            item.type === "image"
                              ? "Imagem"
                              : item.type === "text"
                                ? "Texto"
                                : item.type === "video"
                                  ? "Vídeo"
                                  : item.type === "title"
                                    ? "Título"
                                    : "Botão";
                          const customName = (item as any).name?.trim?.();
                          const itemLabel = customName || itemTypeLabel;

                          return (
                            <div
                              key={itemId}
                              className={cn(spacingClass, "overflow-visible")}
                              style={{ margin: 0 }}
                            >
                              <SortablePreviewItem
                                id={itemId}
                                active={Boolean(isActive)}
                                label={itemLabel}
                                onHover={() => {
                                  if (draggingId) return;
                                  onHover?.({
                                    blockId: block.id,
                                    columnIndex: colIdx,
                                    itemIndex: idx,
                                  });
                                }}
                                onActivate={() => {
                                  onActivate({
                                    blockId: block.id,
                                    columnIndex: colIdx,
                                    itemIndex: idx,
                                  });
                                }}
                                onEdit={() => {
                                  onActivate({
                                    blockId: block.id,
                                    columnIndex: colIdx,
                                    itemIndex: idx,
                                  });
                                }}
                                onDuplicate={() =>
                                  onDuplicateItem({
                                    blockId: block.id,
                                    columnIndex: colIdx,
                                    itemKey: String(itemKey),
                                  })
                                }
                                onDelete={() =>
                                  onDeleteItem({
                                    blockId: block.id,
                                    columnIndex: colIdx,
                                    itemKey: String(itemKey),
                                  })
                                }
                              >
                                <ItemRenderer item={item} />
                              </SortablePreviewItem>
                            </div>
                          );
                        })}
                      </SortableContext>
                        </div>
                      </>
                    )}
                  </ColumnDroppable>
                );
              })}
              </div>
            </div>
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>{renderDragOverlay()}</DragOverlay>
    </DndContext>
  );
}

