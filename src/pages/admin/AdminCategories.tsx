import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { useCompany } from "@/lib/company-context";
import { toSlug } from "@/lib/onmx/slug";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
};

async function getCompanyCategories(companyId: string): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from("case_category_companies")
    .select("case_categories(id,name,slug)")
    .eq("company_id", companyId);

  if (error) throw error;

  const categories =
    (data as any[])
      ?.map((row) => row.case_categories)
      .filter(Boolean) as CategoryRow[] | undefined;

  const uniq = new Map<string, CategoryRow>();
  (categories ?? []).forEach((c) => uniq.set(c.id, c));
  return Array.from(uniq.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export default function AdminCategories() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { company } = useCompany();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "categories", company.id],
    queryFn: () => getCompanyCategories(company.id),
    staleTime: 60 * 1000,
  });

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CategoryRow | null>(null);
  const [name, setName] = React.useState("");
  const [openDropdownId, setOpenDropdownId] = React.useState<string | null>(null);
  const dropdownMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!openDropdownId) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownMenuRef.current && !dropdownMenuRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdownId]);

  React.useEffect(() => {
    if (!editing) setName("");
    else setName(editing.name);
  }, [editing]);

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        id: editing?.id,
        group_id: company.group_id,
        name: name.trim(),
        slug: editing?.slug ?? toSlug(name),
      };

      // Upsert category
      const { data: cat, error } = await supabase
        .from("case_categories")
        .upsert(payload)
        .select("id")
        .single();
      if (error) throw error;

      // Ensure link to this (single) company
      const { error: linkErr } = await supabase
        .from("case_category_companies")
        .upsert({ category_id: cat.id, company_id: company.id });
      if (linkErr) throw linkErr;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast({ title: "Salvo", description: "Categoria atualizada com sucesso." });
      setOpen(false);
      setEditing(null);
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err?.message ?? "Não foi possível salvar.", variant: "destructive" });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("case_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast({ title: "Removido", description: "Categoria removida." });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err?.message ?? "Não foi possível remover.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <AdminPageSkeleton blocks={2} />;
  }

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Categorias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Categorias usadas para organizar e filtrar os cases no site.
          </p>
        </div>

        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
            </DialogHeader>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                upsert.mutate();
              }}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={upsert.isPending}>
                  {upsert.isPending ? "Salvando…" : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {isLoading ? "Carregando…" : `${data?.length ?? 0} categorias`}
          </span>
        </div>

        <div className="divide-y divide-border">
          {(data ?? []).map((cat) => (
            <div key={cat.id} className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium truncate">{cat.name}</div>
                <div className="text-xs text-muted-foreground truncate">{cat.slug}</div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setEditing(cat);
                    setOpen(true);
                  }}
                  aria-label="Editar"
                  className="hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <div
                  className="relative"
                  ref={openDropdownId === cat.id ? dropdownMenuRef : undefined}
                >
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setOpenDropdownId(openDropdownId === cat.id ? null : cat.id)}
                    aria-label="Mais opções"
                    aria-expanded={openDropdownId === cat.id}
                    className="hover:bg-muted hover:text-foreground"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  {openDropdownId === cat.id && (
                    <div
                      className="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-border bg-card py-1 shadow-lg"
                      role="menu"
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          remove.mutate(cat.id);
                          setOpenDropdownId(null);
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
          ))}

          {!isLoading && (data?.length ?? 0) === 0 && (
            <div className="px-6 py-10 text-sm text-muted-foreground">
              Nenhuma categoria criada ainda.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

