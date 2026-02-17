import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, Eye, Lock, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCompany } from "@/lib/company-context";
import { getClients, type ClientOption } from "@/lib/case-builder/queries";

type Visibility = "draft" | "published" | "restricted";

const VISIBILITY_OPTIONS: {
  value: Visibility;
  label: string;
  description: string;
  badgeClass: string;
}[] = [
  {
    value: "draft",
    label: "Rascunho",
    description: "Visível apenas no admin",
    badgeClass: "bg-amber-500/10 text-amber-900",
  },
  {
    value: "published",
    label: "Publicado",
    description: "Visível para todos",
    badgeClass: "bg-emerald-500/10 text-emerald-800",
  },
  {
    value: "restricted",
    label: "Restrito",
    description: "Acesso com senha",
    badgeClass: "bg-sky-500/10 text-sky-800",
  },
];

type Props = {
  caseId: string;
  title?: string | null;
  slug?: string | null;
  status?: string | null;
  client?: { id: string; name: string } | null;
  onSetClientId?: (clientId: string) => void | Promise<void>;
  centerLabel?: string;
  centerContent?: React.ReactNode;
  onRenameTitle?: (nextTitle: string) => void | Promise<void>;
  onSave?: () => void;
  onSaveAsTemplate?: () => void;
  onSetVisibility?: (next: Visibility) => void;
  savingLabel?: string;
  isSaving?: boolean;
  hasChanges?: boolean;
};

export default function CaseEditorTopBar({
  caseId,
  title,
  slug,
  status,
  client,
  onSetClientId,
  centerLabel = "Edição de blocos",
  centerContent,
  onRenameTitle,
  onSave,
  onSaveAsTemplate,
  onSetVisibility,
  savingLabel = "Salvando…",
  isSaving,
  hasChanges,
}: Props) {
  const navigate = useNavigate();
  const { company } = useCompany();
  const canView = Boolean(caseId);
  const [saveMenuOpen, setSaveMenuOpen] = React.useState(false);
  const saveMenuRef = React.useRef<HTMLDivElement>(null);
  const saveTriggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!saveMenuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSaveMenuOpen(false);
    }
    function onPointerDown(e: MouseEvent | PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (saveMenuRef.current?.contains(target)) return;
      if (saveTriggerRef.current?.contains(target)) return;
      setSaveMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [saveMenuOpen]);

  const clientsQuery = useQuery({
    queryKey: ["admin", "clients", "options", company.group_id],
    queryFn: () => getClients(company.group_id),
    enabled: Boolean(company.group_id),
    staleTime: 5 * 60 * 1000,
  });

  const [editingTitle, setEditingTitle] = React.useState(false);
  const [titleDraft, setTitleDraft] = React.useState((title ?? "").trim());
  const [savingTitle, setSavingTitle] = React.useState(false);
  const titleInputRef = React.useRef<HTMLInputElement | null>(null);
  const titleMeasureRef = React.useRef<HTMLSpanElement | null>(null);
  const titleWrapRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (editingTitle) return;
    setTitleDraft((title ?? "").trim());
  }, [title, editingTitle]);

  React.useEffect(() => {
    if (!editingTitle) return;
    queueMicrotask(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });
  }, [editingTitle]);

  const applyTitleInputWidth = React.useCallback((value: string) => {
    const wrap = titleWrapRef.current;
    const measure = titleMeasureRef.current;
    const input = titleInputRef.current;
    if (!wrap || !measure || !input) return;

    // Keep spaces measurable (so the caret doesn't "collapse" width).
    const safe = (value || " ").replace(/ /g, "\u00A0");
    measure.textContent = safe;

    // available width inside the title area (avoid pushing the badge too much)
    const available = wrap.getBoundingClientRect().width;
    const measured = measure.getBoundingClientRect().width;

    // +2px breathing room so caret isn't clipped
    const next = Math.max(40, Math.min(available, measured + 2));
    input.style.width = `${next}px`;
  }, []);

  React.useLayoutEffect(() => {
    if (!editingTitle) return;
    applyTitleInputWidth(titleDraft);

    const wrap = titleWrapRef.current;
    if (!wrap) return;

    const ro = new ResizeObserver(() => applyTitleInputWidth(titleDraft));
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [editingTitle, titleDraft, applyTitleInputWidth]);

  async function commitTitle() {
    if (!onRenameTitle) {
      setEditingTitle(false);
      return;
    }

    const next = titleDraft.replace(/\s+/g, " ").trim();
    const current = (title ?? "").replace(/\s+/g, " ").trim();

    if (!next || next === current) {
      setTitleDraft(current);
      setEditingTitle(false);
      return;
    }

    try {
      setSavingTitle(true);
      await onRenameTitle(next);
      setEditingTitle(false);
    } catch {
      // Keep editing so the user can retry.
    } finally {
      setSavingTitle(false);
    }
  }

  function cancelTitle() {
    setTitleDraft((title ?? "").trim());
    setEditingTitle(false);
  }

  const visibility: Visibility =
    status === "published"
      ? "published"
      : status === "restricted"
        ? "restricted"
        : "draft";

  const currentOption =
    VISIBILITY_OPTIONS.find((o) => o.value === visibility) ??
    VISIBILITY_OPTIONS[0];

  const [visMenuOpen, setVisMenuOpen] = React.useState(false);
  const visBadgeRef = React.useRef<HTMLButtonElement>(null);
  const visMenuRef = React.useRef<HTMLDivElement>(null);

  const [clientMenuOpen, setClientMenuOpen] = React.useState(false);
  const clientBadgeRef = React.useRef<HTMLButtonElement>(null);
  const clientMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!visMenuOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setVisMenuOpen(false);
    }

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (visBadgeRef.current?.contains(target)) return;
      if (visMenuRef.current?.contains(target)) return;
      setVisMenuOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [visMenuOpen]);

  React.useEffect(() => {
    if (!clientMenuOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setClientMenuOpen(false);
    }

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (clientBadgeRef.current?.contains(target)) return;
      if (clientMenuRef.current?.contains(target)) return;
      setClientMenuOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [clientMenuOpen]);

  return (
    <div className="sticky top-0 z-50 border-b border-[#f6f5f1] bg-[#fbfbf9]">
      <div className={cn(
        "px-4 md:px-6 h-14 gap-4 items-center",
        "flex justify-between",
        "md:grid md:grid-cols-[300px_1fr_300px] md:justify-items-stretch",
      )}>
        <div className="flex items-center gap-3 min-w-0 md:justify-self-start">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-black/[0.04]"
            onClick={() => navigate("/admin/cases")}
            aria-label="Voltar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div ref={titleWrapRef} className="min-w-0 flex-1">
                {editingTitle ? (
                  <div className="relative inline-block max-w-full align-middle">
                    {/* Hidden measurer (same font/size) */}
                    <span
                      ref={titleMeasureRef}
                      className={cn(
                        "invisible pointer-events-none absolute left-0 top-0",
                        "text-sm font-medium",
                        "whitespace-pre",
                      )}
                      aria-hidden="true"
                    >
                      {(titleDraft || " ").replace(/ /g, "\u00A0")}
                    </span>

                    <input
                      ref={titleInputRef}
                      value={titleDraft}
                      onChange={(e) => {
                        const next = e.target.value;
                        setTitleDraft(next);
                        // Instant autosize while typing (no waiting for re-render)
                        applyTitleInputWidth(next);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          commitTitle();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          e.stopPropagation();
                          cancelTitle();
                        }
                      }}
                      onBlur={() => commitTitle()}
                      disabled={savingTitle}
                      aria-label="Editar título do case"
                      style={{ maxWidth: "100%" }}
                      className={cn(
                        "text-sm font-medium",
                        "min-w-0",
                        "bg-transparent",
                        "border-0 p-0 rounded-none",
                        "focus:outline-none focus:ring-0 focus-visible:ring-0",
                        "disabled:opacity-60",
                      )}
                    />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "text-sm font-medium truncate",
                      onRenameTitle ? "cursor-text" : "",
                    )}
                    title={title ?? undefined}
                    onDoubleClick={(e) => {
                      if (!onRenameTitle) return;
                      e.preventDefault();
                      e.stopPropagation();
                      setEditingTitle(true);
                    }}
                  >
                    {title ?? "Carregando…"}
                  </div>
                )}
              </div>

              {/* Client badge (left) */}
              <div className="relative">
                <button
                  ref={clientBadgeRef}
                  type="button"
                  onClick={() => setClientMenuOpen((v) => !v)}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none",
                    "ring-1 ring-black/5 cursor-pointer hover:ring-black/10 transition-shadow",
                    "bg-accent text-primary ring-primary/15 hover:ring-primary/25",
                  )}
                  aria-label={client?.name ? `Cliente: ${client.name}` : "Selecionar cliente"}
                  aria-expanded={clientMenuOpen}
                  aria-haspopup="menu"
                >
                  {client?.name ?? "Cliente"}
                </button>

                {clientMenuOpen && (
                  <div
                    ref={clientMenuRef}
                    role="menu"
                    aria-label="Selecionar cliente"
                    className={cn(
                      "absolute left-0 top-full mt-2 z-50 w-64",
                      "rounded-2xl border border-border bg-white",
                      "shadow-[0_18px_40px_-20px_rgba(0,0,0,0.25)]",
                      "ring-1 ring-black/5 p-1.5",
                    )}
                  >
                    <div className="px-2 py-1.5 text-[11px] text-black/40">Clientes</div>
                    {(clientsQuery.data ?? []).map((c: ClientOption) => (
                      <button
                        key={c.id}
                        type="button"
                        role="menuitem"
                        onClick={async () => {
                          if (!onSetClientId) return;
                          await onSetClientId(c.id);
                          setClientMenuOpen(false);
                        }}
                        className="w-full rounded-xl px-2.5 py-2 text-left text-sm text-black hover:bg-black/[0.04] focus:bg-black/[0.04] focus:outline-none flex items-center gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium truncate">{c.name}</div>
                        </div>
                        {client?.id === c.id && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center justify-center min-w-0 md:justify-self-center">
          {centerContent ? (
            centerContent
          ) : (
            <div className="text-sm font-medium text-black/70">{centerLabel}</div>
          )}
        </div>

        <div className="flex items-center gap-2 md:justify-self-end">
          {/* Visibility badge moved to right */}
          <div className="relative">
            <button
              ref={visBadgeRef}
              type="button"
              onClick={() => setVisMenuOpen((v) => !v)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none ring-1 ring-black/5 cursor-pointer hover:ring-black/10 transition-shadow",
                currentOption.badgeClass,
              )}
              aria-label={`Status: ${currentOption.label}`}
              aria-expanded={visMenuOpen}
              aria-haspopup="menu"
            >
              {visibility === "restricted" && <Lock className="h-3 w-3" />}
              {currentOption.label}
            </button>

            {visMenuOpen && (
              <div
                ref={visMenuRef}
                role="menu"
                aria-label="Alterar visibilidade"
                className={cn(
                  "absolute right-0 top-full mt-2 z-50 w-56",
                  "rounded-2xl border border-border bg-white",
                  "shadow-[0_18px_40px_-20px_rgba(0,0,0,0.25)]",
                  "ring-1 ring-black/5 p-1.5",
                )}
              >
                <div className="px-2 py-1.5 text-[11px] text-black/40">Visibilidade</div>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onSetVisibility?.(opt.value);
                      setVisMenuOpen(false);
                    }}
                    className="w-full rounded-xl px-2.5 py-2 text-left text-sm text-black hover:bg-black/[0.04] focus:bg-black/[0.04] focus:outline-none flex items-center gap-2"
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        opt.value === "published"
                          ? "bg-emerald-500"
                          : opt.value === "restricted"
                            ? "bg-sky-500"
                            : "bg-amber-500",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium">{opt.label}</div>
                      <div className="text-[11px] text-black/50">{opt.description}</div>
                    </div>
                    {opt.value === visibility && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full bg-white/70"
            onClick={() => {
              if (!canView) return;
              window.open(`/admin/cases/${caseId}/preview`, "_blank", "noreferrer");
            }}
            disabled={!canView}
            aria-label="Visualizar"
            title="Visualizar prévia (rascunho)"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Visualizar</span>
          </Button>

          {onSave ? (
            <div className="relative flex">
              <Button
                type="button"
                className={cn(
                  "h-9 rounded-full",
                  onSaveAsTemplate && "rounded-r-none pr-2 border-r border-white/20",
                )}
                onClick={onSave}
                disabled={Boolean(isSaving)}
              >
                {isSaving
                  ? savingLabel
                  : visibility === "draft"
                    ? "Publicar"
                    : "Salvar"}
              </Button>
              {onSaveAsTemplate ? (
                <>
                  <button
                    ref={saveTriggerRef}
                    type="button"
                    onClick={() => setSaveMenuOpen((v) => !v)}
                    disabled={Boolean(isSaving)}
                    className={cn(
                      "h-9 w-9 rounded-r-full rounded-l-none",
                      "flex items-center justify-center",
                      "bg-primary text-primary-foreground hover:bg-primary/90",
                      "disabled:opacity-50 disabled:pointer-events-none",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    )}
                    aria-label="Mais opções de salvar"
                    aria-expanded={saveMenuOpen}
                    aria-haspopup="true"
                  >
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", saveMenuOpen && "rotate-180")}
                      aria-hidden="true"
                    />
                  </button>
                  {saveMenuOpen && (
                    <div
                      ref={saveMenuRef}
                      role="menu"
                      className={cn(
                        "absolute right-0 top-full mt-1 z-50",
                        "w-52 rounded-lg bg-white shadow-lg ring-1 ring-black/10",
                        "py-1",
                      )}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setSaveMenuOpen(false);
                          onSaveAsTemplate();
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm flex items-center gap-2",
                          "hover:bg-[#f2f0eb] transition-colors",
                        )}
                      >
                        Salvar como template
                      </button>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
