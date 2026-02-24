import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { GripVertical, LayoutGrid, List, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { getCases, getClients, reorderCases, type CaseRow } from "@/lib/case-builder/queries";
import { useCompany } from "@/lib/company-context";
import { toSlug } from "@/lib/onmx/slug";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ── Sortable wrappers ────────────────────────────────────────────────

function SortableListItem({
  c,
  navigate,
  openDropdownCaseId,
  setOpenDropdownCaseId,
  dropdownMenuRef,
  setCaseToRemove,
}: {
  c: CaseRow;
  navigate: ReturnType<typeof useNavigate>;
  openDropdownCaseId: string | null;
  setOpenDropdownCaseId: (id: string | null) => void;
  dropdownMenuRef: React.RefObject<HTMLDivElement | null>;
  setCaseToRemove: (v: { id: string; title: string } | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: c.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="px-6 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
          {...attributes}
          {...listeners}
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <div className="font-medium truncate">{c.title}</div>
          <div className="text-xs text-muted-foreground truncate">
            {c.clients?.name ?? "—"} ·{" "}
            {c.status === "published"
              ? "Publicado"
              : c.status === "restricted"
                ? "Restrito"
                : "Rascunho"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(`/admin/cases/${c.id}/builder`)}
          aria-label="Editar"
          className="hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <div
          className="relative"
          ref={openDropdownCaseId === c.id ? dropdownMenuRef : undefined}
        >
          <Button
            variant="outline"
            size="icon"
            onClick={() => setOpenDropdownCaseId(openDropdownCaseId === c.id ? null : c.id)}
            aria-label="Mais opções"
            aria-expanded={openDropdownCaseId === c.id}
            className="hover:bg-muted hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {openDropdownCaseId === c.id && (
            <div
              className="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-border bg-card py-1 shadow-lg"
              role="menu"
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setCaseToRemove({ id: c.id, title: c.title });
                  setOpenDropdownCaseId(null);
                }}
                role="menuitem"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                Apagar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SortableCardItem({
  c,
  navigate,
  openDropdownCaseId,
  setOpenDropdownCaseId,
  dropdownMenuRef,
  setCaseToRemove,
}: {
  c: CaseRow;
  navigate: ReturnType<typeof useNavigate>;
  openDropdownCaseId: string | null;
  setOpenDropdownCaseId: (id: string | null) => void;
  dropdownMenuRef: React.RefObject<HTMLDivElement | null>;
  setCaseToRemove: (v: { id: string; title: string } | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: c.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-border bg-background overflow-visible flex flex-col relative"
    >
      <button
        type="button"
        className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground bg-background/80 backdrop-blur-sm rounded-md p-1 touch-none"
        {...attributes}
        {...listeners}
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="aspect-video bg-muted relative overflow-hidden rounded-t-xl">
        {c.cover_image_url ? (
          <img
            src={c.cover_image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
            Sem capa
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col min-w-0">
        <div className="font-medium truncate">{c.title}</div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">
          {c.clients?.name ?? "—"}
        </div>
        <span
          className={`mt-2 inline-flex w-fit text-xs font-medium px-2 py-0.5 rounded-full ${
            c.status === "published"
              ? "bg-green-500/10 text-green-700"
              : c.status === "restricted"
                ? "bg-amber-500/10 text-amber-700"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {c.status === "published"
            ? "Publicado"
            : c.status === "restricted"
              ? "Restrito"
              : "Rascunho"}
        </span>
      </div>
      <div className="p-4 pt-0 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1 hover:bg-muted hover:text-foreground"
          onClick={() => navigate(`/admin/cases/${c.id}/builder`)}
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Button>
        <div
          className="relative shrink-0"
          ref={openDropdownCaseId === c.id ? dropdownMenuRef : undefined}
        >
          <Button
            variant="outline"
            size="icon"
            onClick={() => setOpenDropdownCaseId(openDropdownCaseId === c.id ? null : c.id)}
            aria-label="Mais opções"
            aria-expanded={openDropdownCaseId === c.id}
            className="hover:bg-muted hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {openDropdownCaseId === c.id && (
            <div
              className="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-border bg-card py-1 shadow-lg"
              role="menu"
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setCaseToRemove({ id: c.id, title: c.title });
                  setOpenDropdownCaseId(null);
                }}
                role="menuitem"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                Apagar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Ghost overlay for dragging ───────────────────────────────────────

function DragGhost({ c }: { c: CaseRow }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-lg px-4 py-3 max-w-xs">
      <div className="font-medium truncate text-sm">{c.title}</div>
      <div className="text-xs text-muted-foreground truncate">{c.clients?.name ?? "—"}</div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

export default function AdminCases() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [newCaseOpen, setNewCaseOpen] = React.useState(false);
  const [newCaseTitle, setNewCaseTitle] = React.useState("");
  const [newCaseClientId, setNewCaseClientId] = React.useState("");
  const [newClientName, setNewClientName] = React.useState("");
  const [creatingNewClient, setCreatingNewClient] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [caseToRemove, setCaseToRemove] = React.useState<{ id: string; title: string } | null>(null);
  const [openDropdownCaseId, setOpenDropdownCaseId] = React.useState<string | null>(null);
  const dropdownMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!openDropdownCaseId) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownMenuRef.current && !dropdownMenuRef.current.contains(e.target as Node)) {
        setOpenDropdownCaseId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdownCaseId]);

  const [viewMode, setViewMode] = React.useState<"list" | "cards">(() => {
    if (typeof window === "undefined") return "list";
    return (localStorage.getItem("admin_cases_view") as "list" | "cards") || "cards";
  });

  React.useEffect(() => {
    localStorage.setItem("admin_cases_view", viewMode);
  }, [viewMode]);

  const { company } = useCompany();

  const { data: clients } = useQuery({
    queryKey: ["admin", "clients", "options", company.id],
    queryFn: () => getClients(company.group_id),
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "cases", company.id],
    queryFn: () => getCases(company.id),
    staleTime: 30 * 1000,
  });

  // ── DnD state ────────────────────────────────────────────────────
  const [localOrder, setLocalOrder] = React.useState<CaseRow[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (data) setLocalOrder(data);
  }, [data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localOrder.findIndex((c) => c.id === active.id);
    const newIndex = localOrder.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const prev = localOrder;
    const newOrder = arrayMove(localOrder, oldIndex, newIndex);
    setLocalOrder(newOrder);

    reorderCases(newOrder.map((c) => c.id)).catch(() => {
      setLocalOrder(prev);
      toast({
        title: "Erro ao reordenar",
        description: "Não foi possível salvar a nova ordem.",
        variant: "destructive",
      });
    });
  }

  const activeCase = activeId ? localOrder.find((c) => c.id === activeId) ?? null : null;

  // ── CRUD ─────────────────────────────────────────────────────────

  async function handleCreateAndOpenBuilder() {
    const title = newCaseTitle.trim();
    if (!title) {
      toast({ title: "Informe o nome do case", variant: "destructive" });
      return;
    }

    let clientId = newCaseClientId;

    if (creatingNewClient) {
      const clientName = newClientName.trim();
      if (!clientName) {
        toast({ title: "Informe o nome do cliente", variant: "destructive" });
        return;
      }
      clientId = "";
    } else if (!clientId) {
      toast({ title: "Selecione o cliente", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      if (creatingNewClient) {
        const clientName = newClientName.trim();
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            group_id: company.group_id,
            name: clientName,
            slug: toSlug(clientName),
          })
          .select("id")
          .single();
        if (clientError) throw clientError;
        clientId = newClient.id as string;
        await qc.invalidateQueries({ queryKey: ["admin", "clients"] });
      }

      const slug = toSlug(title);
      const payload = {
        group_id: company.group_id,
        owner_company_id: company.id,
        client_id: clientId,
        title,
        slug,
        status: "draft",
      };
      const { data: inserted, error } = await supabase
        .from("cases")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      const caseId = inserted.id as string;
      await qc.invalidateQueries({ queryKey: ["admin", "cases"] });
      setNewCaseOpen(false);
      setNewCaseTitle("");
      setNewCaseClientId("");
      setNewClientName("");
      setCreatingNewClient(false);
      navigate(`/admin/cases/${caseId}/builder`);
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message ?? "Não foi possível criar o case.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "cases"] });
      toast({ title: "Removido", description: "Case removido." });
    },
    onError: (err: any) => {
      toast({
        title: "Erro",
        description: err?.message ?? "Não foi possível remover.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <AdminPageSkeleton blocks={2} />;
  }

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Cases</h1>
        </div>

        <Button className="gap-2" onClick={() => setNewCaseOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo case
        </Button>
      </div>

      <Dialog open={newCaseOpen} onOpenChange={setNewCaseOpen}>
        <DialogContent className="max-w-xl sm:p-8">
          <DialogHeader>
            <DialogTitle>Novo case</DialogTitle>
            <DialogDescription>
              Informe o nome e o cliente. Em seguida você será levado ao builder para montar o case.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do case</label>
              <input
                type="text"
                value={newCaseTitle}
                onChange={(e) => setNewCaseTitle(e.target.value)}
                placeholder="Ex.: Projeto X"
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
                aria-label="Nome do case"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Cliente</label>
                <button
                  type="button"
                  onClick={() => {
                    setCreatingNewClient((v) => !v);
                    setNewCaseClientId("");
                    setNewClientName("");
                  }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {creatingNewClient ? "Selecionar existente" : "+ Novo cliente"}
                </button>
              </div>
              {creatingNewClient ? (
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Nome do novo cliente"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  aria-label="Nome do novo cliente"
                />
              ) : (
                <select
                  value={newCaseClientId}
                  onChange={(e) => setNewCaseClientId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  aria-label="Cliente"
                >
                  <option value="">Selecione…</option>
                  {(clients ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewCaseOpen(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateAndOpenBuilder} disabled={creating}>
              {creating ? "Criando…" : "Criar e abrir builder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!caseToRemove} onOpenChange={(open) => !open && setCaseToRemove(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remover case</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o case &quot;{caseToRemove?.title ?? ""}&quot;? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCaseToRemove(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (caseToRemove) {
                  remove.mutate(caseToRemove.id);
                  setCaseToRemove(null);
                }
              }}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Removendo…" : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-2xl border border-border bg-card overflow-visible">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            {localOrder.length} cases
          </span>
          <div className="flex items-center gap-1 rounded-lg p-1 bg-muted/50">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-md p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="Ver em lista"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`rounded-md p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${viewMode === "cards" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="Ver em cards"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localOrder.map((c) => c.id)}
            strategy={viewMode === "list" ? verticalListSortingStrategy : rectSortingStrategy}
          >
            {viewMode === "list" ? (
              <div className="divide-y divide-border">
                {localOrder.map((c) => (
                  <SortableListItem
                    key={c.id}
                    c={c}
                    navigate={navigate}
                    openDropdownCaseId={openDropdownCaseId}
                    setOpenDropdownCaseId={setOpenDropdownCaseId}
                    dropdownMenuRef={dropdownMenuRef}
                    setCaseToRemove={setCaseToRemove}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {localOrder.map((c) => (
                  <SortableCardItem
                    key={c.id}
                    c={c}
                    navigate={navigate}
                    openDropdownCaseId={openDropdownCaseId}
                    setOpenDropdownCaseId={setOpenDropdownCaseId}
                    dropdownMenuRef={dropdownMenuRef}
                    setCaseToRemove={setCaseToRemove}
                  />
                ))}
              </div>
            )}
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {activeCase ? <DragGhost c={activeCase} /> : null}
          </DragOverlay>
        </DndContext>

        {!isLoading && localOrder.length === 0 && (
          <div className="px-6 py-10 text-sm text-muted-foreground">Nenhum case cadastrado ainda.</div>
        )}
      </div>
    </section>
  );
}
