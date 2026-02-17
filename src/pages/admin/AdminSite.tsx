import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UploadCloud } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { useCompany, type Company } from "@/lib/company-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type PositioningMediaType = "image" | "video";

type PositioningSettingsRow = {
  id: string;
  positioning_media_type: PositioningMediaType | null;
  positioning_media_url: string | null;
  positioning_media_poster_url: string | null;
};

function toPublicObjectUrl(url: string, bucketId: string) {
  if (url.includes(`/storage/v1/object/public/${bucketId}/`)) return url;
  if (url.includes(`/storage/v1/object/${bucketId}/`)) {
    return url.replace(
      `/storage/v1/object/${bucketId}/`,
      `/storage/v1/object/public/${bucketId}/`,
    );
  }
  return url;
}

function looksLikeMissingColumnError(err: any) {
  // Postgres undefined_column = 42703
  return err?.code === "42703" || String(err?.message ?? "").toLowerCase().includes("column");
}

async function getPositioningSettings(companyId: string): Promise<PositioningSettingsRow | null> {
  const { data, error } = await supabase
    .from("companies")
    .select("id,positioning_media_type,positioning_media_url,positioning_media_poster_url")
    .eq("id", companyId)
    .single();

  if (error) {
    // If columns don't exist yet, the admin UI should still load and show instructions.
    if (looksLikeMissingColumnError(error)) return null;
    throw error;
  }

  return (data as PositioningSettingsRow) ?? null;
}

async function uploadToCaseCoversBucket(companyId: string, file: File, folder: string) {
  const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, "-").toLowerCase();
  const path = `site/${companyId}/${folder}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("case-covers")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("case-covers").getPublicUrl(path);
  return toPublicObjectUrl(data.publicUrl, "case-covers");
}

export default function AdminSite() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { company, updateCompany } = useCompany();

  /* ── Branding ── */
  const brandingQuery = useQuery({
    queryKey: ["admin", "site", "branding", company.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id,name,logo_url,brand_color")
        .eq("id", company.id)
        .single();
      if (error) {
        if (looksLikeMissingColumnError(error)) return null;
        throw error;
      }
      return data as { id: string; name: string; logo_url: string | null; brand_color: string | null };
    },
    staleTime: 30 * 1000,
  });

  const [brandName, setBrandName] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [brandColor, setBrandColor] = React.useState("#9D00F2");
  const [logoUploading, setLogoUploading] = React.useState(false);

  React.useEffect(() => {
    const b = brandingQuery.data;
    if (!b) return;
    setBrandName(b.name ?? "");
    setLogoUrl(b.logo_url ?? "");
    setBrandColor(b.brand_color ?? "#9D00F2");
  }, [brandingQuery.data]);

  const saveBranding = useMutation({
    mutationFn: async () => {
      const payload = {
        name: brandName.trim() || company.name,
        logo_url: logoUrl.trim() || null,
        brand_color: brandColor.trim() || null,
      };
      const { error } = await supabase.from("companies").update(payload).eq("id", company.id);
      if (error) throw error;
      updateCompany(payload as Partial<Company>);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "site", "branding"] });
      toast({ title: "Salvo", description: "Identidade visual atualizada." });
    },
    onError: (err: any) => {
      toast({
        title: "Erro",
        description: err?.message ?? "Não foi possível salvar.",
        variant: "destructive",
      });
    },
  });

  async function onUploadLogo(file: File) {
    if (!company.id) return;
    setLogoUploading(true);
    try {
      const nextUrl = await uploadToCaseCoversBucket(company.id, file, "logo");
      setLogoUrl(nextUrl);
      toast({ title: "Upload concluído", description: "Logo enviado com sucesso." });
    } catch (err: any) {
      toast({
        title: "Upload falhou",
        description: err?.message ?? "Não foi possível enviar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setLogoUploading(false);
    }
  }

  /* ── Positioning ── */
  const settingsQuery = useQuery({
    queryKey: ["admin", "site", "positioning-media", company.id],
    queryFn: () => getPositioningSettings(company.id),
    staleTime: 30 * 1000,
  });

  const [type, setType] = React.useState<PositioningMediaType>("image");
  const [url, setUrl] = React.useState("");
  const [posterUrl, setPosterUrl] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [posterUploading, setPosterUploading] = React.useState(false);

  React.useEffect(() => {
    const s = settingsQuery.data;
    if (!s) return;
    setType((s.positioning_media_type ?? "image") as PositioningMediaType);
    setUrl(s.positioning_media_url ?? "");
    setPosterUrl(s.positioning_media_poster_url ?? "");
  }, [settingsQuery.data]);

  const save = useMutation({
    mutationFn: async () => {

      const payload = {
        positioning_media_type: type,
        positioning_media_url: url.trim() || null,
        positioning_media_poster_url: type === "video" ? posterUrl.trim() || null : null,
      };

      const { error } = await supabase.from("companies").update(payload).eq("id", company.id);
      if (error) {
        if (looksLikeMissingColumnError(error)) {
          throw new Error(
            "Campos do Positioning ainda não existem no banco. Rode o SQL de migração (vou deixar no repo em `supabase/migrations/`).",
          );
        }
        throw error;
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "site", "positioning-media"] });
      toast({ title: "Atualizado", description: "Configuração do Positioning salva com sucesso." });
    },
    onError: (err: any) => {
      toast({
        title: "Erro",
        description: err?.message ?? "Não foi possível salvar.",
        variant: "destructive",
      });
    },
  });

  async function onUploadMedia(file: File) {
    if (!company.id) return;
    setUploading(true);
    try {
      const nextUrl = await uploadToCaseCoversBucket(
        company.id,
        file,
        type === "video" ? "positioning-video" : "positioning-image",
      );
      setUrl(nextUrl);
      toast({ title: "Upload concluído", description: "Arquivo enviado com sucesso." });
    } catch (err: any) {
      toast({
        title: "Upload falhou",
        description: err?.message ?? "Não foi possível enviar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  async function onUploadPoster(file: File) {
    if (!company.id) return;
    setPosterUploading(true);
    try {
      const nextUrl = await uploadToCaseCoversBucket(company.id, file, "positioning-poster");
      setPosterUrl(nextUrl);
      toast({ title: "Poster atualizado", description: "Imagem enviada com sucesso." });
    } catch (err: any) {
      toast({
        title: "Upload falhou",
        description: err?.message ?? "Não foi possível enviar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setPosterUploading(false);
    }
  }

  const missingSchema = settingsQuery.data === null && !settingsQuery.isLoading && !settingsQuery.isError;
  const acceptMedia =
    type === "video"
      ? "video/mp4,video/webm,video/quicktime"
      : "image/png,image/jpeg,image/webp";

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configurações do site e preferências gerais.
        </p>
      </div>

      {/* ── Identidade visual ── */}
      <div className="rounded-2xl border border-border bg-card p-6 md:p-7">
        <div>
          <div className="font-medium">Identidade visual</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Nome, logo e cor primária da empresa.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Nome da empresa</div>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Nome da empresa"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Logo</div>
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  disabled={logoUploading || !company.id}
                  onChange={async (e) => {
                    const input = e.currentTarget;
                    const file = input.files?.[0];
                    if (!file) return;
                    input.value = "";
                    await onUploadLogo(file);
                  }}
                />
                <div className="text-xs text-muted-foreground md:w-[180px]">
                  {logoUploading ? "Enviando…" : "Upload automático"}
                </div>
              </div>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://… logo.png"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Cor primária</div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                />
                <Input
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  placeholder="#9D00F2"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button onClick={() => saveBranding.mutate()} disabled={saveBranding.isPending}>
                {saveBranding.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">Preview</div>
            <div className="rounded-2xl border border-border overflow-hidden bg-muted p-6 space-y-4">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-10 object-contain" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-black/10 grid place-items-center text-xs text-muted-foreground">
                  Logo
                </div>
              )}
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-full shrink-0"
                  style={{ backgroundColor: brandColor }}
                />
                <span className="text-sm font-medium">{brandName || "Empresa"}</span>
              </div>
              <button
                type="button"
                className="px-4 py-2 rounded-full text-white text-sm font-medium"
                style={{ backgroundColor: brandColor }}
              >
                Botão de exemplo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Positioning ── */}
      <div className="rounded-2xl border border-border bg-card p-6 md:p-7">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="font-medium">Positioning · Background</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha uma imagem ou vídeo para o background dessa seção.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Bucket: <span className="font-medium">case-covers</span>
          </div>
        </div>

        {missingSchema ? (
          <div className="mt-5 rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
            O banco ainda não tem os campos necessários. Rode a migração em{" "}
            <span className="font-medium">`supabase/migrations/20260213_positioning_media.sql`</span>.
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setType("image")}
                aria-pressed={type === "image"}
                className={
                  type === "image"
                    ? "px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium"
                    : "px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
                }
              >
                Imagem
              </button>
              <button
                type="button"
                onClick={() => setType("video")}
                aria-pressed={type === "video"}
                className={
                  type === "video"
                    ? "px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium"
                    : "px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
                }
              >
                Vídeo
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Arquivo (upload)</div>
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <Input
                  type="file"
                  accept={acceptMedia}
                  disabled={uploading || !company.id}
                  onChange={async (e) => {
                    const input = e.currentTarget;
                    const file = input.files?.[0];
                    if (!file) return;
                    input.value = "";
                    await onUploadMedia(file);
                  }}
                />
                <div className="text-xs text-muted-foreground md:w-[180px]">
                  {uploading ? "Enviando…" : "Upload automático"}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Você também pode colar uma URL abaixo, se preferir.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">URL</div>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={type === "video" ? "https://… .mp4" : "https://… .jpg"}
              />
            </div>

            {type === "video" ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">Poster (opcional)</div>
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={posterUploading || !company.id}
                    onChange={async (e) => {
                      const input = e.currentTarget;
                      const file = input.files?.[0];
                      if (!file) return;
                      input.value = "";
                      await onUploadPoster(file);
                    }}
                  />
                  <div className="text-xs text-muted-foreground md:w-[180px]">
                    {posterUploading ? "Enviando…" : "Upload automático"}
                  </div>
                </div>

                <Input
                  value={posterUrl}
                  onChange={(e) => setPosterUrl(e.target.value)}
                  placeholder="URL do poster (opcional)"
                />
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setUrl("");
                  setPosterUrl("");
                }}
              >
                Limpar
              </Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">Preview</div>
            <div className="rounded-2xl border border-border overflow-hidden bg-muted">
              {type === "video" && url ? (
                <video
                  key={url}
                  className="w-full aspect-[16/10] object-cover"
                  src={url}
                  poster={posterUrl || undefined}
                  muted
                  playsInline
                  loop
                  controls
                />
              ) : url ? (
                <img src={url} alt="" className="w-full aspect-[16/10] object-cover" />
              ) : (
                <div className="w-full aspect-[16/10] grid place-items-center text-sm text-muted-foreground">
                  Nenhuma mídia selecionada.
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Dica: vídeos devem ser <span className="font-medium">muted + loop</span> para funcionar como background.
            </p>
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <UploadCloud className="h-4 w-4" />
        Os uploads usam a mesma infraestrutura de Storage já configurada para capas de cases.
      </div>
    </section>
  );
}

