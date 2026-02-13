import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export type CaseGalleryCase = {
  id: string;
  title: string;
  summary: string | null;
  year: number | null;
  client_name: string | null;
};

type CaseMediaItem = {
  id: string;
  url: string;
  type: string;
  title: string | null;
  alt_text: string | null;
  sort_order: number | null;
};

async function getCaseMedia(caseId: string): Promise<CaseMediaItem[]> {
  const { data, error } = await supabase
    .from("case_media")
    .select("id,url,type,title,alt_text,sort_order")
    .eq("case_id", caseId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as CaseMediaItem[]) ?? [];
}

export function CaseGalleryDialog({
  open,
  onOpenChange,
  caseItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseItem: CaseGalleryCase | null;
}) {
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["cases", caseItem?.id, "media"],
    queryFn: () => getCaseMedia(caseItem!.id),
    enabled: open && !!caseItem?.id,
    staleTime: 5 * 60 * 1000,
  });

  const media = (data ?? []).filter((m) => m.type !== "video");
  const current = lightboxIndex != null ? media[lightboxIndex] : null;

  React.useEffect(() => {
    if (!open) setLightboxIndex(null);
  }, [open]);

  React.useEffect(() => {
    if (lightboxIndex == null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxIndex(null);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setLightboxIndex((idx) =>
          idx == null ? idx : (idx - 1 + media.length) % media.length,
        );
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setLightboxIndex((idx) => (idx == null ? idx : (idx + 1) % media.length));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxIndex, media.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[calc(100%-1.5rem)] sm:w-[calc(100%-3rem)] p-0 overflow-hidden rounded-2xl">
        <div className="bg-background">
          <div className="px-6 md:px-10 pt-10 pb-6 md:pb-8 border-b border-border">
            <DialogTitle className="font-display text-2xl md:text-3xl">
              {caseItem?.title ?? "Case"}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm md:text-base">
              {caseItem?.client_name ? (
                <span className="text-foreground/80">{caseItem.client_name}</span>
              ) : null}
              {caseItem?.year ? (
                <span className="text-muted-foreground"> · {caseItem.year}</span>
              ) : null}
            </DialogDescription>

            {caseItem?.summary ? (
              <p className="mt-4 text-secondary-foreground leading-relaxed max-w-3xl">
                {caseItem.summary}
              </p>
            ) : null}
          </div>

          <div className="px-6 md:px-10 py-8">
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-2xl bg-muted animate-pulse",
                      i % 3 === 0 ? "h-56" : i % 3 === 1 ? "h-72" : "h-64",
                    )}
                  />
                ))}
              </div>
            )}

            {!isLoading && isError && (
              <div className="rounded-2xl border border-border bg-card p-8">
                <p className="text-secondary-foreground">
                  Não foi possível carregar a galeria agora.
                </p>
              </div>
            )}

            {!isLoading && !isError && media.length === 0 && (
              <div className="rounded-2xl border border-border bg-card p-8">
                <p className="text-secondary-foreground">Esse case ainda não tem imagens.</p>
              </div>
            )}

            {!isLoading && !isError && media.length > 0 && (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
                {media.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    className="group mb-4 w-full break-inside-avoid overflow-hidden rounded-2xl bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                    onClick={() => setLightboxIndex(idx)}
                    aria-label="Abrir imagem"
                  >
                    <OptimizedImage
                      src={item.url}
                      alt={item.alt_text ?? item.title ?? ""}
                      preset="gallery"
                      widths={[384, 512, 768, 1024, 1280]}
                      sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                      className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lightbox */}
        {current && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setLightboxIndex(null)} />

            <div className="relative z-10 h-full w-full flex items-center justify-center p-6 md:p-10">
              <div className="relative w-full max-w-6xl">
                <OptimizedImage
                  src={current.url}
                  alt={current.alt_text ?? current.title ?? ""}
                  preset="lightbox"
                  priority
                  className="mx-auto max-h-[72vh] md:max-h-[78vh] w-auto max-w-full rounded-2xl shadow-2xl"
                />

                {media.length > 1 && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      onClick={() =>
                        setLightboxIndex((idx) =>
                          idx == null ? idx : (idx - 1 + media.length) % media.length,
                        )
                      }
                      className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/15 text-white border-white/15"
                      aria-label="Imagem anterior"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      onClick={() =>
                        setLightboxIndex((idx) =>
                          idx == null ? idx : (idx + 1) % media.length,
                        )
                      }
                      className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/15 text-white border-white/15"
                      aria-label="Próxima imagem"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}

                <div className="mt-4 flex items-center justify-center text-white/70 text-sm">
                  {lightboxIndex != null ? (
                    <span className="tabular-nums">
                      {lightboxIndex + 1} / {media.length}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

