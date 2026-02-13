import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, UploadCloud } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { getPrimaryCompany } from "@/lib/onmx/company";
import { toSlug } from "@/lib/onmx/slug";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type ClientOption = { id: string; name: string };
type CategoryOption = { id: string; name: string };

type CaseRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  year: number | null;
  cover_image_url: string | null;
  services: string[] | null;
  status: string | null;
  published_at: string | null;
  clients: { id: string; name: string } | null;
  categories: { id: string; name: string }[];
};

type CaseMediaRow = {
  id: string;
  url: string;
  type: string;
  sort_order: number | null;
  title: string | null;
  alt_text: string | null;
};

function toPublicObjectUrl(url: string, bucketId: string) {
  if (url.includes(`/storage/v1/object/public/${bucketId}/`)) return url;
  return url.replace(`/storage/v1/object/${bucketId}/`, `/storage/v1/object/public/${bucketId}/`);
}

async function getClients(): Promise<ClientOption[]> {
  const { data, error } = await supabase.from("clients").select("id,name").order("name");
  if (error) throw error;
  return (data as ClientOption[]) ?? [];
}

async function getCategoriesForCompany(companyId: string): Promise<CategoryOption[]> {
  const { data, error } = await supabase
    .from("case_category_companies")
    .select("case_categories(id,name)")
    .eq("company_id", companyId);
  if (error) throw error;
  const cats = (data as any[])?.map((r) => r.case_categories).filter(Boolean) as CategoryOption[] | undefined;
  const uniq = new Map<string, CategoryOption>();
  (cats ?? []).forEach((c) => uniq.set(c.id, c));
  return Array.from(uniq.values()).sort((a, b) => a.name.localeCompare(b.name));
}

async function getCases(): Promise<CaseRow[]> {
  const { data, error } = await supabase
    .from("cases")
    .select(
      "id,title,slug,summary,year,cover_image_url,services,status,published_at,clients(id,name),case_category_cases(case_categories(id,name))",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    (data as any[])?.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      summary: row.summary,
      year: row.year,
      cover_image_url: row.cover_image_url,
      services: row.services,
      status: row.status,
      published_at: row.published_at,
      clients: row.clients,
      categories: (row.case_category_cases ?? [])
        .map((cc: any) => cc.case_categories)
        .filter(Boolean),
    })) ?? []
  );
}

async function getCaseMedia(caseId: string): Promise<CaseMediaRow[]> {
  const { data, error } = await supabase
    .from("case_media")
    .select("id,url,type,sort_order,title,alt_text")
    .eq("case_id", caseId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as CaseMediaRow[]) ?? [];
}

export default function AdminCases() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: company } = useQuery({
    queryKey: ["admin", "company"],
    queryFn: getPrimaryCompany,
    staleTime: 10 * 60 * 1000,
  });

  const { data: clients } = useQuery({
    queryKey: ["admin", "clients", "options"],
    queryFn: getClients,
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories } = useQuery({
    queryKey: ["admin", "categories", "options", company?.id],
    queryFn: () => getCategoriesForCompany(company!.id),
    enabled: !!company?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "cases"],
    queryFn: getCases,
    staleTime: 30 * 1000,
  });

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CaseRow | null>(null);

  const [title, setTitle] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [year, setYear] = React.useState<string>("");
  const [coverUrl, setCoverUrl] = React.useState("");
  const [coverUploading, setCoverUploading] = React.useState(false);
  const [services, setServices] = React.useState("");
  const [status, setStatus] = React.useState<"draft" | "published">("draft");
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<string[]>([]);

  const [mediaUrl, setMediaUrl] = React.useState("");

  React.useEffect(() => {
    if (!editing) {
      setTitle("");
      setClientId("");
      setSummary("");
      setYear("");
      setCoverUrl("");
      setCoverUploading(false);
      setServices("");
      setStatus("draft");
      setSelectedCategoryIds([]);
      setMediaUrl("");
      return;
    }
    setTitle(editing.title);
    setClientId(editing.clients?.id ?? "");
    setSummary(editing.summary ?? "");
    setYear(editing.year ? String(editing.year) : "");
    setCoverUrl(editing.cover_image_url ? toPublicObjectUrl(editing.cover_image_url, "case-covers") : "");
    setCoverUploading(false);
    setServices((editing.services ?? []).join(", "));
    setStatus((editing.status === "published" ? "published" : "draft") as any);
    setSelectedCategoryIds(editing.categories.map((c) => c.id));
    setMediaUrl("");
  }, [editing]);

  async function uploadCover(file: File) {
    if (!editing?.id) {
      toast({
        title: "Salve o case primeiro",
        description: "Depois de salvar, você poderá subir o arquivo de capa.",
        variant: "destructive",
      });
      return;
    }

    setCoverUploading(true);
    try {
      const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, "-").toLowerCase();
      const path = `covers/${editing.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("case-covers")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        throw new Error(
          uploadError.message.includes("row-level security") || uploadError.message.includes("permission")
            ? "Permissão insuficiente no Storage para enviar arquivos no bucket case-covers."
            : uploadError.message,
        );
      }

      const { data } = supabase.storage.from("case-covers").getPublicUrl(path);
      const publicUrl = toPublicObjectUrl(data.publicUrl, "case-covers");

      // Persist immediately (and confirm it actually updated)
      const { data: updated, error: updateError } = await supabase
        .from("cases")
        .update({ cover_image_url: publicUrl })
        .eq("id", editing.id)
        .select("cover_image_url")
        .single();

      if (updateError) {
        throw new Error(
          updateError.message.includes("row-level security") || updateError.message.includes("permission")
            ? "Permissão insuficiente para salvar a capa no banco (tabela cases)."
            : updateError.message,
        );
      }

      if (!updated?.cover_image_url) {
        throw new Error("Não foi possível salvar a capa no case (update não retornou cover_image_url).");
      }

      setCoverUrl(publicUrl);
      setEditing((prev) => (prev ? { ...prev, cover_image_url: publicUrl } : prev));
      await qc.invalidateQueries({ queryKey: ["admin", "cases"] });
      toast({ title: "Capa atualizada", description: "Arquivo enviado com sucesso." });
    } catch (err: any) {
      const message = err?.message ?? "Não foi possível enviar o arquivo.";
      toast({
        title: "Upload falhou",
        description: message,
        variant: "destructive",
      });
    } finally {
      setCoverUploading(false);
    }
  }

  const mediaQuery = useQuery({
    queryKey: ["admin", "case-media", editing?.id],
    queryFn: () => getCaseMedia(editing!.id),
    enabled: !!editing?.id && open,
    staleTime: 30 * 1000,
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error("Empresa não encontrada.");
      if (!title.trim()) throw new Error("Título é obrigatório.");
      if (!clientId) throw new Error("Selecione um cliente.");

      const payload: any = {
        id: editing?.id,
        group_id: company.group_id,
        owner_company_id: company.id,
        client_id: clientId,
        title: title.trim(),
        slug: editing?.slug ?? toSlug(title),
        summary: summary.trim() || null,
        year: year ? Number(year) : null,
        cover_image_url: coverUrl.trim() || null,
        services: services
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        status,
        published_at: status === "published" ? new Date().toISOString() : null,
      };

      const { data: saved, error } = await supabase
        .from("cases")
        .upsert(payload)
        .select("id")
        .single();
      if (error) throw error;

      // Sync categories links
      const caseId = saved.id as string;
      await supabase.from("case_category_cases").delete().eq("case_id", caseId);
      if (selectedCategoryIds.length) {
        const links = selectedCategoryIds.map((category_id) => ({ case_id: caseId, category_id }));
        const { error: linkErr } = await supabase.from("case_category_cases").insert(links);
        if (linkErr) throw linkErr;
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "cases"] });
      toast({ title: "Salvo", description: "Case atualizado com sucesso." });
      setOpen(false);
      setEditing(null);
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err?.message ?? "Não foi possível salvar.", variant: "destructive" });
    },
  });

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
      toast({ title: "Erro", description: err?.message ?? "Não foi possível remover.", variant: "destructive" });
    },
  });

  const addMedia = useMutation({
    mutationFn: async () => {
      if (!editing?.id) throw new Error("Salve o case antes de adicionar mídia.");
      if (!mediaUrl.trim()) throw new Error("Informe a URL da imagem.");
      const { error } = await supabase.from("case_media").insert({
        case_id: editing.id,
        type: "image",
        url: mediaUrl.trim(),
        sort_order: 0,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setMediaUrl("");
      await qc.invalidateQueries({ queryKey: ["admin", "case-media", editing?.id] });
      toast({ title: "Adicionado", description: "Imagem adicionada ao case." });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err?.message ?? "Não foi possível adicionar.", variant: "destructive" });
    },
  });

  const removeMedia = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("case_media").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "case-media", editing?.id] });
      toast({ title: "Removido", description: "Imagem removida." });
    },
  });

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Cases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie e publique novos cases. Você também pode adicionar imagens para a galeria estilo Behance.
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
              Novo case
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar case" : "Novo case"}</DialogTitle>
            </DialogHeader>

            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                upsert.mutate();
              }}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Título</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Cliente</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Selecione…
                    </option>
                    {(clients ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Ano</label>
                  <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="draft">Rascunho</option>
                    <option value="published">Publicado</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Aparece no site apenas quando estiver como <span className="font-medium">Publicado</span>.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Capa (URL)</label>
                  <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" />
                </div>
              </div>

              {editing?.id && (
                <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">Capa (upload)</div>
                      <div className="text-xs text-muted-foreground">
                        Envie PNG/JPG/WebP. O link será salvo automaticamente no case.
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">Bucket: case-covers</div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={coverUploading}
                      onChange={async (e) => {
                        const input = e.currentTarget;
                        const file = input.files?.[0];
                        if (!file) return;
                        // Clear immediately to avoid React event reuse issues.
                        input.value = "";
                        await uploadCover(file);
                      }}
                    />
                    <div className="text-xs text-muted-foreground md:w-[180px]">
                      {coverUploading ? "Enviando…" : "Upload automático"}
                    </div>
                  </div>

                  {coverUrl ? (
                    <div className="overflow-hidden rounded-xl border border-border bg-background">
                      <img src={coverUrl} alt="" className="h-40 w-full object-cover" />
                    </div>
                  ) : null}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Resumo (opcional)</label>
                <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Serviços (separados por vírgula)</label>
                <Input value={services} onChange={(e) => setServices(e.target.value)} placeholder="Branding, Social, …" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Categorias</label>
                <div className="flex flex-wrap gap-2">
                  {(categories ?? []).map((cat) => {
                    const active = selectedCategoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() =>
                          setSelectedCategoryIds((prev) =>
                            active ? prev.filter((x) => x !== cat.id) : [...prev, cat.id],
                          )
                        }
                        className={
                          active
                            ? "px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium"
                            : "px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
                        }
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                  {(categories ?? []).length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      Crie categorias em “Categorias” para aparecerem aqui.
                    </span>
                  )}
                </div>
              </div>

              {editing?.id && (
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Galeria (imagens)</div>
                      <div className="text-xs text-muted-foreground">
                        Essas imagens aparecem no pop-up estilo Behance.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="URL da imagem"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addMedia.mutate()}
                      disabled={addMedia.isPending}
                      className="gap-2"
                    >
                      <UploadCloud className="h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {(mediaQuery.data ?? []).map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-muted-foreground">{m.url}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeMedia.mutate(m.id)}
                          aria-label="Remover imagem"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {!mediaQuery.isLoading && (mediaQuery.data?.length ?? 0) === 0 && (
                      <div className="text-sm text-muted-foreground">Nenhuma imagem ainda.</div>
                    )}
                  </div>
                </div>
              )}

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
            {isLoading ? "Carregando…" : `${data?.length ?? 0} cases`}
          </span>
        </div>

        <div className="divide-y divide-border">
          {(data ?? []).map((c) => (
            <div key={c.id} className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium truncate">{c.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {c.clients?.name ?? "—"} · {c.status ?? "draft"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setEditing(c);
                    setOpen(true);
                  }}
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => remove.mutate(c.id)}
                  aria-label="Remover"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {!isLoading && (data?.length ?? 0) === 0 && (
            <div className="px-6 py-10 text-sm text-muted-foreground">Nenhum case cadastrado ainda.</div>
          )}
        </div>
      </div>
    </section>
  );
}

