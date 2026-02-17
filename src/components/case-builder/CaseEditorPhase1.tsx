import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import MuxPlayer from "@mux/mux-player-react";
import { ImageIcon, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { useCompany } from "@/lib/company-context";
import { toSlug } from "@/lib/onmx/slug";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import MediaLibraryDialog from "@/components/case-builder/MediaLibraryDialog";
import {
  getClients,
  getCategoriesForCompany,
  toPublicObjectUrl,
  type CaseRow,
} from "@/lib/case-builder/queries";

type Props = {
  caseData: CaseRow | null;
  onSaved: (id: string) => void;
  formId?: string;
  /** When false, the submit button is hidden (e.g. when used in sidebar; parent triggers save via ref). */
  showSubmitButton?: boolean;
};

const CaseEditorPhase1 = React.forwardRef<
  { submit: () => Promise<void> },
  Props
>(function CaseEditorPhase1(
  { caseData, onSaved, formId, showSubmitButton = true },
  ref,
) {
  const { toast } = useToast();
  const { company } = useCompany();

  const { data: clients } = useQuery({
    queryKey: ["admin", "clients", "options", company.id],
    queryFn: () => getClients(company.group_id),
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories } = useQuery({
    queryKey: ["admin", "categories", "options", company.id],
    queryFn: () => getCategoriesForCompany(company.id),
    staleTime: 5 * 60 * 1000,
  });

  const [title, setTitle] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [year, setYear] = React.useState("");
  const [coverUrl, setCoverUrl] = React.useState("");
  const [coverVideoUrl, setCoverVideoUrl] = React.useState("");
  const [coverMuxPlaybackId, setCoverMuxPlaybackId] = React.useState("");
  const [coverLibOpen, setCoverLibOpen] = React.useState(false);
  const [posterLibOpen, setPosterLibOpen] = React.useState(false);
  const [services, setServices] = React.useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!caseData) return;
    setTitle(caseData.title);
    setClientId(caseData.clients?.id ?? "");
    setSummary(caseData.summary ?? "");
    setYear(caseData.year ? String(caseData.year) : "");
    setCoverUrl(
      caseData.cover_image_url
        ? toPublicObjectUrl(caseData.cover_image_url, "case-covers")
        : "",
    );
    setCoverVideoUrl(caseData.cover_video_url ?? "");
    setCoverMuxPlaybackId(caseData.cover_mux_playback_id ?? "");
    setServices((caseData.services ?? []).join(", "));
    setSelectedCategoryIds(caseData.categories.map((c) => c.id));
  }, [caseData]);

  async function saveCaseMetadata(): Promise<void> {
    if (!title.trim()) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      throw new Error("Título é obrigatório");
    }
    if (!clientId) {
      toast({ title: "Selecione um cliente", variant: "destructive" });
      throw new Error("Selecione um cliente");
    }

    setSaving(true);
    try {
      const currentStatus = caseData?.status ?? "draft";
      const nextStatus =
        currentStatus === "published" || currentStatus === "restricted"
          ? currentStatus
          : "published";

      const payload: any = {
        ...(caseData?.id ? { id: caseData.id } : {}),
        group_id: company.group_id,
        owner_company_id: company.id,
        client_id: clientId,
        title: title.trim(),
        slug: caseData?.slug ?? toSlug(title),
        summary: summary.trim() || null,
        year: year ? Number(year) : null,
        cover_image_url: coverUrl.trim() || null,
        cover_video_url: coverVideoUrl.trim() || null,
        cover_mux_playback_id: coverMuxPlaybackId.trim() || null,
        services: services
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        status: nextStatus,
        published_at:
          nextStatus === "published" || nextStatus === "restricted"
            ? caseData?.published_at ?? new Date().toISOString()
            : null,
      };

      const { data: saved, error } = await supabase
        .from("cases")
        .upsert(payload)
        .select("id")
        .single();
      if (error) throw error;

      const caseId = saved.id as string;

      await supabase.from("case_category_cases").delete().eq("case_id", caseId);
      if (selectedCategoryIds.length) {
        const links = selectedCategoryIds.map((category_id) => ({
          case_id: caseId,
          category_id,
        }));
        const { error: linkErr } = await supabase
          .from("case_category_cases")
          .insert(links);
        if (linkErr) throw linkErr;
      }

      onSaved(caseId);
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message ?? "Não foi possível salvar.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  React.useImperativeHandle(ref, () => ({
    submit: saveCaseMetadata,
  }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveCaseMetadata();
  }

  return (
    <form id={formId} className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium">Título</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="grid grid-cols-1 gap-4">
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
          <Input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2026"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2 w-full">
          <label className="text-sm font-medium">Capa</label>
          <div className="flex items-center gap-2">
            <Input
              value={coverVideoUrl || coverUrl}
              onChange={(e) => {
                const val = e.target.value;
                if (!val.trim()) {
                  setCoverUrl("");
                  setCoverVideoUrl("");
                  setCoverMuxPlaybackId("");
                  return;
                }
                const isVideo = /\.(mp4|webm|mov|m3u8)(\?|$)/i.test(val) ||
                  /stream\.mux\.com/i.test(val) ||
                  /youtube\.com|youtu\.be|vimeo\.com/i.test(val);
                if (isVideo) {
                  setCoverVideoUrl(val);
                  const muxId = val.match(/stream\.mux\.com\/([^/?#]+)\.m3u8/i)?.[1] ?? "";
                  setCoverMuxPlaybackId(muxId);
                } else {
                  setCoverUrl(val);
                  setCoverVideoUrl("");
                  setCoverMuxPlaybackId("");
                }
              }}
              placeholder="https://…"
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => setCoverLibOpen(true)}
              className="inline-flex items-center gap-1 cursor-pointer rounded-md border border-input px-3 py-2 text-sm hover:bg-accent shrink-0"
            >
              <ImageIcon className="h-4 w-4" />
              Biblioteca
            </button>
          </div>
          {coverMuxPlaybackId ? (
            <div className="overflow-hidden rounded-xl border border-border bg-background aspect-video">
              <MuxPlayer
                playbackId={coverMuxPlaybackId}
                streamType="on-demand"
                className="w-full h-full"
                style={{ ["--controls" as any]: "none", ["--center-controls" as any]: "none", ["--top-controls" as any]: "none", ["--bottom-controls" as any]: "none" } as React.CSSProperties}
                poster={coverUrl || undefined}
                muted
                autoPlay="muted"
                loop
                playsInline
              />
            </div>
          ) : coverVideoUrl ? (
            <div className="overflow-hidden rounded-xl border border-border bg-background aspect-video">
              <video
                src={coverVideoUrl}
                className="h-full w-full object-cover"
                poster={coverUrl || undefined}
                muted
                autoPlay
                loop
                playsInline
              />
            </div>
          ) : coverUrl ? (
            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <img src={coverUrl} alt="" className="h-40 w-full object-cover" />
            </div>
          ) : null}

          {/* Frame inicial (poster) — só aparece quando a capa é vídeo */}
          {(coverVideoUrl || coverMuxPlaybackId) && (
            <div className="space-y-1.5 rounded-lg border border-dashed border-border bg-muted/30 p-3">
              <label className="text-xs font-medium text-muted-foreground">Frame inicial (poster)</label>
              <div className="flex items-center gap-2">
                <Input
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="URL da imagem de poster…"
                  className="flex-1 h-8 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setPosterLibOpen(true)}
                  className="inline-flex items-center gap-1 cursor-pointer rounded-md border border-input px-2 py-1.5 text-xs hover:bg-accent shrink-0"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Biblioteca
                </button>
                {coverUrl && (
                  <button
                    type="button"
                    onClick={() => setCoverUrl("")}
                    className="inline-flex items-center cursor-pointer rounded-md border border-input p-1.5 text-xs hover:bg-accent shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {coverUrl && (
                <div className="overflow-hidden rounded-md border border-border bg-background">
                  <img src={coverUrl} alt="Poster" className="h-20 w-full object-cover" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <MediaLibraryDialog
        open={coverLibOpen}
        onOpenChange={setCoverLibOpen}
        onSelect={({ url, muxPlaybackId }) => {
          if (muxPlaybackId) {
            setCoverVideoUrl(url);
            setCoverMuxPlaybackId(muxPlaybackId);
          } else {
            setCoverUrl(url);
            setCoverVideoUrl("");
            setCoverMuxPlaybackId("");
          }
        }}
        accept="all"
      />

      <MediaLibraryDialog
        open={posterLibOpen}
        onOpenChange={setPosterLibOpen}
        onSelect={({ url }) => setCoverUrl(url)}
        accept="image"
      />

      <div className="space-y-2">
        <label className="text-sm font-medium">Resumo (opcional)</label>
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Serviços (separados por vírgula)</label>
        <Input
          value={services}
          onChange={(e) => setServices(e.target.value)}
          placeholder="Branding, Social, …"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-medium">Categorias</label>
          <Link
            to="/admin/categorias"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Nova categoria
          </Link>
        </div>
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
              Nenhuma categoria ainda.{" "}
              <Link to="/admin/categorias" className="text-primary hover:underline">
                Criar categoria
              </Link>
            </span>
          )}
        </div>
      </div>

      {showSubmitButton && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving
              ? "Salvando…"
              : caseData?.status === "published" || caseData?.status === "restricted"
                ? "Salvar configurações"
                : "Publicar"}
          </Button>
        </div>
      )}
    </form>
  );
});

export default CaseEditorPhase1;
