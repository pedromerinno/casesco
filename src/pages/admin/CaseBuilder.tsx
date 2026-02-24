import * as React from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import {
  Building2,
  ArrowUpRight,
  Copy,
  Columns2,
  Columns3,
  Columns4,
  ChevronRight,
  GripVertical,
  Heading,
  Image,
  LayoutGrid,
  LayoutTemplate,
  Link as LinkIcon,
  Monitor,
  Plus,
  Smartphone,
  Square,
  Space,
  Settings2,
  Tablet,
  Trash2,
  Type,
  Video,
} from "lucide-react";

import MuxPlayer from "@mux/mux-player-react";
import { supabase } from "@/lib/supabase/client";
import type { CaseRow } from "@/lib/case-builder/queries";
import { getCaseBlocks, saveCaseBlocks } from "@/lib/case-builder/queries";
import {
  createContainerContent,
  DEFAULT_SLOT_CONTENT,
  DEFAULT_SPACER_CONTENT,
  type BlockType,
  type ContainerColumns,
  type ContainerContent,
  type ContentBlockType,
  type SlotContent,
  type CaseBlock,
  type DraftBlock,
} from "@/lib/case-builder/types";
import { normalizeContainerContent } from "@/lib/case-builder/types";
import {
  CASE_TEMPLATES,
  type CaseTemplate,
  type CustomCaseTemplate,
  getCustomTemplates,
  saveAsTemplate,
  deleteTemplate,
  createBlocksFromCustomTemplate,
} from "@/lib/case-builder/templates";
import { useCompany } from "@/lib/company-context";
import BuilderPreview, { type PreviewTarget } from "@/components/case-builder/BuilderPreview";
import { PreviewDroppableArea } from "@/components/case-builder/PreviewDropArea";
import SpacerBlockEditor from "@/components/case-builder/blocks/SpacerBlockEditor";
import ImageBlockEditor from "@/components/case-builder/blocks/ImageBlockEditor";
import TextBlockEditor from "@/components/case-builder/blocks/TextBlockEditor";
import VideoBlockEditor from "@/components/case-builder/blocks/VideoBlockEditor";
import TitleBlockEditor from "@/components/case-builder/blocks/TitleBlockEditor";
import ButtonBlockEditor from "@/components/case-builder/blocks/ButtonBlockEditor";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import CaseEditorTopBar from "@/components/admin/CaseEditorTopBar";
import CaseEditorPhase1 from "@/components/case-builder/CaseEditorPhase1";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

async function getCaseById(id: string): Promise<CaseRow | null> {
  const { data, error } = await supabase
    .from("cases")
    .select(
      "id,title,slug,summary,year,cover_image_url,cover_video_url,cover_mux_playback_id,page_background,container_padding,container_radius,container_gap,services,status,published_at,clients(id,name),case_category_cases(case_categories(id,name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as any;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    year: row.year,
    cover_image_url: row.cover_image_url,
    cover_video_url: row.cover_video_url ?? null,
    cover_mux_playback_id: row.cover_mux_playback_id ?? null,
    page_background: row.page_background ?? null,
    container_padding: row.container_padding != null ? Number(row.container_padding) : null,
    container_radius: row.container_radius != null ? Number(row.container_radius) : null,
    container_gap: row.container_gap != null ? Number(row.container_gap) : null,
    services: row.services,
    status: row.status,
    published_at: row.published_at,
    clients: row.clients,
    categories: (row.case_category_cases ?? [])
      .map((cc: any) => cc.case_categories)
      .filter(Boolean),
  };
}

function toDraft(b: CaseBlock): DraftBlock {
  return {
    _key: b.id,
    id: b.id,
    type: b.type,
    content: b.content,
    sort_order: b.sort_order,
  };
}

function toPreviewBlocks(caseId: string, drafts: DraftBlock[]): CaseBlock[] {
  const now = new Date().toISOString();
  return drafts.map((d, i) => ({
    id: d.id ?? d._key,
    case_id: caseId,
    type: d.type,
    content: d.content as any,
    sort_order: i,
    created_at: now,
    updated_at: now,
  }));
}

function ensureDraftItemKeys(drafts: DraftBlock[]): DraftBlock[] {
  return drafts.map((d) => {
    if (d.type !== "container") return d;
    const name = (d.content as any)?.name;
    const c = normalizeContainerContent(d.content as any);
    const slots = c.slots.map((col) =>
      col.map((it) => ({
        ...it,
        _key: it?._key ?? (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`),
      })),
    );
    return { ...d, content: { ...c, name, slots } as any };
  });
}

const TYPE_META: Record<BlockType, { label: string; icon: typeof LayoutGrid }> = {
  container: { label: "Seção", icon: LayoutGrid },
  spacer: { label: "Espaço", icon: Space },
};

function BlockListItem({
  id,
  index,
  type,
  active,
  name,
  expandable = false,
  expanded = false,
  onToggleExpanded,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
  children,
}: {
  id: string;
  index: number;
  type: BlockType;
  active: boolean;
  name?: string | null;
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  onSelect: () => void;
  onRename: (nextName: string | null) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const meta = TYPE_META[type];
  const Icon = meta.icon;

  const defaultTitle = `Bloco ${String(index + 1).padStart(2, "0")}`;
  const displayTitle = name && name.trim().length > 0 ? name.trim() : defaultTitle;

  const [renaming, setRenaming] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState(name?.trim?.() ?? "");
  const renameInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!renaming) return;
    queueMicrotask(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
  }, [renaming]);

  React.useEffect(() => {
    if (renaming) return;
    setRenameValue(name?.trim?.() ?? "");
  }, [name, renaming]);

  function commitRename() {
    const next = renameValue.replace(/\s+/g, " ").trim();
    onRename(next.length > 0 ? next : null);
    setRenaming(false);
  }

  function cancelRename() {
    setRenameValue(name?.trim?.() ?? "");
    setRenaming(false);
  }

  return (
    <div ref={setNodeRef} style={style} className="space-y-1" data-tree-id={id}>
      <div
        className={cn(
          "w-full",
          "rounded-xl border",
          active ? "border-primary/30 bg-primary/5" : "border-border bg-white",
          "transition-colors",
        )}
      >
        <div
          className={cn("px-2 py-1.5 flex items-center gap-2", "group")}
          role="button"
          tabIndex={0}
          onClick={() => {
            if (renaming) return;
            onSelect();
          }}
          onKeyDown={(e) => {
            if (renaming) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect();
            }
          }}
          aria-label={`Selecionar ${displayTitle}`}
        >
          {expandable ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpanded?.();
              }}
              className={cn(
                "h-7 w-7 rounded-lg grid place-items-center",
                "hover:bg-black/[0.04] text-black/60",
              )}
              aria-label={expanded ? "Recolher" : "Expandir"}
              aria-expanded={expanded}
            >
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform",
                  expanded ? "rotate-90" : "rotate-0",
                )}
                aria-hidden="true"
              />
            </button>
          ) : (
            <span className="h-7 w-7" aria-hidden="true" />
          )}

          <span className="relative h-7 w-7 shrink-0">
            {/* Drag handle over the block icon */}
            <button
              type="button"
              className={cn(
                "absolute inset-0",
                "rounded-lg bg-[#f2f0eb] ring-1 ring-black/5",
                "grid place-items-center",
                "cursor-grab active:cursor-grabbing",
                "hover:bg-[#ebe7df] transition-colors",
              )}
              onClick={(e) => e.stopPropagation()}
              aria-label="Reordenar bloco"
              {...attributes}
              {...listeners}
            >
              <Icon
                className={cn(
                  "h-4 w-4 text-black/70",
                  "opacity-100 group-hover:opacity-0 transition-opacity",
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  "absolute inset-0 rounded-lg",
                  "grid place-items-center",
                  "text-black/55",
                  "opacity-0 group-hover:opacity-100 transition-opacity",
                )}
                aria-hidden="true"
              >
                <GripVertical className="h-4 w-4" aria-hidden="true" />
              </span>
            </button>
          </span>

          <div className="min-w-0 flex-1">
            {renaming ? (
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    commitRename();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    cancelRename();
                  }
                }}
                onBlur={() => commitRename()}
                placeholder={defaultTitle}
                aria-label="Renomear bloco"
                className={cn(
                  "w-full",
                  "h-7",
                  "p-0",
                  "text-[13px] font-medium text-black leading-tight",
                  "bg-transparent",
                  "border-0 rounded-none",
                  "focus:outline-none focus:ring-0 focus-visible:ring-0",
                )}
              />
            ) : (
              <div
                className={cn(
                  "text-[13px] font-medium text-black truncate leading-tight",
                  "select-none",
                )}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setRenaming(true);
                }}
                title={displayTitle}
              >
                {displayTitle}
              </div>
            )}
            {type === "spacer" ? (
              <div className="text-xs text-black/40 truncate">{meta.label}</div>
            ) : null}
          </div>

          <span className="ml-auto inline-flex items-center gap-1">
            <span
              className={cn("p-1 rounded hover:bg-black/5 text-black/60")}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDuplicate();
              }}
              aria-label="Duplicar bloco"
              role="button"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
            </span>
            <span
              className={cn("p-1 rounded hover:bg-black/5 text-black/60")}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Remover bloco"
              role="button"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </span>
          </span>
        </div>
      </div>

      {children ? <div className="ml-5">{children}</div> : null}
    </div>
  );
}

function SidebarContentItem({
  id,
  active,
  icon,
  label,
  onRename,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  id: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onRename?: (nextName: string | null) => void;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const [renaming, setRenaming] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState(label);
  const renameInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!renaming) return;
    queueMicrotask(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
  }, [renaming]);

  React.useEffect(() => {
    if (renaming) return;
    setRenameValue(label);
  }, [label, renaming]);

  function commitRename() {
    const next = renameValue.replace(/\s+/g, " ").trim();
    onRename?.(next.length > 0 ? next : null);
    setRenaming(false);
  }

  function cancelRename() {
    setRenameValue(label);
    setRenaming(false);
  }

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group" data-tree-id={id}>
      <div
        className={cn(
          "w-full rounded-lg px-2 py-1.5",
          "flex items-center gap-2",
          "transition-colors",
          active
            ? "bg-primary/10 text-black ring-1 ring-primary/25"
            : "bg-transparent text-black/80 hover:bg-black/[0.03]",
        )}
      >
        <span className="h-6 w-6 rounded-lg bg-[#f2f0eb] ring-1 ring-black/5 grid place-items-center shrink-0">
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          {renaming && onRename ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  commitRename();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  cancelRename();
                }
              }}
              onBlur={() => commitRename()}
              placeholder={label}
              aria-label="Renomear item"
              className={cn(
                "w-full h-6",
                "p-0 text-[13px] font-medium text-black leading-tight",
                "bg-transparent border-0 rounded-none",
                "focus:outline-none focus:ring-0 focus-visible:ring-0",
              )}
            />
          ) : (
            <button
              type="button"
              className="w-full text-left focus-visible:outline-none"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!renaming) onSelect();
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onRename) setRenaming(true);
              }}
              aria-current={active ? "true" : undefined}
              aria-label={label}
            >
              <div className="text-[13px] font-medium truncate leading-tight">
                {label}
              </div>
            </button>
          )}
        </div>

        <span className="ml-auto inline-flex items-center gap-1">
          <span
            className={cn(
              "cursor-grab active:cursor-grabbing",
              "h-7 w-7 rounded-md grid place-items-center",
              "text-black/50 hover:text-black/70 hover:bg-black/[0.05]",
              "opacity-0 group-hover:opacity-100 transition-opacity",
            )}
            onClick={(e) => e.stopPropagation()}
            aria-label="Reordenar item"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </span>

          <span
            className={cn(
              "h-7 w-7 rounded-md grid place-items-center",
              "text-black/50 hover:text-black/70 hover:bg-black/[0.05]",
              "opacity-0 group-hover:opacity-100 transition-opacity",
            )}
            role="button"
            aria-label="Duplicar item"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDuplicate();
            }}
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
          </span>

          <span
            className={cn(
              "h-7 w-7 rounded-md grid place-items-center",
              "text-black/50 hover:text-black/70 hover:bg-black/[0.05]",
              "opacity-0 group-hover:opacity-100 transition-opacity",
            )}
            role="button"
            aria-label="Excluir item"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </span>
        </span>
      </div>
    </div>
  );
}

function SidebarColumnDropZone({
  id,
  show,
  empty,
  onClick,
}: {
  id: string;
  show: boolean;
  empty: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  if (!show && !empty) return null;

  if (empty) {
    return (
      <button
        ref={setNodeRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick?.(e);
        }}
        className={cn("mt-1 w-full text-left", "focus-visible:outline-none")}
        aria-label="Área para soltar conteúdo"
      >
        <div
          className={cn(
            "rounded-xl border border-dashed",
            "w-full",
            "px-3 py-3",
            "cursor-pointer",
            "transition-colors",
            isOver ? "border-primary/55 bg-primary/10" : "border-primary/35 bg-accent/35",
          )}
        >
          <div className="flex items-center justify-center gap-1.5 text-primary">
            <div className="text-lg font-light leading-none">+</div>
            <div className="text-[13px] font-medium leading-none">Solte aqui</div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.(e);
      }}
      className={cn(
        "mt-1",
        "rounded-lg border border-dashed",
        "h-7",
        "w-full",
        "cursor-pointer",
        isOver ? "border-primary/40 bg-primary/5" : "border-black/10 bg-black/[0.02]",
        "transition-colors",
        show ? "opacity-100" : "opacity-60",
      )}
      aria-label="Área para soltar"
    />
  );
}

function PaletteDragItem({
  id,
  onClick,
  children,
}: {
  id: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <button
      ref={setNodeRef}
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full rounded-xl px-2.5 py-2 text-left text-sm text-black hover:bg-black/[0.04] focus:bg-black/[0.04] focus:outline-none flex items-center gap-2 cursor-grab active:cursor-grabbing"
      style={{ opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
    >
      {children}
    </button>
  );
}

function EmptySidebarBlocksDropZone({
  onAddClick,
}: {
  onAddClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "sidebar-drop:append" });
  return (
    <div
      ref={setNodeRef}
      role={onAddClick ? "button" : undefined}
      tabIndex={onAddClick ? 0 : undefined}
      onClick={onAddClick}
      onKeyDown={
        onAddClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onAddClick(e as unknown as React.MouseEvent<HTMLDivElement>);
              }
            }
          : undefined
      }
      className={cn(
        "rounded-xl border border-dashed",
        "px-3 py-4",
        "transition-colors",
        "cursor-pointer",
        isOver ? "border-primary/55 bg-primary/10" : "border-primary/35 bg-accent/35",
        onAddClick && "hover:border-primary/45 hover:bg-accent/40",
      )}
      aria-label="Área para soltar e adicionar bloco"
    >
      <div className="text-center">
        <div className="text-lg font-light text-primary leading-none">+</div>
        <div className="mt-1 text-[13px] font-medium text-primary">Adicionar bloco</div>
      </div>
    </div>
  );
}

export default function CaseBuilder() {
  const { id } = useParams<{ id: string }>();
  const caseId = id!;
  const qc = useQueryClient();
  const { company } = useCompany();

  const [addMenuOpen, setAddMenuOpen] = React.useState(false);
  const addMenuRef = React.useRef<HTMLDivElement | null>(null);
  const addButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const [emptyZoneBlockMenuOpen, setEmptyZoneBlockMenuOpen] = React.useState(false);
  const [emptyZoneBlockMenuAnchor, setEmptyZoneBlockMenuAnchor] = React.useState<{
    bottom: number;
    left: number;
    width: number;
  } | null>(null);
  const emptyZoneBlockMenuRef = React.useRef<HTMLDivElement>(null);
  const [pageSettingsOpen, setPageSettingsOpen] = React.useState(false);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [previewViewport, setPreviewViewport] = React.useState<"desktop" | "tablet" | "mobile">("desktop");
  const [saveTemplateForm, setSaveTemplateForm] = React.useState<{ name: string; description: string } | null>(null);
  const [savingTemplate, setSavingTemplate] = React.useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = React.useState<string | null>(null);
  const [pageBackgroundDraft, setPageBackgroundDraft] = React.useState<string | null>(null);
  const pageBackgroundInitRef = React.useRef(false);
  const pageBackgroundRef = React.useRef<string | null>(null);
  const [containerPaddingDraft, setContainerPaddingDraft] = React.useState<number>(0);
  const [containerRadiusDraft, setContainerRadiusDraft] = React.useState<number>(0);
  const [containerGapDraft, setContainerGapDraft] = React.useState<number>(0);
  const containerLayoutRef = React.useRef<{ padding: number; radius: number; gap: number }>({ padding: 0, radius: 0, gap: 0 });
  const [focusedItem, setFocusedItem] = React.useState<{
    blockKey: string;
    columnIndex: number;
    itemIndex: number;
  } | null>(null);
  const [hoveredPreviewTarget, setHoveredPreviewTarget] =
    React.useState<PreviewTarget | null>(null);
  const [expandedBlocks, setExpandedBlocks] = React.useState<Record<string, boolean>>({});
  const [addContentMenu, setAddContentMenu] = React.useState<{
    blockKey: string;
    columnIndex: number | null; // if null, user must pick a column
  } | null>(null);
  const addContentMenuRef = React.useRef<HTMLDivElement | null>(null);
  const addContentButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const [addContentAnchor, setAddContentAnchor] = React.useState<{
    top: number;
    left: number;
    right: number;
    bottom: number;
  } | null>(null);
  const [drafts, setDrafts] = React.useState<DraftBlock[]>([]);
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  /** When selectedKey is this, right sidebar shows page properties instead of block inspector */
  const PAGE_PANEL_KEY = "__page__";
  const [sidebarDraggingId, setSidebarDraggingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const cleanSnapshotRef = React.useRef<string>("");
  const caseConfigFormRef = React.useRef<{ submit: () => Promise<void> } | null>(null);
  const [savedDialogOpen, setSavedDialogOpen] = React.useState(false);
  const [savedDialogData, setSavedDialogData] = React.useState<{
    slug: string;
    title: string | null;
    cover_image_url: string | null;
    cover_video_url: string | null;
    cover_mux_playback_id: string | null;
  } | null>(null);

  const caseQuery = useQuery({
    queryKey: ["admin", "case", caseId],
    queryFn: () => getCaseById(caseId),
    enabled: Boolean(caseId),
    staleTime: 30 * 1000,
  });

  React.useEffect(() => {
    if (pageBackgroundInitRef.current) return;
    if (!caseQuery.data) return;
    const bg = caseQuery.data.page_background ?? null;
    setPageBackgroundDraft(bg);
    pageBackgroundRef.current = bg;
    pageBackgroundInitRef.current = true;
  }, [caseQuery.data]);

  React.useEffect(() => {
    if (!caseQuery.data) return;
    const p = caseQuery.data.container_padding ?? 0;
    const r = caseQuery.data.container_radius ?? 0;
    const g = caseQuery.data.container_gap ?? 0;
    setContainerPaddingDraft(p);
    setContainerRadiusDraft(r);
    setContainerGapDraft(g);
    containerLayoutRef.current = { padding: p, radius: r, gap: g };
  }, [caseQuery.data?.id, caseQuery.data?.container_padding, caseQuery.data?.container_radius, caseQuery.data?.container_gap]);

  React.useEffect(() => {
    if (!emptyZoneBlockMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const el = emptyZoneBlockMenuRef.current;
      if (el && !el.contains(e.target as Node)) {
        setEmptyZoneBlockMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => document.removeEventListener("mousedown", handleClickOutside, true);
  }, [emptyZoneBlockMenuOpen]);

  const blocksQuery = useQuery({
    queryKey: ["admin", "case", caseId, "blocks"],
    queryFn: () => getCaseBlocks(caseId),
    enabled: Boolean(caseId),
    staleTime: 10 * 1000,
  });

  const customTemplatesQuery = useQuery({
    queryKey: ["admin", "custom-templates", company.group_id],
    queryFn: () => getCustomTemplates(company.group_id),
    enabled: templatesOpen,
    staleTime: 30 * 1000,
  });

  React.useEffect(() => {
    if (!blocksQuery.data) return;
    const next = ensureDraftItemKeys(blocksQuery.data.map(toDraft));
    setDrafts(next);
    cleanSnapshotRef.current = JSON.stringify(
      next.map((d) => ({ type: d.type, content: d.content })),
    );
    setSelectedKey((prev) => prev ?? next[0]?._key ?? null);

    // Default: expand all container blocks (Shopify-like tree)
    setExpandedBlocks((prev) => {
      const out = { ...prev };
      next.forEach((d) => {
        if (d.type !== "container") return;
        if (out[d._key] === undefined) out[d._key] = true;
      });
      return out;
    });
  }, [blocksQuery.data]);

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
    if (!addContentMenu) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAddContentMenu(null);
    }

    function onPointerDown(e: MouseEvent | PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (addContentMenuRef.current?.contains(target)) return;
      if (addContentButtonRef.current?.contains(target)) return;
      setAddContentMenu(null);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [addContentMenu]);

  React.useEffect(() => {
    if (!addContentMenu) return;
    const btn = addContentButtonRef.current;
    if (!btn) return;

    function update() {
      const r = btn.getBoundingClientRect();
      setAddContentAnchor({
        top: r.top,
        left: r.left,
        right: r.right,
        bottom: r.bottom,
      });
    }

    update();
    window.addEventListener("resize", update);
    // capture scroll anywhere (sidebar uses overflow)
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [addContentMenu]);

  function closeBlockMenus() {
    setAddMenuOpen(false);
    setEmptyZoneBlockMenuOpen(false);
  }

  function handleAddContainer(columns: ContainerColumns) {
    addContainer(columns);
    closeBlockMenus();
  }

  function handleAddSpacer() {
    addSpacer();
    closeBlockMenus();
  }

  function handleAddContentBlock(type: ContentBlockType) {
    const blockId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const itemKey = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const draft: DraftBlock = {
      _key: blockId,
      id: blockId,
      type: "container",
      content: createContainerContent(1),
      sort_order: drafts.length,
    };
    const c = normalizeContainerContent(draft.content as any);
    c.slots[0] = [
      { _key: itemKey, type, content: { ...DEFAULT_SLOT_CONTENT[type] } as any },
    ];
    draft.content = { ...c, slots: c.slots } as any;
    setDrafts((prev) => [...prev, draft]);
    setSelectedKey(blockId);
    setFocusedItem({ blockKey: blockId, columnIndex: 0, itemIndex: 0 });
    setExpandedBlocks((prev) => ({ ...prev, [blockId]: true }));
    closeBlockMenus();
  }

  const pageBackground =
    pageBackgroundDraft ?? caseQuery.data?.page_background ?? null;

  React.useEffect(() => {
    pageBackgroundRef.current = pageBackgroundDraft ?? caseQuery.data?.page_background ?? null;
  }, [pageBackgroundDraft, caseQuery.data?.page_background]);

  function savePageBackground(next: string | null) {
    pageBackgroundRef.current = next;
    setPageBackgroundDraft(next);
  }

  function savePageContainerLayout(padding: number, radius: number, gap: number) {
    containerLayoutRef.current = { padding, radius, gap };
    setContainerPaddingDraft(padding);
    setContainerRadiusDraft(radius);
    setContainerGapDraft(gap);
  }

  function addContentItem(blockKey: string, columnIndex: number, type: ContentBlockType) {
    setDrafts((prev) => {
      const idx = prev.findIndex((b) => b._key === blockKey);
      const block = prev[idx];
      if (!block || block.type !== "container") return prev;

      const next = prev.map((b) => ({ ...b }));
      const container = next[idx];
      const c = normalizeContainerContent(container.content as any);
      const slots = c.slots.map((col) => [...col]);
      const col = slots[columnIndex] ?? [];
      const nextIndex = col.length;
      col.push({
        _key: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        type,
        content: { ...DEFAULT_SLOT_CONTENT[type] } as any,
      });
      slots[columnIndex] = col;
      container.content = { ...c, slots } as any;

      // keep selection in sync
      queueMicrotask(() => {
        setSelectedKey(blockKey);
        setFocusedItem({ blockKey, columnIndex, itemIndex: nextIndex });
      });

      return next;
    });
  }

  function parseSidebarItemId(id: string): {
    blockKey: string;
    columnIndex: number;
    itemKey: string;
  } | null {
    // item:<blockKey>:<colIdx>:<itemKey>
    const m = id.match(/^item:(.+):(\d+):(.+)$/);
    if (!m) return null;
    return { blockKey: m[1], columnIndex: Number(m[2]), itemKey: m[3] };
  }

  function parseSidebarColumnId(id: string): { blockKey: string; columnIndex: number } | null {
    // col:<blockKey>:<colIdx>
    const m = id.match(/^col:(.+):(\d+)$/);
    if (!m) return null;
    return { blockKey: m[1], columnIndex: Number(m[2]) };
  }

  function removeContentItem(blockKey: string, columnIndex: number, itemIndex: number) {
    setDrafts((prev) => {
      const idx = prev.findIndex((b) => b._key === blockKey);
      const block = prev[idx];
      if (!block || block.type !== "container") return prev;

      const next = prev.map((b) => ({ ...b }));
      const container = next[idx];
      const c = normalizeContainerContent(container.content as any);
      const slots = c.slots.map((col) => [...col]);
      const col = slots[columnIndex] ?? [];
      if (!col[itemIndex]) return prev;
      col.splice(itemIndex, 1);
      slots[columnIndex] = col;
      container.content = { ...c, slots } as any;

      // keep focus consistent
      setFocusedItem((curr) => {
        if (!curr || curr.blockKey !== blockKey) return curr;
        if (curr.columnIndex !== columnIndex) return curr;
        if (curr.itemIndex === itemIndex) return null;
        if (curr.itemIndex > itemIndex) {
          return { ...curr, itemIndex: curr.itemIndex - 1 };
        }
        return curr;
      });

      return next;
    });
  }

  function renameBlock(blockKey: string, nextName: string | null) {
    setDrafts((prev) => {
      const idx = prev.findIndex((b) => b._key === blockKey);
      const block = prev[idx];
      if (!block) return prev;

      const next = prev.map((b) => ({ ...b }));
      const d = next[idx];
      const content = { ...(d.content as any) };
      if (!nextName) {
        delete content.name;
      } else {
        content.name = nextName;
      }
      d.content = content as any;
      return next;
    });
  }

  function renameContentItem(
    blockKey: string,
    columnIndex: number,
    itemIndex: number,
    nextName: string | null,
  ) {
    setDrafts((prev) => {
      const idx = prev.findIndex((b) => b._key === blockKey);
      const block = prev[idx];
      if (!block || block.type !== "container") return prev;

      const next = prev.map((b) => ({ ...b }));
      const container = next[idx];
      const c = normalizeContainerContent(container.content as any);
      const slots = c.slots.map((col) => [...col]);
      const col = slots[columnIndex] ?? [];
      const item = col[itemIndex];
      if (!item) return prev;

      const updated = { ...item };
      if (!nextName || !nextName.trim()) {
        delete (updated as any).name;
      } else {
        (updated as any).name = nextName.trim();
      }
      col[itemIndex] = updated;
      slots[columnIndex] = col;
      container.content = { ...c, slots } as any;
      return next;
    });
  }

  function duplicateContentItem(blockKey: string, columnIndex: number, itemIndex: number) {
    setDrafts((prev) => {
      const idx = prev.findIndex((b) => b._key === blockKey);
      const block = prev[idx];
      if (!block || block.type !== "container") return prev;

      const next = prev.map((b) => ({ ...b }));
      const container = next[idx];
      const c = normalizeContainerContent(container.content as any);
      const name = (container.content as any)?.name;
      const slots = c.slots.map((col) => [...col]);
      const col = slots[columnIndex] ?? [];
      const original = col[itemIndex];
      if (!original) return prev;

      const clone: SlotContent = {
        ...(JSON.parse(JSON.stringify(original)) as SlotContent),
        _key: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      };

      col.splice(itemIndex + 1, 0, clone);
      slots[columnIndex] = col;
      container.content = { ...c, name, slots } as any;

      queueMicrotask(() => {
        setSelectedKey(blockKey);
        setFocusedItem({ blockKey, columnIndex, itemIndex: itemIndex + 1 });
      });

      return next;
    });
  }

  function findContentItemIndexByKey(
    blockKey: string,
    columnIndex: number,
    itemKey: string,
  ): number | null {
    const block = drafts.find((b) => b._key === blockKey && b.type === "container") as
      | DraftBlock
      | undefined;
    if (!block) return null;
    const c = normalizeContainerContent(block.content as any);
    const col = c.slots[columnIndex] ?? [];
    if (itemKey.startsWith("idx-")) {
      const idx = Number(itemKey.slice(4));
      return Number.isFinite(idx) && idx >= 0 && idx < col.length ? idx : null;
    }
    const idx = col.findIndex((it) => it?._key === itemKey);
    return idx === -1 ? null : idx;
  }

  function duplicateBlock(blockKey: string) {
    setDrafts((prev) => {
      const idx = prev.findIndex((b) => b._key === blockKey);
      const block = prev[idx];
      if (!block) return prev;

      const newId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      let clonedContent: any = JSON.parse(JSON.stringify(block.content ?? {}));

      // Regenerate nested item keys for containers (DnD stability).
      if (block.type === "container") {
        const normalized = normalizeContainerContent(clonedContent);
        const name = clonedContent?.name;
        const slots = normalized.slots.map((col) =>
          col.map((it) => ({
            ...(it as any),
            _key: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
          })),
        );
        clonedContent = { ...normalized, name, slots };
      }

      // Friendly copy name (only when user had renamed).
      const prevName = (block.content as any)?.name;
      if (typeof prevName === "string" && prevName.trim().length > 0) {
        (clonedContent as any).name = `${prevName.trim()} (cópia)`;
      }

      const draft: DraftBlock = {
        _key: newId,
        id: newId,
        type: block.type,
        content: clonedContent as any,
        sort_order: prev.length,
      };

      const next = prev.slice();
      next.splice(idx + 1, 0, draft);

      queueMicrotask(() => {
        setSelectedKey(draft._key);
        setFocusedItem(null);
      });

      return next;
    });
  }

  function insertBlockAt(atBlockKey: string, type: BlockType, columns?: ContainerColumns) {
    setDrafts((prev) => {
      const idx = prev.findIndex((b) => b._key === atBlockKey);
      const insertIdx = idx === -1 ? prev.length : idx;
      const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      const draft: DraftBlock = {
        _key: id,
        id,
        type,
        content:
          type === "spacer"
            ? { ...DEFAULT_SPACER_CONTENT }
            : createContainerContent(columns ?? 1),
        sort_order: insertIdx,
      };
      const next = [...prev];
      next.splice(insertIdx, 0, draft);
      queueMicrotask(() => {
        setSelectedKey(id);
        setFocusedItem(null);
      });
      return next;
    });
  }

  function insertContentBlockAt(atBlockKey: string, contentType: ContentBlockType) {
    setDrafts((prev) => {
      const idx = prev.findIndex((b) => b._key === atBlockKey);
      const insertIdx = idx === -1 ? prev.length : idx;
      const blockId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      const itemKey = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      const draft: DraftBlock = {
        _key: blockId,
        id: blockId,
        type: "container",
        content: createContainerContent(1),
        sort_order: insertIdx,
      };
      const c = normalizeContainerContent(draft.content as any);
      c.slots[0] = [
        { _key: itemKey, type: contentType, content: { ...DEFAULT_SLOT_CONTENT[contentType] } as any },
      ];
      draft.content = { ...c, slots: c.slots } as any;
      const next = [...prev];
      next.splice(insertIdx, 0, draft);
      queueMicrotask(() => {
        setSelectedKey(blockId);
        setFocusedItem({ blockKey: blockId, columnIndex: 0, itemIndex: 0 });
        setExpandedBlocks((p) => ({ ...p, [blockId]: true }));
      });
      return next;
    });
  }

  function insertContentItemBefore(
    blockKey: string,
    columnIndex: number,
    beforeItemKey: string,
    contentType: ContentBlockType,
  ) {
    setDrafts((prev) => {
      const idx = prev.findIndex((b) => b._key === blockKey);
      const block = prev[idx];
      if (!block || block.type !== "container") return prev;
      const next = prev.map((b) => ({ ...b }));
      const container = next[idx];
      const c = normalizeContainerContent(container.content as any);
      const name = (container.content as any)?.name;
      const slots = c.slots.map((col) => [...col]);
      const col = slots[columnIndex] ?? [];
      const beforeIdx = col.findIndex((it) => it?._key === beforeItemKey);
      const insertIdx = beforeIdx === -1 ? col.length : beforeIdx;
      const newKey = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      col.splice(insertIdx, 0, {
        _key: newKey,
        type: contentType,
        content: { ...DEFAULT_SLOT_CONTENT[contentType] } as any,
      });
      slots[columnIndex] = col;
      container.content = { ...c, name, slots } as any;
      queueMicrotask(() => {
        setSelectedKey(blockKey);
        setFocusedItem({ blockKey, columnIndex, itemIndex: insertIdx });
      });
      return next;
    });
  }

  function handlePaletteDrop(paletteId: string, overId: string) {
    const paletteType = paletteId.replace("palette:", "");
    const isContentType = ["image", "text", "video", "title", "button"].includes(paletteType);
    const isContainerType = paletteType.startsWith("container-");

    const overItem = parseSidebarItemId(overId);
    const overCol = parseSidebarColumnId(overId);
    const isPreviewDrop = overId.startsWith("preview-drop:");
    const isSidebarDrop = overId === "sidebar-drop:append";
    const isBlockId = !overItem && !overCol && !isPreviewDrop && !isSidebarDrop;

    if (isContentType) {
      const contentType = paletteType as ContentBlockType;

      if (overCol) {
        addContentItem(overCol.blockKey, overCol.columnIndex, contentType);
        return;
      }
      if (overItem) {
        insertContentItemBefore(overItem.blockKey, overItem.columnIndex, overItem.itemKey, contentType);
        return;
      }
      if (isSidebarDrop) {
        handleAddContentBlock(contentType);
        return;
      }
      if (isPreviewDrop) {
        if (overId === "preview-drop:append") {
          handleAddContentBlock(contentType);
        } else {
          const m = overId.match(/^preview-drop:(.+):(\d+)$/);
          if (m) addContentItem(m[1], Number(m[2]), contentType);
        }
        return;
      }
      if (isBlockId) {
        insertContentBlockAt(overId, contentType);
        return;
      }
    }

    if (isContainerType) {
      const columns = Number(paletteType.split("-")[1]) as ContainerColumns;
      const targetBlock = overItem
        ? overItem.blockKey
        : overCol
          ? overCol.blockKey
          : isPreviewDrop
            ? overId.match(/^preview-drop:(.+):(\d+)$/)?.[1] ?? ""
            : isSidebarDrop
              ? ""
              : overId;
      if (targetBlock) insertBlockAt(targetBlock, "container", columns);
      else handleAddContainer(columns);
      return;
    }

    if (paletteType === "spacer") {
      const targetBlock = overItem
        ? overItem.blockKey
        : overCol
          ? overCol.blockKey
          : isPreviewDrop
            ? overId.match(/^preview-drop:(.+):(\d+)$/)?.[1] ?? ""
            : isSidebarDrop
              ? ""
              : overId;
      if (targetBlock) insertBlockAt(targetBlock, "spacer");
      else handleAddSpacer();
    }
  }

  const previewBlocks = React.useMemo(
    () => toPreviewBlocks(caseId, drafts),
    [caseId, drafts],
  );

  const hasChanges = React.useMemo(() => {
    const current = JSON.stringify(
      drafts.map((d) => ({ type: d.type, content: d.content })),
    );
    return current !== cleanSnapshotRef.current;
  }, [drafts]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setSidebarDraggingId(null);
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    let overId = String(over.id);

    // Palette drop
    if (activeId.startsWith("palette:")) {
      handlePaletteDrop(activeId, overId);
      return;
    }

    // 0) Sidebar content item -> column drop zone (append)
    if (activeId.startsWith("item:") && overId.startsWith("col:")) {
      const a = parseSidebarItemId(activeId);
      const o = parseSidebarColumnId(overId);
      if (!a || !o) return;

      setDrafts((prev) => {
        const fromIdx = prev.findIndex((b) => b._key === a.blockKey);
        const toIdx = prev.findIndex((b) => b._key === o.blockKey);
        const fromBlock = prev[fromIdx];
        const toBlock = prev[toIdx];
        if (!fromBlock || fromBlock.type !== "container") return prev;
        if (!toBlock || toBlock.type !== "container") return prev;

        const next = prev.map((b) => ({ ...b }));
        const fromContainer = next[fromIdx];
        const toContainer = next[toIdx];

        const fromC = normalizeContainerContent(fromContainer.content as any);
        const toC =
          fromIdx === toIdx ? fromC : normalizeContainerContent(toContainer.content as any);

        const fromName = (fromContainer.content as any)?.name;
        const toName = (toContainer.content as any)?.name;

        const fromSlots = fromC.slots.map((col) => [...col]);
        const toSlots = fromIdx === toIdx ? fromSlots : toC.slots.map((col) => [...col]);

        const fromCol = fromSlots[a.columnIndex] ?? [];
        const toCol = toSlots[o.columnIndex] ?? [];

        const oldIndex = fromCol.findIndex((it) => it?._key === a.itemKey);
        if (oldIndex === -1) return prev;

        const [moving] = fromCol.splice(oldIndex, 1);
        if (!moving) return prev;

        const destIndex = toCol.length;
        toCol.push(moving);

        fromSlots[a.columnIndex] = fromCol;
        toSlots[o.columnIndex] = toCol;

        fromContainer.content = { ...fromC, name: fromName, slots: fromSlots } as any;
        toContainer.content = { ...toC, name: toName, slots: toSlots } as any;

        queueMicrotask(() => {
          setSelectedKey(o.blockKey);
          setFocusedItem({ blockKey: o.blockKey, columnIndex: o.columnIndex, itemIndex: destIndex });
        });

        return next;
      });
      return;
    }

    // 1) Sidebar content items (inside container)
    if (activeId.startsWith("item:") && overId.startsWith("item:")) {
      const a = parseSidebarItemId(activeId);
      const o = parseSidebarItemId(overId);
      if (!a || !o) return;

      setDrafts((prev) => {
        const fromIdx = prev.findIndex((b) => b._key === a.blockKey);
        const toIdx = prev.findIndex((b) => b._key === o.blockKey);
        const fromBlock = prev[fromIdx];
        const toBlock = prev[toIdx];
        if (!fromBlock || fromBlock.type !== "container") return prev;
        if (!toBlock || toBlock.type !== "container") return prev;

        const next = prev.map((b) => ({ ...b }));
        const fromContainer = next[fromIdx];
        const toContainer = next[toIdx];

        const fromC = normalizeContainerContent(fromContainer.content as any);
        const toC =
          fromIdx === toIdx
            ? fromC
            : normalizeContainerContent(toContainer.content as any);

        const fromSlots = fromC.slots.map((col) => [...col]);
        const toSlots = fromIdx === toIdx ? fromSlots : toC.slots.map((col) => [...col]);

        const fromCol = fromSlots[a.columnIndex] ?? [];
        const toCol = toSlots[o.columnIndex] ?? [];

        const oldIndex = fromCol.findIndex((it) => it?._key === a.itemKey);
        const newIndex = toCol.findIndex((it) => it?._key === o.itemKey);
        if (oldIndex === -1 || newIndex === -1) return prev;

        if (a.blockKey === o.blockKey && a.columnIndex === o.columnIndex) {
          fromSlots[a.columnIndex] = arrayMove(fromCol, oldIndex, newIndex);
          fromContainer.content = { ...fromC, slots: fromSlots } as any;
        } else {
          const [moving] = fromCol.splice(oldIndex, 1);
          if (!moving) return prev;
          toCol.splice(newIndex, 0, moving);
          fromSlots[a.columnIndex] = fromCol;
          toSlots[o.columnIndex] = toCol;

          fromContainer.content = { ...fromC, slots: fromSlots } as any;
          toContainer.content = { ...toC, slots: toSlots } as any;
        }

        queueMicrotask(() => {
          setSelectedKey(o.blockKey);
          setFocusedItem({
            blockKey: o.blockKey,
            columnIndex: o.columnIndex,
            itemIndex: newIndex,
          });
        });

        return next;
      });
      return;
    }

    // 2) Sidebar blocks
    if (!activeId.startsWith("item:") && overId.startsWith("item:")) {
      const parsed = parseSidebarItemId(overId);
      if (parsed) overId = parsed.blockKey;
    }
    setDrafts((prev) => {
      const oldIndex = prev.findIndex((b) => b._key === activeId);
      const newIndex = prev.findIndex((b) => b._key === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setSidebarDraggingId(id);
    if (id.startsWith("palette:")) {
      setAddMenuOpen(false);
    }
  }

  function addContainer(columns: ContainerColumns) {
    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const draft: DraftBlock = {
      _key: id,
      id,
      type: "container",
      content: createContainerContent(columns),
      sort_order: drafts.length,
    };
    setDrafts((prev) => [...prev, draft]);
    setSelectedKey(draft._key);
  }

  function addSpacer() {
    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const draft: DraftBlock = {
      _key: id,
      id,
      type: "spacer",
      content: { ...DEFAULT_SPACER_CONTENT },
      sort_order: drafts.length,
    };
    setDrafts((prev) => [...prev, draft]);
    setSelectedKey(draft._key);
  }

  function deleteBlock(key: string) {
    setDrafts((prev) => prev.filter((b) => b._key !== key));
    setFocusedItem((prev) => (prev?.blockKey === key ? null : prev));
    setSelectedKey((prev) => {
      if (prev !== key) return prev;
      const idx = drafts.findIndex((b) => b._key === key);
      const next = drafts[idx + 1]?._key ?? drafts[idx - 1]?._key ?? null;
      return next;
    });
  }

  function updateBlock(key: string, content: DraftBlock["content"]) {
    setDrafts((prev) => prev.map((b) => (b._key === key ? { ...b, content } : b)));
  }

  function applyTemplate(template: CaseTemplate) {
    const blocks = template.create();
    setDrafts(blocks);
    setSelectedKey(blocks[0]?._key ?? null);
    setFocusedItem(null);
    setExpandedBlocks(
      Object.fromEntries(blocks.filter((b) => b.type === "container").map((b) => [b._key, true])),
    );
    setTemplatesOpen(false);
    toast.success(`Template "${template.name}" aplicado.`);
  }

  function applyCustomTemplate(template: CustomCaseTemplate) {
    const blocks = createBlocksFromCustomTemplate(template);
    setDrafts(blocks);
    setSelectedKey(blocks[0]?._key ?? null);
    setFocusedItem(null);
    setExpandedBlocks(
      Object.fromEntries(blocks.filter((b) => b.type === "container").map((b) => [b._key, true])),
    );
    setTemplatesOpen(false);
    setSaveTemplateForm(null);
    toast.success(`Template "${template.name}" aplicado.`);
  }

  async function handleSaveAsTemplate() {
    if (!saveTemplateForm?.name.trim()) return;
    setSavingTemplate(true);
    try {
      await saveAsTemplate(
        company.group_id,
        saveTemplateForm.name.trim(),
        saveTemplateForm.description.trim(),
        drafts,
      );
      qc.invalidateQueries({ queryKey: ["admin", "custom-templates", company.group_id] });
      setSaveTemplateForm(null);
      toast.success("Template salvo.");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar template.");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    setDeletingTemplateId(templateId);
    try {
      await deleteTemplate(templateId);
      qc.invalidateQueries({ queryKey: ["admin", "custom-templates", company.group_id] });
      toast.success("Template removido.");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao remover template.");
    } finally {
      setDeletingTemplateId(null);
    }
  }

  function setContainerColumns(blockKey: string, columns: ContainerColumns) {
    setDrafts((prev) => {
      const idx = prev.findIndex((b) => b._key === blockKey);
      const block = prev[idx];
      if (!block || block.type !== "container") return prev;
      const next = prev.map((b) => ({ ...b }));
      const d = next[idx];
      const c = normalizeContainerContent(d.content as any);
      const name = (d.content as any)?.name;
      const currentSlots = c.slots;
      const nextSlots = Array.from({ length: columns }, (_, i) => currentSlots[i] ?? []);
      d.content = { ...c, name, columns, slots: nextSlots } as any;
      return next;
    });
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setSavedDialogData(null);
    setSavedDialogOpen(false);
    try {
      await caseConfigFormRef.current?.submit?.();
      await saveCaseBlocks(caseId, drafts);

      // Persist page-level settings (only saved on explicit Save/Publish)
      const effectivePageBg = pageBackgroundRef.current ?? pageBackground;
      const layout = containerLayoutRef.current;
      const { error: pageErr } = await supabase
        .from("cases")
        .update({
          page_background: effectivePageBg,
          container_padding: Math.max(0, Math.min(120, layout.padding)),
          container_radius: Math.max(0, Math.min(48, layout.radius)),
          container_gap: Math.max(0, Math.min(60, layout.gap)),
        })
        .eq("id", caseId);
      if (pageErr) throw pageErr;

      await qc.invalidateQueries({ queryKey: ["admin", "case", caseId, "blocks"] });
      await qc.invalidateQueries({ queryKey: ["admin", "case", caseId] });
      const caseData = await qc.fetchQuery({ queryKey: ["admin", "case", caseId] }) as CaseRow | undefined;
      if (caseData?.slug) {
        setSavedDialogData({
          slug: caseData.slug,
          title: caseData.title ?? null,
          cover_image_url: caseData.cover_image_url ?? null,
          cover_video_url: caseData.cover_video_url ?? null,
          cover_mux_playback_id: caseData.cover_mux_playback_id ?? null,
        });
        setSavedDialogOpen(true);
      } else {
        toast.success("Salvo.");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function setVisibility(next: "draft" | "published" | "restricted") {
    try {
      const payload =
        next === "draft"
          ? { status: "draft", published_at: null }
          : { status: next, published_at: new Date().toISOString() };

      const { data, error } = await supabase
        .from("cases")
        .update(payload)
        .eq("id", caseId)
        .select("status,published_at")
        .maybeSingle();
      if (error) throw error;

      // Optimistic cache update (instant badge refresh)
      if (data) {
        qc.setQueryData(["admin", "case", caseId], (prev: any) => {
          if (!prev) return prev;
          return { ...prev, status: data.status, published_at: data.published_at };
        });
      }

      await qc.invalidateQueries({ queryKey: ["admin", "case", caseId] });
      await qc.invalidateQueries({ queryKey: ["admin", "cases"] });

      const messages: Record<string, string> = {
        published: "Case agora está visível.",
        restricted: "Case agora é restrito (acesso com senha).",
        draft: "Case voltou para rascunho.",
      };
      toast.success(messages[next]);
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível atualizar a visibilidade.");
    }
  }

  async function renameCaseTitle(nextTitle: string) {
    try {
      const { data, error } = await supabase
        .from("cases")
        .update({ title: nextTitle })
        .eq("id", caseId)
        .select("title")
        .maybeSingle();
      if (error) throw error;

      if (data?.title) {
        qc.setQueryData(["admin", "case", caseId], (prev: any) => {
          if (!prev) return prev;
          return { ...prev, title: data.title };
        });
      }

      await qc.invalidateQueries({ queryKey: ["admin", "case", caseId] });
      await qc.invalidateQueries({ queryKey: ["admin", "cases"] });
      toast.success("Título atualizado.");
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível atualizar o título.");
      throw err;
    }
  }

  async function setClientId(nextClientId: string) {
    try {
      const { data, error } = await supabase
        .from("cases")
        .update({ client_id: nextClientId })
        .eq("id", caseId)
        .select("client_id,clients(id,name)")
        .maybeSingle();
      if (error) throw error;

      if (data?.clients) {
        qc.setQueryData(["admin", "case", caseId], (prev: any) => {
          if (!prev) return prev;
          return { ...prev, clients: data.clients };
        });
      }

      await qc.invalidateQueries({ queryKey: ["admin", "case", caseId] });
      await qc.invalidateQueries({ queryKey: ["admin", "cases"] });
      toast.success("Cliente atualizado.");
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível atualizar o cliente.");
      throw err;
    }
  }

  async function publish() {
    if (publishing) return;
    setPublishing(true);
    try {
      // Salvar configurações da página (título, slug, summary, cover, etc.)
      await caseConfigFormRef.current?.submit?.();
      await saveCaseBlocks(caseId, drafts);

      const effectivePageBg = pageBackgroundRef.current ?? pageBackground;
      const layout = containerLayoutRef.current;
      const { error } = await supabase
        .from("cases")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          page_background: effectivePageBg,
          container_padding: layout.padding,
          container_radius: layout.radius,
          container_gap: layout.gap,
        })
        .eq("id", caseId);
      if (error) throw error;

      cleanSnapshotRef.current = JSON.stringify(
        drafts.map((d) => ({ type: d.type, content: d.content })),
      );

      await qc.invalidateQueries({ queryKey: ["admin", "case", caseId] });
      await qc.invalidateQueries({ queryKey: ["admin", "case", caseId, "blocks"] });
      await qc.invalidateQueries({ queryKey: ["admin", "cases"] });
      toast.success("Case publicado.");
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível publicar o case.");
    } finally {
      setPublishing(false);
    }
  }

  const selected = drafts.find((d) => d._key === selectedKey) ?? null;
  const focusItem =
    selected?.type === "container" && focusedItem?.blockKey === selected._key
      ? { columnIndex: focusedItem.columnIndex, itemIndex: focusedItem.itemIndex }
      : null;

  const activePreviewTarget = React.useMemo<PreviewTarget | null>(() => {
    if (focusedItem) {
      return {
        blockId: focusedItem.blockKey,
        columnIndex: focusedItem.columnIndex,
        itemIndex: focusedItem.itemIndex,
      };
    }
    return selectedKey ? { blockId: selectedKey } : null;
  }, [focusedItem, selectedKey]);

  const previewHighlightTarget = hoveredPreviewTarget ?? activePreviewTarget;

  // Scroll sidebar tree to the active element when selection changes
  React.useEffect(() => {
    if (!selectedKey || selectedKey === PAGE_PANEL_KEY) return;

    // Build the data-tree-id we want to scroll to
    let treeId: string;
    if (focusedItem && focusedItem.blockKey === selectedKey) {
      // Find the _key for the item so we can match the tree node
      const block = drafts.find((d) => d._key === focusedItem.blockKey);
      if (block?.type === "container") {
        const c = normalizeContainerContent(block.content as any);
        const col = c.slots[focusedItem.columnIndex] ?? [];
        const item = col[focusedItem.itemIndex] as any;
        const itemKey = item?._key ?? "";
        treeId = `item:${focusedItem.blockKey}:${focusedItem.columnIndex}:${itemKey}`;
      } else {
        treeId = selectedKey;
      }
    } else {
      treeId = selectedKey;
    }

    // Small delay to allow expanded blocks to render their children
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-tree-id="${treeId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [selectedKey, focusedItem?.blockKey, focusedItem?.columnIndex, focusedItem?.itemIndex]);

  function moveContentItem(intent: {
    from: { blockId: string; columnIndex: number; itemKey: string };
    to: { blockId: string; columnIndex: number; beforeItemKey: string | null };
  }) {
    setDrafts((prev) => {
      const fromIdx = prev.findIndex((b) => b._key === intent.from.blockId);
      const toIdx = prev.findIndex((b) => b._key === intent.to.blockId);
      const fromBlock = prev[fromIdx];
      const toBlock = prev[toIdx];
      if (!fromBlock || fromBlock.type !== "container") return prev;
      if (!toBlock || toBlock.type !== "container") return prev;

      const next = prev.map((b) => ({ ...b }));
      const fromContainer = next[fromIdx];
      const toContainer = next[toIdx];

      const fromC = normalizeContainerContent(fromContainer.content as any);
      const toC =
        fromIdx === toIdx
          ? fromC
          : normalizeContainerContent(toContainer.content as any);

      const fromSlots = fromC.slots.map((col) => [...col]);
      const toSlots = fromIdx === toIdx ? fromSlots : toC.slots.map((col) => [...col]);

      const fromColIndex = intent.from.columnIndex;
      const toColIndex = intent.to.columnIndex;

      const fromCol = fromSlots[fromColIndex] ?? [];
      const toCol = toSlots[toColIndex] ?? [];

      if (intent.to.beforeItemKey && intent.to.beforeItemKey === intent.from.itemKey) {
        return prev;
      }

      const oldIndex = fromCol.findIndex((it) => it?._key === intent.from.itemKey);
      if (oldIndex === -1) return prev;

      const [moving] = fromCol.splice(oldIndex, 1);
      if (!moving) return prev;

      const beforeIndex =
        intent.to.beforeItemKey == null
          ? -1
          : toCol.findIndex((it) => it?._key === intent.to.beforeItemKey);
      const destIndex = beforeIndex === -1 ? toCol.length : beforeIndex;

      toCol.splice(destIndex, 0, moving);

      fromSlots[fromColIndex] = fromCol;
      toSlots[toColIndex] = toCol;

      fromContainer.content = { ...fromC, slots: fromSlots } as any;
      toContainer.content = { ...toC, slots: toSlots } as any;

      queueMicrotask(() => {
        setSelectedKey(intent.to.blockId);
        setFocusedItem({
          blockKey: intent.to.blockId,
          columnIndex: toColIndex,
          itemIndex: destIndex,
        });
      });

      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[#fbfbf9] text-black">
      <CaseEditorTopBar
        caseId={caseId}
        title={caseQuery.data?.title}
        slug={caseQuery.data?.slug}
        status={caseQuery.data?.status}
        client={caseQuery.data?.clients ?? null}
        onSetClientId={setClientId}
        onRenameTitle={renameCaseTitle}
        centerContent={
          <div className="inline-flex items-center gap-1" aria-label="Ações do preview">
            <button
              type="button"
              className={cn(
                "h-9 w-9 rounded-lg",
                "grid place-items-center",
                "text-black/60 hover:text-black/80 hover:bg-black/[0.04]",
                "transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
              onClick={() => setPageSettingsOpen(true)}
              aria-label="Configurações"
              title="Configurações"
            >
              <Settings2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={cn(
                "h-9 w-9 rounded-lg",
                "grid place-items-center",
                "text-black/60 hover:text-black/80 hover:bg-black/[0.04]",
                "transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
              onClick={() => setTemplatesOpen(true)}
              aria-label="Templates"
              title="Templates"
            >
              <LayoutTemplate className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="w-px h-5 bg-black/10 mx-0.5" aria-hidden="true" />
            <button
              type="button"
              className={cn(
                "h-9 w-9 rounded-lg",
                "grid place-items-center",
                "transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                previewViewport === "desktop"
                  ? "text-black bg-black/[0.06]"
                  : "text-black/60 hover:text-black/80 hover:bg-black/[0.04]",
              )}
              onClick={() => setPreviewViewport("desktop")}
              aria-label="Visualização desktop"
              title="Desktop"
            >
              <Monitor className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={cn(
                "h-9 w-9 rounded-lg",
                "grid place-items-center",
                "transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                previewViewport === "tablet"
                  ? "text-black bg-black/[0.06]"
                  : "text-black/60 hover:text-black/80 hover:bg-black/[0.04]",
              )}
              onClick={() => setPreviewViewport("tablet")}
              aria-label="Visualização tablet (iPad)"
              title="iPad"
            >
              <Tablet className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={cn(
                "h-9 w-9 rounded-lg",
                "grid place-items-center",
                "transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                previewViewport === "mobile"
                  ? "text-black bg-black/[0.06]"
                  : "text-black/60 hover:text-black/80 hover:bg-black/[0.04]",
              )}
              onClick={() => setPreviewViewport("mobile")}
              aria-label="Visualização mobile"
              title="Mobile"
            >
              <Smartphone className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        }
        onSave={
          caseQuery.data?.status === "published" || caseQuery.data?.status === "restricted"
            ? handleSave
            : publish
        }
        onSaveAsTemplate={() => {
          setTemplatesOpen(true);
          setSaveTemplateForm({ name: "", description: "" });
        }}
        isSaving={saving || publishing}
        onSetVisibility={setVisibility}
        hasChanges={hasChanges}
      />

      {/* Full screen body */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
      <div className="h-[calc(100vh-56px)] grid grid-cols-[300px_1fr_300px]">
        {/* Left: blocks sidebar */}
        <div className="border-r border-[#f6f5f1] bg-white">
          {/* Header */}
          <div className="p-4 flex items-center justify-between gap-3 border-b border-[#f6f5f1]">
            <div className="min-w-0">
              <div className="text-xs text-black/40">Estrutura</div>
              <div className="text-sm font-medium truncate">Árvore de elementos</div>
            </div>
            <div className="relative flex items-center gap-2">
              <button
                ref={addButtonRef}
                type="button"
                onClick={() => {
                  setEmptyZoneBlockMenuOpen(false);
                  setAddMenuOpen((v) => !v);
                }}
                className="h-8 w-8 rounded-full bg-[#f2f0eb] ring-1 ring-black/5 grid place-items-center text-black/60 hover:bg-[#ebe7df] transition-colors"
                aria-label="Adicionar bloco"
                aria-expanded={addMenuOpen}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>

              {addMenuOpen ? (
                <div
                  ref={addMenuRef}
                  role="menu"
                  aria-label="Adicionar bloco"
                  className={cn(
                    "absolute right-0 top-full mt-2 z-50 w-56",
                    "rounded-2xl border border-border bg-white shadow-[0_18px_40px_-20px_rgba(0,0,0,0.25)]",
                    "ring-1 ring-black/5 p-1.5",
                  )}
                >
                  <div className="px-2 py-1.5 text-[11px] text-black/40">
                    Conteúdo
                  </div>

                  <PaletteDragItem id="palette:image" onClick={() => handleAddContentBlock("image")}>
                    <Image className="h-4 w-4 text-black/60" aria-hidden="true" />
                    Imagem
                  </PaletteDragItem>
                  <PaletteDragItem id="palette:text" onClick={() => handleAddContentBlock("text")}>
                    <Type className="h-4 w-4 text-black/60" aria-hidden="true" />
                    Texto
                  </PaletteDragItem>
                  <PaletteDragItem id="palette:video" onClick={() => handleAddContentBlock("video")}>
                    <Video className="h-4 w-4 text-black/60" aria-hidden="true" />
                    Vídeo
                  </PaletteDragItem>
                  <PaletteDragItem id="palette:title" onClick={() => handleAddContentBlock("title")}>
                    <Heading className="h-4 w-4 text-black/60" aria-hidden="true" />
                    Título
                  </PaletteDragItem>
                  <PaletteDragItem id="palette:button" onClick={() => handleAddContentBlock("button")}>
                    <LinkIcon className="h-4 w-4 text-black/60" aria-hidden="true" />
                    Botão
                  </PaletteDragItem>

                  <div className="my-1 h-px bg-border" role="separator" />

                  <div className="px-2 py-1.5 text-[11px] text-black/40">
                    Layout
                  </div>

                  <PaletteDragItem id="palette:container-1" onClick={() => handleAddContainer(1)}>
                    <Square className="h-4 w-4 text-black/60" aria-hidden="true" />
                    Container · 1 coluna
                  </PaletteDragItem>
                  <PaletteDragItem id="palette:container-2" onClick={() => handleAddContainer(2)}>
                    <Columns2 className="h-4 w-4 text-black/60" aria-hidden="true" />
                    Container · 2 colunas
                  </PaletteDragItem>
                  <PaletteDragItem id="palette:container-3" onClick={() => handleAddContainer(3)}>
                    <Columns3 className="h-4 w-4 text-black/60" aria-hidden="true" />
                    Container · 3 colunas
                  </PaletteDragItem>
                  <PaletteDragItem id="palette:container-4" onClick={() => handleAddContainer(4)}>
                    <Columns4 className="h-4 w-4 text-black/60" aria-hidden="true" />
                    Container · 4 colunas
                  </PaletteDragItem>

                  <div className="my-1 h-px bg-border" role="separator" />

                  <PaletteDragItem id="palette:spacer" onClick={handleAddSpacer}>
                    <Space className="h-4 w-4 text-black/60" aria-hidden="true" />
                    Espaço
                  </PaletteDragItem>
                </div>
              ) : null}
            </div>
          </div>

          {/* Block picker dropdown for empty zones (preview + sidebar "Adicionar bloco") */}
          {emptyZoneBlockMenuOpen && emptyZoneBlockMenuAnchor
            ? createPortal(
                <div
                  ref={emptyZoneBlockMenuRef}
                  role="menu"
                  aria-label="Escolher tipo de bloco"
                  className={cn(
                    "fixed z-[100] w-56",
                    "rounded-2xl border border-border bg-white shadow-[0_18px_40px_-20px_rgba(0,0,0,0.25)]",
                    "ring-1 ring-black/5 p-1.5",
                  )}
                  style={{
                    top: emptyZoneBlockMenuAnchor.bottom + 8,
                    left: emptyZoneBlockMenuAnchor.left,
                  }}
                >
                  <div className="px-2 py-1.5 text-[11px] text-black/40">
                    Conteúdo
                  </div>
                  <PaletteDragItem id="palette:image" onClick={() => handleAddContentBlock("image")}>
                    <Image className="h-4 w-4 text-black/60" aria-hidden="true" />
                    Imagem
                  </PaletteDragItem>
                  <PaletteDragItem id="palette:text" onClick={() => handleAddContentBlock("text")}>
                    <Type className="h-4 w-4 text-black/60" aria-hidden="true" />
                    Texto
                  </PaletteDragItem>
                  <PaletteDragItem id="palette:video" onClick={() => handleAddContentBlock("video")}>
                    <Video className="h-4 w-4 text-black/60" aria-hidden="true" />
                    Vídeo
                  </PaletteDragItem>
                  <PaletteDragItem id="palette:title" onClick={() => handleAddContentBlock("title")}>
                    <Heading className="h-4 w-4 text-black/60" aria-hidden="true" />
                    Título
                  </PaletteDragItem>
                  <PaletteDragItem id="palette:button" onClick={() => handleAddContentBlock("button")}>
                    <LinkIcon className="h-4 w-4 text-black/60" aria-hidden="true" />
                    Botão
                  </PaletteDragItem>
                  <div className="my-1 h-px bg-border" role="separator" />
                  <div className="px-2 py-1.5 text-[11px] text-black/40">
                    Layout
                  </div>
                  <PaletteDragItem id="palette:container-1" onClick={() => handleAddContainer(1)}>
                    <Square className="h-4 w-4 text-black/60" aria-hidden="true" />
                    Container · 1 coluna
                  </PaletteDragItem>
                  <PaletteDragItem id="palette:container-2" onClick={() => handleAddContainer(2)}>
                    <Columns2 className="h-4 w-4 text-black/60" aria-hidden="true" />
                    Container · 2 colunas
                  </PaletteDragItem>
                  <PaletteDragItem id="palette:container-3" onClick={() => handleAddContainer(3)}>
                    <Columns3 className="h-4 w-4 text-black/60" aria-hidden="true" />
                    Container · 3 colunas
                  </PaletteDragItem>
                  <PaletteDragItem id="palette:container-4" onClick={() => handleAddContainer(4)}>
                    <Columns4 className="h-4 w-4 text-black/60" aria-hidden="true" />
                    Container · 4 colunas
                  </PaletteDragItem>
                  <div className="my-1 h-px bg-border" role="separator" />
                  <PaletteDragItem id="palette:spacer" onClick={handleAddSpacer}>
                    <Space className="h-4 w-4 text-black/60" aria-hidden="true" />
                    Espaço
                  </PaletteDragItem>
                </div>,
                document.body,
              )
            : null}

          <div className="px-4 py-3">
            <div className="rounded-2xl bg-[#fbfbf9] ring-1 ring-[#f2f0eb] p-2">
              {/* Root */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden="true"
                    className="h-8 w-8 rounded-xl bg-[#f2f0eb] ring-1 ring-black/5 grid place-items-center shrink-0"
                  >
                    <LayoutTemplate className="h-4 w-4 text-black/70" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {caseQuery.data?.title ?? "Carregando…"}
                    </div>
                  </div>
                </div>

                <div className="relative shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTemplatesOpen(true)}
                    className={cn(
                      "h-8 w-8 rounded-full",
                      "bg-white/70 hover:bg-white",
                      "ring-1 ring-black/5",
                      "grid place-items-center",
                      "text-black/60 hover:text-black/80",
                    )}
                    aria-label="Templates"
                    title="Usar template"
                  >
                    <LayoutTemplate className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedKey(PAGE_PANEL_KEY);
                    }}
                    className={cn(
                      "h-8 w-8 rounded-full",
                      "bg-white/70 hover:bg-white",
                      "ring-1 ring-black/5",
                      "grid place-items-center",
                      "text-black/60",
                      selectedKey === PAGE_PANEL_KEY && "bg-white text-black/80 ring-black/10",
                    )}
                    aria-label="Configurações da página"
                    aria-expanded={selectedKey === PAGE_PANEL_KEY}
                  >
                    <Settings2 className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <Dialog open={pageSettingsOpen} onOpenChange={setPageSettingsOpen}>
                    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Configurações do case</DialogTitle>
                        <DialogDescription>
                          Edite as configurações básicas e aparência da página.
                        </DialogDescription>
                      </DialogHeader>

                      <CaseEditorPhase1
                        caseData={caseQuery.data ?? null}
                        onSaved={(savedId) => {
                          qc.invalidateQueries({ queryKey: ["admin", "cases"] });
                          qc.invalidateQueries({ queryKey: ["admin", "case", savedId] });
                        }}
                      />

                      <div className="space-y-3 border-t border-border pt-4">
                        <div className="text-sm font-medium">Cor do background</div>

                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: "Padrão", value: null as string | null },
                            { label: "Off-white", value: "#fbfbf9" },
                            { label: "Branco", value: "#ffffff" },
                            { label: "Preto", value: "#0b0b0b" },
                          ].map((opt) => {
                            const isActive =
                              (opt.value ?? null) === (pageBackground ?? null);
                            return (
                              <button
                                key={opt.label}
                                type="button"
                                onClick={() => savePageBackground(opt.value)}
                                className={cn(
                                  "px-2.5 py-1.5 rounded-xl text-[11px] font-medium",
                                  "ring-1 ring-border",
                                  isActive
                                    ? "bg-primary/10 text-primary ring-primary/20"
                                    : "bg-white text-black/70 hover:bg-black/[0.03]",
                                )}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] text-black/50">
                            Personalizar
                          </div>
                          <input
                            type="color"
                            value={
                              pageBackground && pageBackground.startsWith("#")
                                ? pageBackground
                                : "#fbfbf9"
                            }
                            onChange={(e) => savePageBackground(e.target.value)}
                            className="h-8 w-10 rounded-md border border-border bg-white"
                            aria-label="Selecionar cor do background"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 border-t border-border pt-4">
                        <div className="text-sm font-medium">Layout dos containers</div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Padding geral</span>
                              <span>{containerPaddingDraft}px</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={120}
                              step={4}
                              value={containerPaddingDraft}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setContainerPaddingDraft(v);
                                savePageContainerLayout(v, containerRadiusDraft, containerGapDraft);
                              }}
                              className="w-full h-2 rounded-full appearance-none bg-muted accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
                              aria-label="Padding geral em pixels"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Borda arredondada</span>
                              <span>{containerRadiusDraft}px</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={48}
                              step={2}
                              value={containerRadiusDraft}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setContainerRadiusDraft(v);
                                savePageContainerLayout(containerPaddingDraft, v, containerGapDraft);
                              }}
                              className="w-full h-2 rounded-full appearance-none bg-muted accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
                              aria-label="Borda arredondada em pixels"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Gap entre containers</span>
                              <span>{containerGapDraft}px</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={60}
                              step={2}
                              value={containerGapDraft}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setContainerGapDraft(v);
                                savePageContainerLayout(containerPaddingDraft, containerRadiusDraft, v);
                              }}
                              className="w-full h-2 rounded-full appearance-none bg-muted accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
                              aria-label="Gap entre containers em pixels"
                            />
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={savedDialogOpen} onOpenChange={setSavedDialogOpen}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Projeto publicado com sucesso</DialogTitle>
                        <DialogDescription>
                          Seu case foi salvo. Compartilhe o link abaixo.
                        </DialogDescription>
                      </DialogHeader>
                      {savedDialogData && (
                        <div className="space-y-4 pt-2">
                          {savedDialogData.cover_mux_playback_id ? (
                            <div className="overflow-hidden rounded-xl border border-[#f2f0eb] bg-[#fbfbf9] aspect-video">
                              <MuxPlayer
                                playbackId={savedDialogData.cover_mux_playback_id}
                                streamType="on-demand"
                                className="h-full w-full"
                                style={{ ["--controls" as any]: "none", ["--center-controls" as any]: "none", ["--top-controls" as any]: "none", ["--bottom-controls" as any]: "none" } as React.CSSProperties}
                                poster={savedDialogData.cover_image_url || undefined}
                                muted
                                autoPlay="muted"
                                loop
                                playsInline
                              />
                            </div>
                          ) : savedDialogData.cover_video_url ? (
                            <div className="overflow-hidden rounded-xl border border-[#f2f0eb] bg-[#fbfbf9] aspect-video">
                              <video
                                src={savedDialogData.cover_video_url}
                                className="h-full w-full object-cover"
                                poster={savedDialogData.cover_image_url || undefined}
                                muted
                                autoPlay
                                loop
                                playsInline
                              />
                            </div>
                          ) : savedDialogData.cover_image_url ? (
                            <div className="overflow-hidden rounded-xl border border-[#f2f0eb] bg-[#fbfbf9] aspect-video">
                              <img
                                src={savedDialogData.cover_image_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : null}
                          {savedDialogData.title && (
                            <p className="text-sm font-medium text-black/80 truncate">
                              {savedDialogData.title}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={
                                typeof window !== "undefined"
                                  ? `${window.location.origin}/cases/${savedDialogData.slug}`
                                  : ""
                              }
                              className="flex-1 min-w-0 h-10 rounded-lg border border-input bg-[#fbfbf9] px-3 text-sm text-black/70"
                              aria-label="Link do case"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="shrink-0 h-10 w-10"
                              onClick={() => {
                                const url =
                                  typeof window !== "undefined"
                                    ? `${window.location.origin}/cases/${savedDialogData.slug}`
                                    : "";
                                void navigator.clipboard.writeText(url).then(() => {
                                  toast.success("Link copiado!");
                                });
                              }}
                              aria-label="Copiar link"
                            >
                              <Copy className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>
                          <Button
                            type="button"
                            className="w-full h-11 gap-2 rounded-xl font-medium shadow-sm hover:shadow transition-shadow bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => {
                              const url =
                                typeof window !== "undefined"
                                  ? `${window.location.origin}/cases/${savedDialogData.slug}`
                                  : "";
                              window.open(url, "_blank", "noreferrer");
                            }}
                            aria-label="Abrir case"
                          >
                            <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                            Abrir case
                          </Button>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="mt-2 h-px w-full bg-black/[0.06]" aria-hidden="true" />

              <div className="mt-2 space-y-1.5">
                <div className="overflow-auto max-h-[calc(100vh-56px-220px)] pr-1">
                  {blocksQuery.isLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-14 rounded-xl bg-black/[0.03] animate-pulse" />
                      ))}
                    </div>
                  ) : (
                      <SortableContext
                        items={drafts.map((d) => d._key)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-1.5">
                          {drafts.length === 0 ? (
                            <EmptySidebarBlocksDropZone
                              onAddClick={(e) => {
                                const r = e.currentTarget.getBoundingClientRect();
                                setEmptyZoneBlockMenuAnchor({
                                  bottom: r.bottom,
                                  left: r.left,
                                  width: r.width,
                                });
                                setEmptyZoneBlockMenuOpen(true);
                              }}
                            />
                          ) : null}
                          {drafts.map((b, idx) => {
                            const isExpanded =
                              b.type === "container"
                                ? expandedBlocks[b._key] !== false
                                : false;

                            const childNodes =
                              b.type === "container" && isExpanded ? (
                                <div className="space-y-1.5">
                                  <div className="relative">
                                    <button
                                      ref={(node) => {
                                        if (addContentMenu?.blockKey === b._key) {
                                          addContentButtonRef.current = node;
                                        }
                                      }}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedKey(b._key);
                                        setFocusedItem(null);
                                        setAddContentMenu((prev) =>
                                          prev?.blockKey === b._key && prev.columnIndex === null
                                            ? null
                                            : { blockKey: b._key, columnIndex: null },
                                        );
                                        const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                        setAddContentAnchor({
                                          top: r.top,
                                          left: r.left,
                                          right: r.right,
                                          bottom: r.bottom,
                                        });
                                      }}
                                      className={cn(
                                        "w-full text-left",
                                        "rounded-lg px-2 py-1",
                                        "flex items-center gap-2",
                                        "text-sm text-primary",
                                        "hover:bg-black/[0.03] transition-colors",
                                      )}
                                      aria-haspopup="menu"
                                      aria-expanded={
                                        addContentMenu?.blockKey === b._key &&
                                        addContentMenu.columnIndex === null
                                      }
                                    >
                                      <span
                                        className="h-6 w-6 rounded-lg grid place-items-center"
                                        aria-hidden="true"
                                      >
                                        <Plus className="h-4 w-4" aria-hidden="true" />
                                      </span>
                                      Adicionar conteúdo
                                    </button>
                                  </div>

                                  {(() => {
                                    const c = normalizeContainerContent(b.content as any);
                                    const showColumns = c.columns > 1;

                                    return c.slots.map((items, colIdx) => (
                                      <div key={colIdx} className="space-y-1">
                                        {showColumns ? (
                                          <div className="px-1 text-[11px] font-medium text-black/40">
                                            Coluna {String(colIdx + 1).padStart(2, "0")}
                                          </div>
                                        ) : null}

                                        <div className="space-y-0.5">
                                          <div className="px-2">
                                            <SidebarColumnDropZone
                                              id={`col:${b._key}:${colIdx}`}
                                              empty={items.length === 0}
                                              show={Boolean(sidebarDraggingId?.startsWith("item:"))}
                                              onClick={(e) => {
                                                setSelectedKey(b._key);
                                                setFocusedItem(null);
                                                setAddContentMenu((prev) =>
                                                  prev?.blockKey === b._key &&
                                                  prev.columnIndex === colIdx
                                                    ? null
                                                    : { blockKey: b._key, columnIndex: colIdx },
                                                );
                                                const r = (
                                                  e.currentTarget as HTMLButtonElement
                                                ).getBoundingClientRect();
                                                setAddContentAnchor({
                                                  top: r.top,
                                                  left: r.left,
                                                  right: r.right,
                                                  bottom: r.bottom,
                                                });
                                              }}
                                            />
                                          </div>
                                          <SortableContext
                                            items={items.map(
                                              (it) =>
                                                `item:${b._key}:${colIdx}:${String(
                                                  it?._key ?? "",
                                                )}`,
                                            )}
                                            strategy={verticalListSortingStrategy}
                                          >
                                            {items.map((item: SlotContent, itemIdx: number) => {
                                            const customName = (item as any).name?.trim?.();
                                            const itemLabel =
                                              item.type === "image"
                                                ? "Imagem"
                                                : item.type === "text"
                                                  ? "Texto"
                                                  : item.type === "video"
                                                    ? "Vídeo"
                                                    : item.type === "title"
                                                      ? "Título"
                                                      : "Botão";

                                            const itemTitle =
                                              item.type === "text"
                                                ? String((item as any)?.content?.body ?? "")
                                                    .replace(/\s+/g, " ")
                                                    .trim()
                                                    .slice(0, 28)
                                                : item.type === "title"
                                                  ? String((item as any)?.content?.text ?? "")
                                                      .replace(/\s+/g, " ")
                                                      .trim()
                                                      .slice(0, 28)
                                                  : item.type === "button"
                                                    ? String((item as any)?.content?.label ?? "")
                                                        .replace(/\s+/g, " ")
                                                        .trim()
                                                        .slice(0, 28)
                                                    : "";

                                            const fallbackLabel = itemTitle
                                              ? `${itemLabel} — ${itemTitle}`
                                              : itemLabel;
                                            const displayLabel = customName || fallbackLabel;

                                            const isActive =
                                              focusedItem?.blockKey === b._key &&
                                              focusedItem.columnIndex === colIdx &&
                                              focusedItem.itemIndex === itemIdx;

                                            const itemId = `item:${b._key}:${colIdx}:${String(
                                              item?._key ?? "",
                                            )}`;

                                            return (
                                              <SidebarContentItem
                                                key={itemId}
                                                id={itemId}
                                                active={isActive}
                                                icon={
                                                  item.type === "image" ? (
                                                    <Image className="h-4 w-4 text-black/70" />
                                                  ) : item.type === "text" ? (
                                                    <Type className="h-4 w-4 text-black/70" />
                                                  ) : item.type === "video" ? (
                                                    <Video className="h-4 w-4 text-black/70" />
                                                  ) : item.type === "title" ? (
                                                    <Heading className="h-4 w-4 text-black/70" />
                                                  ) : (
                                                    <LinkIcon className="h-4 w-4 text-black/70" />
                                                  )
                                                }
                                                label={displayLabel}
                                                onRename={(nextName) =>
                                                  renameContentItem(b._key, colIdx, itemIdx, nextName)
                                                }
                                                onSelect={() => {
                                                  setSelectedKey(b._key);
                                                  setFocusedItem({
                                                    blockKey: b._key,
                                                    columnIndex: colIdx,
                                                    itemIndex: itemIdx,
                                                  });
                                                }}
                                                onDuplicate={() =>
                                                  duplicateContentItem(b._key, colIdx, itemIdx)
                                                }
                                                onDelete={() => removeContentItem(b._key, colIdx, itemIdx)}
                                              />
                                            );
                                          })}
                                          </SortableContext>
                                        </div>
                                      </div>
                                    ));
                                  })()}
                                </div>
                              ) : null;

                            return (
                              <BlockListItem
                                key={b._key}
                                id={b._key}
                                index={idx}
                                type={b.type}
                                active={b._key === selectedKey}
                                name={(b.content as any)?.name ?? null}
                                expandable={b.type === "container"}
                                expanded={b.type === "container" ? isExpanded : false}
                                onToggleExpanded={
                                  b.type === "container"
                                    ? () =>
                                        setExpandedBlocks((prev) => ({
                                          ...prev,
                                          [b._key]: !isExpanded,
                                        }))
                                    : undefined
                                }
                                onSelect={() => {
                                  setSelectedKey(b._key);
                                  setFocusedItem(null);
                                }}
                                onRename={(nextName) => renameBlock(b._key, nextName)}
                                onDuplicate={() => duplicateBlock(b._key)}
                                onDelete={() => deleteBlock(b._key)}
                                children={childNodes}
                              />
                            );
                          })}
                        </div>
                      </SortableContext>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center: rendered preview */}
        <div
          className="bg-white overflow-auto"
        >
          <div className="p-3">
            {drafts.length === 0 ? (
              <PreviewDroppableArea
                id="preview-drop:append"
                variant="empty"
                label="Solte aqui para começar"
                className="cursor-pointer hover:border-primary/55 hover:bg-primary/5"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setEmptyZoneBlockMenuAnchor({
                    bottom: r.bottom,
                    left: r.left,
                    width: r.width,
                  });
                  setEmptyZoneBlockMenuOpen(true);
                }}
              />
            ) : (
              <div
                className={cn(
                  "rounded-md overflow-hidden relative mx-auto transition-[max-width] duration-200",
                  "ring-1 ring-black/5",
                )}
                style={{
                  ...(pageBackground ? { backgroundColor: pageBackground } : {}),
                  maxWidth:
                    previewViewport === "mobile"
                      ? 390
                      : previewViewport === "tablet"
                        ? 768
                        : undefined,
                }}
              >
                  <BuilderPreview
                    blocks={previewBlocks}
                    className="space-y-0"
                    containerPadding={containerPaddingDraft}
                    containerRadius={containerRadiusDraft}
                    containerGap={containerGapDraft}
                    accentColor={company.brand_color ?? "#9D00F2"}
                    active={previewHighlightTarget}
                    onHover={(target) => setHoveredPreviewTarget(target)}
                    onActivate={(target) => {
                      setSelectedKey(target.blockId);
                      if ("columnIndex" in target) {
                        setFocusedItem({
                          blockKey: target.blockId,
                          columnIndex: target.columnIndex,
                          itemIndex: target.itemIndex,
                        });
                        setExpandedBlocks((p) => ({ ...p, [target.blockId]: true }));
                      } else {
                        setFocusedItem(null);
                      }
                    }}
                    onMove={(intent) => {
                      moveContentItem(intent);
                    }}
                    onDuplicateItem={({ blockId, columnIndex, itemKey }) => {
                      const idx = findContentItemIndexByKey(blockId, columnIndex, itemKey);
                      if (idx === null) return;
                      duplicateContentItem(blockId, columnIndex, idx);
                    }}
                    onDeleteItem={({ blockId, columnIndex, itemKey }) => {
                      const idx = findContentItemIndexByKey(blockId, columnIndex, itemKey);
                      if (idx === null) return;
                      removeContentItem(blockId, columnIndex, idx);
                    }}
                    onSetContainerColumns={(blockId, columns) => {
                      setSelectedKey(blockId);
                      setFocusedItem(null);
                      setContainerColumns(blockId, columns);
                      setExpandedBlocks((p) => ({ ...p, [blockId]: true }));
                    }}
                    onDuplicateBlock={(blockId) => {
                      duplicateBlock(blockId);
                    }}
                    onDeleteBlock={(blockId) => {
                      deleteBlock(blockId);
                    }}
                    onOpenAddContentMenu={(blockId, columnIndex, anchor) => {
                      setSelectedKey(blockId);
                      setFocusedItem(null);
                      setAddContentMenu({ blockKey: blockId, columnIndex });
                      setAddContentAnchor(anchor);
                    }}
                  />

                  {/* Palette drop overlay on preview */}
                  {sidebarDraggingId?.startsWith("palette:") && (
                    <div className="absolute inset-0 z-40 flex flex-col">
                      {previewBlocks.map((block) => {
                        if (block.type !== "container") {
                          return (
                            <PreviewDroppableArea
                              key={block.id}
                              id={`preview-drop:${block.id}:0`}
                              variant="cell"
                            />
                          );
                        }
                        const c = normalizeContainerContent(block.content as any);
                        return (
                          <div
                            key={block.id}
                            className="flex-1 grid"
                            style={{ gridTemplateColumns: `repeat(${c.columns}, 1fr)` }}
                          >
                            {c.slots.map((_, colIdx) => (
                              <PreviewDroppableArea
                                key={colIdx}
                                id={`preview-drop:${block.id}:${colIdx}`}
                                variant="cell"
                              />
                            ))}
                          </div>
                        );
                      })}
                      <PreviewDroppableArea id="preview-drop:append" variant="cell" />
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>

        {/* Right: inspector (edit selected block) or page properties */}
        <div className="border-l border-[#f6f5f1] bg-white overflow-auto">
          {(() => {
            if (selectedKey === PAGE_PANEL_KEY) {
              return (
                <div className="p-4 overflow-y-auto h-full">
                  <div className="border-b border-[#f6f5f1] pb-3">
                    <div className="text-xs text-black/40">Propriedades</div>
                    <div className="mt-1 text-sm font-medium">Configurações da página</div>
                    <div className="mt-0.5 text-[11px] text-black/40">
                      Edite as configurações básicas e aparência da página.
                    </div>
                  </div>

                  <div className="pt-4">
                    <CaseEditorPhase1
                      ref={caseConfigFormRef}
                      caseData={caseQuery.data ?? null}
                      onSaved={(savedId) => {
                        qc.invalidateQueries({ queryKey: ["admin", "cases"] });
                        qc.invalidateQueries({ queryKey: ["admin", "case", savedId] });
                      }}
                      showSubmitButton={false}
                    />
                  </div>

                  <div className="space-y-3 border-t border-[#f6f5f1] pt-4 mt-4">
                    <div className="text-sm font-medium">Cor do background</div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "Padrão", value: null as string | null },
                        { label: "Off-white", value: "#fbfbf9" },
                        { label: "Branco", value: "#ffffff" },
                        { label: "Preto", value: "#0b0b0b" },
                      ].map((opt) => {
                        const isActive =
                          (opt.value ?? null) === (pageBackground ?? null);
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => savePageBackground(opt.value)}
                            className={cn(
                              "px-2.5 py-1.5 rounded-xl text-[11px] font-medium",
                              "ring-1 ring-border",
                              isActive
                                ? "bg-primary/10 text-primary ring-primary/20"
                                : "bg-white text-black/70 hover:bg-black/[0.03]",
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] text-black/50">Personalizar</div>
                      <input
                        type="color"
                        value={
                          pageBackground && pageBackground.startsWith("#")
                            ? pageBackground
                            : "#fbfbf9"
                        }
                        onChange={(e) => savePageBackground(e.target.value)}
                        className="h-8 w-10 rounded-md border border-border bg-white"
                        aria-label="Selecionar cor do background"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-[#f6f5f1] pt-4 mt-4">
                    <div className="text-sm font-medium">Layout dos containers</div>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-black/50">
                          <span>Padding geral</span>
                          <span>{containerPaddingDraft}px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={120}
                          step={4}
                          value={containerPaddingDraft}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setContainerPaddingDraft(v);
                            savePageContainerLayout(v, containerRadiusDraft, containerGapDraft);
                          }}
                          className="w-full h-2 rounded-full appearance-none bg-muted accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
                          aria-label="Padding geral em pixels"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-black/50">
                          <span>Borda arredondada</span>
                          <span>{containerRadiusDraft}px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={48}
                          step={2}
                          value={containerRadiusDraft}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setContainerRadiusDraft(v);
                            savePageContainerLayout(containerPaddingDraft, v, containerGapDraft);
                          }}
                          className="w-full h-2 rounded-full appearance-none bg-muted accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
                          aria-label="Borda arredondada em pixels"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-black/50">
                          <span>Gap entre containers</span>
                          <span>{containerGapDraft}px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={60}
                          step={2}
                          value={containerGapDraft}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setContainerGapDraft(v);
                            savePageContainerLayout(containerPaddingDraft, containerRadiusDraft, v);
                          }}
                          className="w-full h-2 rounded-full appearance-none bg-muted accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
                          aria-label="Gap entre containers em pixels"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            if (!selected) {
              return (
                <div className="p-4">
                  <div className="text-xs text-black/40">Propriedades</div>
                  <div className="mt-1 text-sm text-black/50">
                    Selecione um item no preview ou na árvore para editar.
                  </div>
                </div>
              );
            }

            const isContainer = selected.type === "container";
            const container = isContainer
              ? normalizeContainerContent(selected.content as any)
              : null;
            const containerName = isContainer ? (selected.content as any)?.name : null;

            const focused =
              isContainer && focusItem
                ? (container?.slots?.[focusItem.columnIndex]?.[focusItem.itemIndex] as
                    | SlotContent
                    | undefined)
                : null;

            const headerRightActions = (actions: React.ReactNode) => (
              <div className="inline-flex items-center gap-1">{actions}</div>
            );

            const iconBtn = (props: {
              label: string;
              onClick: () => void;
              children: React.ReactNode;
              destructive?: boolean;
            }) => (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onClick();
                }}
                className={cn(
                  "h-8 w-8 rounded-lg grid place-items-center",
                  "ring-1 ring-black/10",
                  "bg-[#fbfbf9] hover:bg-black/[0.03]",
                  props.destructive ? "text-destructive" : "text-black/70",
                )}
                aria-label={props.label}
                title={props.label}
              >
                {props.children}
              </button>
            );

            // Focused item inspector (properties-only).
            if (focused && focusItem) {
              const itemLabel =
                focused.type === "image"
                  ? "Imagem"
                  : focused.type === "text"
                    ? "Texto"
                    : focused.type === "video"
                      ? "Vídeo"
                      : focused.type === "title"
                        ? "Título"
                        : "Botão";
              const colLabel = `Coluna ${String(focusItem.columnIndex + 1).padStart(2, "0")}`;

              const updateFocusedItem = (next: SlotContent) => {
                const key = selected._key;
                const colIdx = focusItem.columnIndex;
                const itemIdx = focusItem.itemIndex;
                const c = normalizeContainerContent(selected.content as any);
                const name = (selected.content as any)?.name;
                const slots = c.slots.map((col) => [...col]);
                if (!slots[colIdx]?.[itemIdx]) return;
                slots[colIdx][itemIdx] = next;
                updateBlock(key, { ...c, name, slots } as any);
              };

              const setFocusedItemType = (type: ContentBlockType) => {
                if (type === focused.type) return;
                const itemKey = (focused as any)._key ?? crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
                const itemName = (focused as any).name;
                updateFocusedItem({
                  _key: itemKey,
                  type,
                  content: { ...DEFAULT_SLOT_CONTENT[type] } as any,
                  ...(itemName != null ? { name: itemName } : {}),
                });
              };

              const ITEM_TYPE_OPTIONS: Array<{
                type: ContentBlockType;
                label: string;
                icon: typeof Image;
              }> = [
                { type: "image", label: "Imagem", icon: Image },
                { type: "text", label: "Texto", icon: Type },
                { type: "video", label: "Vídeo", icon: Video },
                { type: "title", label: "Título", icon: Heading },
                { type: "button", label: "Botão", icon: LinkIcon },
              ];

              return (
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 border-b border-[#f6f5f1] pb-3">
                    <div className="min-w-0">
                      <div className="text-xs text-black/40">Propriedades</div>
                      <div className="mt-1 text-sm font-medium truncate">{itemLabel}</div>
                      <div className="mt-0.5 text-[11px] text-black/40">{colLabel}</div>
                    </div>

                    {headerRightActions(
                      <>
                        {iconBtn({
                          label: "Duplicar item",
                          onClick: () =>
                            duplicateContentItem(selected._key, focusItem.columnIndex, focusItem.itemIndex),
                          children: <Copy className="h-4 w-4" aria-hidden="true" />,
                        })}
                        {iconBtn({
                          label: "Excluir item",
                          destructive: true,
                          onClick: () =>
                            removeContentItem(selected._key, focusItem.columnIndex, focusItem.itemIndex),
                          children: <Trash2 className="h-4 w-4" aria-hidden="true" />,
                        })}
                      </>,
                    )}
                  </div>

                  <div className="pt-4 space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="item-type-select" className="text-xs font-medium text-black/60">
                        Tipo do item
                      </label>
                      <select
                        id="item-type-select"
                        value={focused.type}
                        onChange={(e) => setFocusedItemType(e.target.value as ContentBlockType)}
                        className={cn(
                          "w-full h-9 px-3 rounded-lg text-[13px] font-medium",
                          "bg-[#fbfbf9] ring-1 ring-black/5 border-0",
                          "text-black focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
                        )}
                        aria-label="Tipo do item"
                      >
                        {ITEM_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.type} value={opt.type}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                    {focused.type === "image" ? (
                      <ImageBlockEditor
                        caseId={caseId}
                        content={focused.content as any}
                        onChange={(c) => updateFocusedItem({ ...focused, type: "image", content: c })}
                      />
                    ) : focused.type === "text" ? (
                      <TextBlockEditor
                        content={focused.content as any}
                        onChange={(c) => updateFocusedItem({ ...focused, type: "text", content: c })}
                      />
                    ) : focused.type === "video" ? (
                      <VideoBlockEditor
                        content={focused.content as any}
                        onChange={(c) => updateFocusedItem({ ...focused, type: "video", content: c })}
                      />
                    ) : focused.type === "title" ? (
                      <TitleBlockEditor
                        content={focused.content as any}
                        onChange={(c) => updateFocusedItem({ ...focused, type: "title", content: c })}
                      />
                    ) : (
                      <ButtonBlockEditor
                        content={focused.content as any}
                        onChange={(c) => updateFocusedItem({ ...focused, type: "button", content: c })}
                      />
                    )}
                    </div>
                  </div>
                </div>
              );
            }

            // Block inspector (properties-only).
            if (selected.type === "container") {
              const c = container!;

              const COL_OPTIONS: Array<{
                value: ContainerColumns;
                label: string;
                icon: typeof Square;
              }> = [
                { value: 1, label: "1 coluna", icon: Square },
                { value: 2, label: "2 colunas", icon: Columns2 },
                { value: 3, label: "3 colunas", icon: Columns3 },
                { value: 4, label: "4 colunas", icon: Columns4 },
              ];

              const setColumns = (columns: ContainerColumns) => {
                const currentSlots = c.slots;
                const nextSlots = Array.from({ length: columns }, (_, i) => currentSlots[i] ?? []);
                updateBlock(selected._key, { ...c, name: containerName, columns, slots: nextSlots } as any);
              };

              return (
                <div className="p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-[#f6f5f1] pb-3">
                    <div className="min-w-0">
                      <div className="text-xs text-black/40">Propriedades</div>
                      <div className="mt-1 text-sm font-medium truncate">
                        {containerName?.trim?.() ? containerName : "Container"}
                      </div>
                    </div>
                    {headerRightActions(
                      <>
                        {iconBtn({
                          label: "Duplicar bloco",
                          onClick: () => duplicateBlock(selected._key),
                          children: <Copy className="h-4 w-4" aria-hidden="true" />,
                        })}
                        {iconBtn({
                          label: "Excluir bloco",
                          destructive: true,
                          onClick: () => deleteBlock(selected._key),
                          children: <Trash2 className="h-4 w-4" aria-hidden="true" />,
                        })}
                      </>,
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-black/60">Colunas</div>
                    <div className="inline-flex items-center gap-1 rounded-xl bg-[#fbfbf9] ring-1 ring-black/5 p-1">
                      {COL_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const isActive = c.columns === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setColumns(opt.value)}
                            className={cn(
                              "h-9 w-9 rounded-lg grid place-items-center transition-colors",
                              isActive
                                ? "bg-white ring-1 ring-black/5 text-black"
                                : "text-black/50 hover:bg-black/[0.03]",
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

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-black/60">Cor de fundo</div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "Nenhum", value: null as string | null },
                        { label: "Off-white", value: "#fbfbf9" },
                        { label: "Branco", value: "#ffffff" },
                        { label: "Preto", value: "#0b0b0b" },
                      ].map((opt) => {
                        const isActive = (c.backgroundColor ?? null) === (opt.value ?? null);
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() =>
                              updateBlock(selected._key, {
                                ...c,
                                name: containerName,
                                backgroundColor: opt.value,
                              } as any)
                            }
                            className={cn(
                              "px-2.5 py-1.5 rounded-xl text-[11px] font-medium",
                              "ring-1 ring-border",
                              isActive
                                ? "bg-primary/10 text-primary ring-primary/20"
                                : "bg-white text-black/70 hover:bg-black/[0.03]",
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] text-black/50">Personalizar</div>
                      <input
                        type="color"
                        value={
                          c.backgroundColor && c.backgroundColor.startsWith("#")
                            ? c.backgroundColor
                            : "#fbfbf9"
                        }
                        onChange={(e) =>
                          updateBlock(selected._key, {
                            ...c,
                            name: containerName,
                            backgroundColor: e.target.value,
                          } as any)
                        }
                        className="h-8 w-10 rounded-md border border-border bg-white cursor-pointer"
                        aria-label="Cor de fundo do container"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-medium text-black/60">Preenchimento (px)</div>
                    {(
                      [
                        { key: "top" as const, label: "Superior" },
                        { key: "bottom" as const, label: "Inferior" },
                        { key: "left" as const, label: "Esquerda" },
                        { key: "right" as const, label: "Direita" },
                      ] as const
                    ).map(({ key, label }) => {
                      const val = Math.max(0, Math.min(240, Number(c.padding?.[key] ?? 0)));
                      return (
                        <div
                          key={key}
                          className="grid grid-cols-[80px_1fr_70px] items-center gap-3"
                        >
                          <div className="text-[12px] text-black/60">{label}</div>
                          <input
                            type="range"
                            min={0}
                            max={120}
                            step={4}
                            value={val}
                            onChange={(e) =>
                              updateBlock(selected._key, {
                                ...c,
                                name: containerName,
                                padding: { ...c.padding, [key]: Number(e.target.value) },
                              } as any)
                            }
                            className="w-full accent-primary"
                            aria-label={`${label} (px)`}
                          />
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              max={240}
                              step={1}
                              value={val}
                              onChange={(e) =>
                                updateBlock(selected._key, {
                                  ...c,
                                  name: containerName,
                                  padding: {
                                    ...c.padding,
                                    [key]: Number(e.target.value || 0),
                                  },
                                } as any)
                              }
                              className="w-full h-8 rounded-lg border border-border bg-white px-2 pr-7 text-[12px] tabular-nums"
                              aria-label={`${label} (px)`}
                            />
                            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-black/40">
                              px
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-sm text-black/50">
                    Selecione um item (Imagem, Texto ou Vídeo) para editar suas propriedades.
                  </div>
                </div>
              );
            }

            // Spacer inspector.
            return (
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 border-b border-[#f6f5f1] pb-3">
                  <div className="min-w-0">
                    <div className="text-xs text-black/40">Propriedades</div>
                    <div className="mt-1 text-sm font-medium truncate">Espaço</div>
                  </div>
                  {headerRightActions(
                    <>
                      {iconBtn({
                        label: "Duplicar bloco",
                        onClick: () => duplicateBlock(selected._key),
                        children: <Copy className="h-4 w-4" aria-hidden="true" />,
                      })}
                      {iconBtn({
                        label: "Excluir bloco",
                        destructive: true,
                        onClick: () => deleteBlock(selected._key),
                        children: <Trash2 className="h-4 w-4" aria-hidden="true" />,
                      })}
                    </>,
                  )}
                </div>

                <div className="pt-4">
                  <SpacerBlockEditor
                    content={selected.content as any}
                    onChange={(content) => updateBlock(selected._key, content)}
                  />
                </div>
              </div>
            );
          })()}
        </div>

        {/* Add content dropdown (portal: prevents clipping by sidebar overflow) */}
        {addContentMenu?.blockKey && addContentAnchor
          ? createPortal(
              (() => {
                const menuWidth = 280;
                const pad = 12;
                const vw = window.innerWidth;
                const vh = window.innerHeight;

                const preferredLeft = addContentAnchor.right + 10;
                const left =
                  preferredLeft + menuWidth > vw - pad
                    ? Math.max(pad, addContentAnchor.left - menuWidth - 10)
                    : preferredLeft;

                const maxTop = Math.max(pad, vh - pad - 520);
                const top = Math.max(pad, Math.min(addContentAnchor.top, maxTop));

                const block = drafts.find(
                  (d) => d._key === addContentMenu.blockKey && d.type === "container",
                ) as DraftBlock | undefined;
                if (!block) return null;

                const c = normalizeContainerContent(block.content as any);
                const columns = c.columns;
                const lockedColumnIndex = addContentMenu.columnIndex;

                const types: Array<{
                  type: ContentBlockType;
                  label: string;
                  icon: typeof Image;
                }> = [
                  { type: "image", label: "Imagem", icon: Image },
                  { type: "text", label: "Texto", icon: Type },
                  { type: "video", label: "Vídeo", icon: Video },
                  { type: "title", label: "Título", icon: Heading },
                  { type: "button", label: "Botão", icon: LinkIcon },
                ];

                const renderTypeButtons = (colIdx: number) => (
                  <div className="space-y-1">
                    {types.map((t) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={`${colIdx}-${t.type}`}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            addContentItem(addContentMenu.blockKey, colIdx, t.type);
                            setAddContentMenu(null);
                          }}
                          className="w-full rounded-xl px-2.5 py-2 text-left text-sm text-black hover:bg-black/[0.04] focus:bg-black/[0.04] focus:outline-none flex items-center gap-2"
                        >
                          <Icon className="h-4 w-4 text-black/60" aria-hidden="true" />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                );

                return (
                  <div
                    style={{
                      position: "fixed",
                      top,
                      left,
                      zIndex: 2500,
                    }}
                  >
                    <div
                      ref={addContentMenuRef}
                      role="menu"
                      aria-label="Adicionar conteúdo"
                      className={cn(
                        "w-[280px]",
                        "max-h-[min(520px,calc(100vh-24px))] overflow-auto",
                        "rounded-2xl border border-border bg-white",
                        "shadow-[0_22px_60px_-35px_rgba(0,0,0,0.35)]",
                        "ring-1 ring-black/5 p-1.5",
                      )}
                    >
                      <div className="px-2 py-1.5 text-[11px] text-black/40">
                        Adicionar conteúdo
                      </div>

                      {lockedColumnIndex !== null ? (
                        <div className="space-y-2">
                          {columns > 1 ? (
                            <div className="px-2 py-1 text-[11px] font-medium text-black/40">
                              Coluna {String(lockedColumnIndex + 1).padStart(2, "0")}
                            </div>
                          ) : null}
                          {renderTypeButtons(lockedColumnIndex)}
                        </div>
                      ) : columns === 1 ? (
                        renderTypeButtons(0)
                      ) : (
                        <div className="space-y-2">
                          {Array.from({ length: columns }).map((_, colIdx) => (
                            <div key={colIdx} className="space-y-1">
                              <div className="px-2 py-1 text-[11px] font-medium text-black/40">
                                Coluna {String(colIdx + 1).padStart(2, "0")}
                              </div>
                              {renderTypeButtons(colIdx)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })(),
              document.body,
            )
          : null}

      </div>

      <DragOverlay dropAnimation={null}>
        {sidebarDraggingId ? (
          (() => {
            if (sidebarDraggingId.startsWith("palette:")) {
              return (
                <div className="rounded-xl bg-white ring-1 ring-black/10 shadow-lg px-3 py-2 text-sm font-medium flex items-center gap-2 pointer-events-none">
                  {sidebarDraggingId === "palette:image" && (
                    <>
                      <Image className="h-4 w-4 text-black/60" /> Imagem
                    </>
                  )}
                  {sidebarDraggingId === "palette:text" && (
                    <>
                      <Type className="h-4 w-4 text-black/60" /> Texto
                    </>
                  )}
                  {sidebarDraggingId === "palette:video" && (
                    <>
                      <Video className="h-4 w-4 text-black/60" /> Vídeo
                    </>
                  )}
                  {sidebarDraggingId === "palette:title" && (
                    <>
                      <Heading className="h-4 w-4 text-black/60" /> Título
                    </>
                  )}
                  {sidebarDraggingId === "palette:button" && (
                    <>
                      <LinkIcon className="h-4 w-4 text-black/60" /> Botão
                    </>
                  )}
                  {sidebarDraggingId === "palette:container-1" && (
                    <>
                      <Square className="h-4 w-4 text-black/60" /> 1 coluna
                    </>
                  )}
                  {sidebarDraggingId === "palette:container-2" && (
                    <>
                      <Columns2 className="h-4 w-4 text-black/60" /> 2 colunas
                    </>
                  )}
                  {sidebarDraggingId === "palette:container-3" && (
                    <>
                      <Columns3 className="h-4 w-4 text-black/60" /> 3 colunas
                    </>
                  )}
                  {sidebarDraggingId === "palette:container-4" && (
                    <>
                      <Columns4 className="h-4 w-4 text-black/60" /> 4 colunas
                    </>
                  )}
                  {sidebarDraggingId === "palette:spacer" && (
                    <>
                      <Space className="h-4 w-4 text-black/60" /> Espaço
                    </>
                  )}
                </div>
              );
            }

            if (sidebarDraggingId.startsWith("item:")) {
              const parsed = parseSidebarItemId(sidebarDraggingId);
              if (!parsed) return null;
              const block = drafts.find(
                (d) => d._key === parsed.blockKey && d.type === "container",
              ) as DraftBlock | undefined;
              if (!block) return null;
              const c = normalizeContainerContent(block.content as any);
              const col = c.slots[parsed.columnIndex] ?? [];
              const item = col.find((it) => it?._key === parsed.itemKey) as SlotContent | undefined;
              if (!item) return null;
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
              const Icon =
                item.type === "image"
                  ? Image
                  : item.type === "text"
                    ? Type
                    : item.type === "video"
                      ? Video
                      : item.type === "title"
                        ? Heading
                        : LinkIcon;
              return (
                <div className="rounded-xl bg-white ring-1 ring-black/10 shadow-lg px-3 py-2 text-sm font-medium flex items-center gap-2 pointer-events-none">
                  <Icon className="h-4 w-4 text-black/60" aria-hidden="true" />
                  {label}
                </div>
              );
            }

            const draggedBlock = drafts.find((d) => d._key === sidebarDraggingId);
            if (draggedBlock) {
              return (
                <div className="rounded-xl bg-white ring-1 ring-black/10 shadow-lg px-3 py-2 text-sm font-medium flex items-center gap-2 pointer-events-none">
                  <LayoutGrid className="h-4 w-4 text-black/60" aria-hidden="true" />
                  {draggedBlock.type === "container" ? "Container" : "Espaço"}
                </div>
              );
            }

            return null;
          })()
        ) : null}
      </DragOverlay>
      </DndContext>

      {/* Templates dialog */}
      <Dialog open={templatesOpen} onOpenChange={(open) => { setTemplatesOpen(open); if (!open) setSaveTemplateForm(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Templates</DialogTitle>
            <DialogDescription>
              Escolha um template para preencher o case com blocos pré-configurados.
              {drafts.length > 0 && (
                <span className="block mt-1 text-destructive font-medium">
                  Atenção: aplicar um template vai substituir os blocos atuais.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto space-y-4 py-2">
            {/* Default templates */}
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Padrão</div>
              <div className="space-y-2">
                {CASE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className={cn(
                      "w-full text-left rounded-xl border border-border p-4",
                      "hover:border-primary/40 hover:bg-primary/5 transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{tpl.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{tpl.description}</div>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground bg-[#f2f0eb] px-2 py-0.5 rounded-full">
                        {tpl.blockCount} blocos
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom templates */}
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Seus templates</div>
              <div className="space-y-2">
                {customTemplatesQuery.isLoading && (
                  <div className="text-xs text-muted-foreground py-2">Carregando...</div>
                )}
                {customTemplatesQuery.data?.map((tpl) => (
                  <div
                    key={tpl.id}
                    className={cn(
                      "w-full text-left rounded-xl border border-border p-4",
                      "hover:border-primary/40 hover:bg-primary/5 transition-colors",
                      "flex items-center gap-3",
                    )}
                  >
                    <button
                      type="button"
                      className="flex-1 min-w-0 text-left focus-visible:outline-none"
                      onClick={() => applyCustomTemplate(tpl)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{tpl.name}</div>
                          {tpl.description && (
                            <div className="text-xs text-muted-foreground mt-0.5">{tpl.description}</div>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground bg-[#f2f0eb] px-2 py-0.5 rounded-full">
                          {(tpl.blocks as unknown[]).length} blocos
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      disabled={deletingTemplateId === tpl.id}
                      className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      title="Remover template"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {!customTemplatesQuery.isLoading && (customTemplatesQuery.data?.length ?? 0) === 0 && (
                  <div className="text-xs text-muted-foreground py-2">Nenhum template salvo.</div>
                )}
              </div>
            </div>

            {/* Save as template */}
            <div className="border-t pt-3">
              {saveTemplateForm === null ? (
                <button
                  type="button"
                  onClick={() => setSaveTemplateForm({ name: "", description: "" })}
                  disabled={drafts.length === 0}
                  className={cn(
                    "w-full text-left rounded-xl border border-dashed border-border p-4",
                    "hover:border-primary/40 hover:bg-primary/5 transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "flex items-center gap-2 text-sm text-muted-foreground",
                    "disabled:opacity-40 disabled:pointer-events-none",
                  )}
                >
                  <Plus className="h-4 w-4" />
                  Salvar como template
                  {drafts.length === 0 && <span className="text-xs ml-auto">(adicione blocos primeiro)</span>}
                </button>
              ) : (
                <div className="space-y-2 rounded-xl border border-border p-4">
                  <input
                    type="text"
                    placeholder="Nome do template"
                    value={saveTemplateForm.name}
                    onChange={(e) => setSaveTemplateForm((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                    className="w-full text-sm border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveAsTemplate(); if (e.key === "Escape") setSaveTemplateForm(null); }}
                  />
                  <input
                    type="text"
                    placeholder="Descrição (opcional)"
                    value={saveTemplateForm.description}
                    onChange={(e) => setSaveTemplateForm((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                    className="w-full text-sm border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveAsTemplate(); if (e.key === "Escape") setSaveTemplateForm(null); }}
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setSaveTemplateForm(null)} disabled={savingTemplate}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveAsTemplate} disabled={!saveTemplateForm.name.trim() || savingTemplate}>
                      {savingTemplate ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
