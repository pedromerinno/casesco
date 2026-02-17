import * as React from "react";
import { createPortal } from "react-dom";
import {
  Columns2,
  Columns3,
  Columns4,
  Heading,
  Image,
  Link as LinkIcon,
  Plus,
  Square,
  Type,
  Video,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  ContainerContent,
  ContainerColumns,
  ContentBlockType,
  SlotContent,
  ContainerColumnItems,
  ImageContent,
  TextContent,
  VideoContent,
  TitleContent,
  ButtonContent,
} from "@/lib/case-builder/types";
import { DEFAULT_SLOT_CONTENT, normalizeContainerContent } from "@/lib/case-builder/types";
import ImageBlockEditor from "./ImageBlockEditor";
import TextBlockEditor from "./TextBlockEditor";
import VideoBlockEditor from "./VideoBlockEditor";
import TitleBlockEditor from "./TitleBlockEditor";
import ButtonBlockEditor from "./ButtonBlockEditor";

type Props = {
  caseId: string;
  content: ContainerContent;
  onChange: (content: ContainerContent) => void;
  focusItem?: { columnIndex: number; itemIndex: number } | null;
};

const COL_OPTIONS: {
  value: ContainerColumns;
  label: string;
  icon: typeof Square;
}[] = [
  { value: 1, label: "1 coluna", icon: Square },
  { value: 2, label: "2 colunas", icon: Columns2 },
  { value: 3, label: "3 colunas", icon: Columns3 },
  { value: 4, label: "4 colunas", icon: Columns4 },
];

const CONTENT_TYPES: {
  type: ContentBlockType;
  label: string;
  icon: typeof Image;
}[] = [
  { type: "image", label: "Imagem", icon: Image },
  { type: "text", label: "Texto", icon: Type },
  { type: "video", label: "Vídeo", icon: Video },
  { type: "title", label: "Título", icon: Heading },
  { type: "button", label: "Botão", icon: LinkIcon },
];

function SlotEditor({
  caseId,
  item,
  onChangeItem,
  onRemove,
}: {
  caseId: string;
  item: SlotContent;
  onChangeItem: (item: SlotContent) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {item.type === "image"
            ? "Imagem"
            : item.type === "text"
              ? "Texto"
              : item.type === "video"
                ? "Vídeo"
                : item.type === "title"
                  ? "Título"
                  : "Botão"}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="p-0.5 rounded hover:bg-destructive/10 text-destructive"
          title="Remover conteúdo"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {item.type === "image" && (
        <ImageBlockEditor
          caseId={caseId}
          content={item.content as ImageContent}
          onChange={(c) => onChangeItem({ type: "image", content: c })}
        />
      )}
      {item.type === "text" && (
        <TextBlockEditor
          content={item.content as TextContent}
          onChange={(c) => onChangeItem({ type: "text", content: c })}
        />
      )}
      {item.type === "video" && (
        <VideoBlockEditor
          content={item.content as VideoContent}
          onChange={(c) => onChangeItem({ type: "video", content: c })}
        />
      )}
      {item.type === "title" && (
        <TitleBlockEditor
          content={item.content as TitleContent}
          onChange={(c) => onChangeItem({ type: "title", content: c })}
        />
      )}
      {item.type === "button" && (
        <ButtonBlockEditor
          content={item.content as ButtonContent}
          onChange={(c) => onChangeItem({ type: "button", content: c })}
        />
      )}
    </div>
  );
}

export default function ContainerBlockEditor({
  caseId,
  content,
  onChange,
  focusItem = null,
}: Props) {
  const itemRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const c = normalizeContainerContent(content);
  const [addToColumn, setAddToColumn] = React.useState(0);
  const [addMenuOpen, setAddMenuOpen] = React.useState(false);
  const addButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const addMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [addAnchor, setAddAnchor] = React.useState<{
    top: number;
    left: number;
    right: number;
    bottom: number;
  } | null>(null);

  React.useEffect(() => {
    if (!focusItem) return;
    const key = `${focusItem.columnIndex}-${focusItem.itemIndex}`;
    const el = itemRefs.current[key];
    if (!el) return;
    el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [focusItem, c.columns]);

  React.useEffect(() => {
    setAddToColumn((v) => Math.max(0, Math.min(c.columns - 1, v)));
  }, [c.columns]);

  React.useEffect(() => {
    if (!focusItem) return;
    setAddToColumn(Math.max(0, Math.min(c.columns - 1, focusItem.columnIndex)));
  }, [focusItem, c.columns]);

  React.useEffect(() => {
    if (!addMenuOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAddMenuOpen(false);
    }

    function onPointerDown(e: MouseEvent | PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (addMenuRef.current?.contains(target)) return;
      if (addButtonRef.current?.contains(target)) return;
      setAddMenuOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [addMenuOpen]);

  React.useEffect(() => {
    if (!addMenuOpen) return;
    const btn = addButtonRef.current;
    if (!btn) return;

    function update() {
      const r = btn.getBoundingClientRect();
      setAddAnchor({
        top: r.top,
        left: r.left,
        right: r.right,
        bottom: r.bottom,
      });
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [addMenuOpen]);

  function handleColumnsChange(columns: ContainerColumns) {
    const currentSlots = c.slots;
    const newSlots: ContainerColumnItems[] = Array.from(
      { length: columns },
      (_, i) => currentSlots[i] ?? [],
    );
    onChange({ columns, slots: newSlots });
  }

  function addItem(columnIndex: number, type: ContentBlockType) {
    const nextSlots = c.slots.map((col) => [...col]);
    nextSlots[columnIndex] = [
      ...(nextSlots[columnIndex] ?? []),
      {
        _key: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        type,
        content: { ...DEFAULT_SLOT_CONTENT[type] },
      } as SlotContent,
    ];
    onChange({ ...c, slots: nextSlots });
  }

  function updateItem(columnIndex: number, itemIndex: number, item: SlotContent) {
    const nextSlots = c.slots.map((col) => [...col]);
    nextSlots[columnIndex][itemIndex] = item;
    onChange({ ...c, slots: nextSlots });
  }

  function removeItem(columnIndex: number, itemIndex: number) {
    const nextSlots = c.slots.map((col) => [...col]);
    nextSlots[columnIndex].splice(itemIndex, 1);
    onChange({ ...c, slots: nextSlots });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-muted-foreground mr-2">
          Colunas
        </span>
        <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
          {COL_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = c.columns === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleColumnsChange(opt.value)}
                className={cn(
                  "h-8 w-8 rounded-full grid place-items-center transition-colors",
                  isActive
                    ? "bg-white ring-1 ring-black/5 text-black"
                    : "text-muted-foreground hover:bg-accent",
                )}
                aria-label={opt.label}
                title={opt.label}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Add content (button + dropdown) */}
      <div>
        <button
          ref={addButtonRef}
          type="button"
          onClick={() => setAddMenuOpen((v) => !v)}
          className={cn(
            "w-full h-10 rounded-xl",
            "border border-border bg-background",
            "flex items-center justify-center gap-2",
            "text-sm font-medium",
            "hover:bg-accent transition-colors",
          )}
          aria-haspopup="menu"
          aria-expanded={addMenuOpen}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Adicionar conteúdo
        </button>

        {addMenuOpen && addAnchor
          ? createPortal(
              (() => {
                const menuWidth = 280;
                const pad = 12;
                const vw = window.innerWidth;
                const vh = window.innerHeight;

                const left = Math.min(addAnchor.left, vw - pad - menuWidth);
                const top = Math.min(addAnchor.bottom + 10, vh - pad - 420);

                return (
                  <div style={{ position: "fixed", top, left, zIndex: 2500 }}>
                    <div
                      ref={addMenuRef}
                      role="menu"
                      aria-label="Adicionar conteúdo"
                      className={cn(
                        "w-[280px]",
                        "max-h-[min(420px,calc(100vh-24px))] overflow-auto",
                        "rounded-2xl border border-border bg-white",
                        "shadow-[0_22px_60px_-35px_rgba(0,0,0,0.35)]",
                        "ring-1 ring-black/5 p-1.5",
                      )}
                    >
                      <div className="px-2 py-1.5 text-[11px] text-black/40">
                        Adicionar conteúdo
                      </div>

                      {c.columns > 1 ? (
                        <div className="px-1 pb-1">
                          <div className="inline-flex items-center gap-1 rounded-xl bg-muted p-1">
                            {Array.from({ length: c.columns }).map((_, colIdx) => (
                              <button
                                key={colIdx}
                                type="button"
                                onClick={() => setAddToColumn(colIdx)}
                                className={cn(
                                  "px-2 py-1 rounded-lg text-[11px] font-medium tabular-nums",
                                  addToColumn === colIdx
                                    ? "bg-white ring-1 ring-black/5 text-black"
                                    : "text-muted-foreground hover:bg-accent",
                                )}
                                aria-label={`Adicionar na coluna ${colIdx + 1}`}
                              >
                                {String(colIdx + 1).padStart(2, "0")}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="space-y-1">
                        {CONTENT_TYPES.map((ct) => {
                          const Icon = ct.icon;
                          return (
                            <button
                              key={ct.type}
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                addItem(addToColumn, ct.type);
                                setAddMenuOpen(false);
                              }}
                              className="w-full rounded-xl px-2.5 py-2 text-left text-sm text-black hover:bg-black/[0.04] focus:bg-black/[0.04] focus:outline-none flex items-center gap-2"
                            >
                              <Icon className="h-4 w-4 text-black/60" aria-hidden="true" />
                              {ct.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })(),
              document.body,
            )
          : null}
      </div>

      {/* Columns (stacked) */}
      <div className="space-y-3">
        {c.slots.map((items, colIdx) => (
          <div key={colIdx} className="space-y-2">
            {c.columns > 1 ? (
              <div className="text-[11px] font-medium text-muted-foreground">
                Coluna {String(colIdx + 1).padStart(2, "0")}
              </div>
            ) : null}

            {items.length === 0 ? (
              <div className="text-[11px] text-muted-foreground py-1">
                Nenhum item nesta coluna.
              </div>
            ) : null}

            {items.map((item, itemIdx) => {
              const isFocused =
                focusItem?.columnIndex === colIdx && focusItem?.itemIndex === itemIdx;
              const refKey = `${colIdx}-${itemIdx}`;
              return (
                <div
                  key={item._key ?? itemIdx}
                  ref={(node) => {
                    itemRefs.current[refKey] = node;
                  }}
                  className={cn(
                    "rounded-xl transition-shadow",
                    isFocused
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "",
                  )}
                >
                  <SlotEditor
                    caseId={caseId}
                    item={item}
                    onChangeItem={(next) => updateItem(colIdx, itemIdx, next)}
                    onRemove={() => removeItem(colIdx, itemIdx)}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
