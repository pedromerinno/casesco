import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { useCompany } from "@/lib/company-context";
import { toSlug } from "@/lib/onmx/slug";
import { sanitizeSvgToCurrentColor } from "@/lib/onmx/svg";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type ClientRow = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  website_url: string | null;
  logo_url: string | null;
  logo_svg: string | null;
  created_at: string | null;
};

async function getClientsByGroup(groupId: string): Promise<ClientRow[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id,name,slug,industry,website_url,logo_url,logo_svg,created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ClientRow[]) ?? [];
}

export default function AdminClients() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { company } = useCompany();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "clients", company.id],
    queryFn: () => getClientsByGroup(company.group_id),
    staleTime: 60 * 1000,
  });

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ClientRow | null>(null);
  const [name, setName] = React.useState("");
  const [industry, setIndustry] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [logoSvg, setLogoSvg] = React.useState<string>("");
  const [logoSvgError, setLogoSvgError] = React.useState<string>("");

  React.useEffect(() => {
    if (!editing) {
      setName("");
      setIndustry("");
      setWebsite("");
      setLogoUrl("");
      setLogoSvg("");
      setLogoSvgError("");
      return;
    }
    setName(editing.name);
    setIndustry(editing.industry ?? "");
    setWebsite(editing.website_url ?? "");
    setLogoUrl(editing.logo_url ?? "");
    setLogoSvg(editing.logo_svg ?? "");
    setLogoSvgError("");
  }, [editing]);

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        id: editing?.id,
        group_id: company.group_id,
        name: name.trim(),
        slug: editing?.slug ?? toSlug(name),
        industry: industry.trim() || null,
        website_url: website.trim() || null,
        logo_url: logoSvg.trim() ? null : logoUrl.trim() || null,
        logo_svg: logoSvg.trim() || null,
      };

      const { error } = await supabase.from("clients").upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "clients"] });
      toast({ title: "Salvo", description: "Cliente atualizado com sucesso." });
      setOpen(false);
      setEditing(null);
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err?.message ?? "Não foi possível salvar.", variant: "destructive" });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "clients"] });
      toast({ title: "Removido", description: "Cliente removido." });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err?.message ?? "Não foi possível remover.", variant: "destructive" });
    },
  });

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre nomes e logos para aparecerem na faixa de clientes do site.
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
              Novo cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Indústria (opcional)</label>
                  <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Website (opcional)</label>
                  <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Logo (SVG recomendado)</label>
                <Input
                  type="file"
                  accept="image/svg+xml"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      setLogoSvgError("");
                      const text = await file.text();
                      const sanitized = sanitizeSvgToCurrentColor(text);
                      setLogoSvg(sanitized);
                      setLogoUrl("");
                    } catch (err: any) {
                      setLogoSvg("");
                      setLogoSvgError(err?.message ?? "Não foi possível ler o SVG.");
                    } finally {
                      // allow selecting same file again
                      e.currentTarget.value = "";
                    }
                  }}
                />
                {logoSvgError ? (
                  <p className="text-xs text-destructive">{logoSvgError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Envie um SVG. Ele será sanitizado e renderizado em roxo automaticamente no site.
                  </p>
                )}
                {logoSvg.trim() ? (
                  <div className="mt-3 rounded-xl border border-border bg-background p-4">
                    <div className="text-xs text-muted-foreground mb-2">Preview</div>
                    <div
                      className="text-primary [&_svg]:h-6 [&_svg]:w-auto [&_svg]:max-w-full"
                      dangerouslySetInnerHTML={{ __html: logoSvg }}
                    />
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Logo URL (opcional)</label>
                <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
                <p className="text-xs text-muted-foreground">
                  Preferir SVG/PNG com fundo transparente.
                </p>
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
            {isLoading ? "Carregando…" : `${data?.length ?? 0} clientes`}
          </span>
        </div>

        <div className="divide-y divide-border">
          {(data ?? []).map((client) => (
            <div key={client.id} className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium truncate">{client.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {client.website_url ?? client.industry ?? client.slug}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setEditing(client);
                    setOpen(true);
                  }}
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => remove.mutate(client.id)}
                  aria-label="Remover"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {!isLoading && (data?.length ?? 0) === 0 && (
            <div className="px-6 py-10 text-sm text-muted-foreground">
              Nenhum cliente cadastrado ainda.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

