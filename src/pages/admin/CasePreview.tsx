import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Plus } from "lucide-react";

import { OptimizedImage } from "@/components/ui/optimized-image";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import {
  getCaseByIdForPreview,
  getCaseBlocks,
  getCaseMedia,
  type CaseMediaItem,
} from "@/lib/case-builder/queries";
import type { VideoContent } from "@/lib/case-builder/types";
import { normalizeContainerContent } from "@/lib/case-builder/types";
import PublicContainerBlock from "@/components/case-blocks-public/PublicContainerBlock";
import PublicVideoBlock from "@/components/case-blocks-public/PublicVideoBlock";
import { useCompany } from "@/lib/company-context";

type GalleryImage = {
  id: string;
  url: string;
  alt: string;
  cover?: boolean;
};

type GalleryVideo = {
  id: string;
  content: VideoContent;
};

type GalleryItem = GalleryImage | GalleryVideo;

type ContainerMediaGrid = {
  id: string;
  columns: number;
  cols: GalleryItem[][];
};

function detectVideoProvider(url: string): VideoContent["provider"] {
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/vimeo\.com/i.test(url)) return "vimeo";
  return "file";
}

function parseMuxPlaybackId(url: string): string | null {
  const m = url.match(/stream\.mux\.com\/([^/?#]+)\.m3u8/i);
  return m?.[1] ?? null;
}

export default function CasePreview() {
  const { id } = useParams<{ id: string }>();
  const { company } = useCompany();
  const accentColor = company.brand_color ?? "#9D00F2";
  const [dockMenu, setDockMenu] = React.useState(false);
  const dockSentinelRef = React.useRef<HTMLDivElement | null>(null);
  const [infoOpen, setInfoOpen] = React.useState(false);
  const infoButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const infoMenuRef = React.useRef<HTMLDivElement | null>(null);

  const caseQuery = useQuery({
    queryKey: ["admin", "cases", id, "preview"],
    queryFn: () => getCaseByIdForPreview(id!),
    enabled: !!id,
    staleTime: 0,
  });

  const mediaQuery = useQuery({
    queryKey: ["admin", "cases", id, "media"],
    queryFn: () => getCaseMedia(id!),
    enabled: !!id && !!caseQuery.data?.id,
    staleTime: 0,
  });

  const blocksQuery = useQuery({
    queryKey: ["admin", "cases", id, "blocks", "preview"],
    queryFn: () => getCaseBlocks(id!),
    enabled: !!id && !!caseQuery.data?.id,
    staleTime: 0,
  });

  const containerGrids = React.useMemo<ContainerMediaGrid[]>(() => {
    const blocks = blocksQuery.data ?? [];
    const out: ContainerMediaGrid[] = [];

    for (const block of blocks) {
      if (block.type !== "container") continue;
      const c = normalizeContainerContent(block.content as any);

      const cols = c.slots.map((items, colIdx) => {
        const outItems: GalleryItem[] = [];
        items.forEach((item, itemIdx) => {
          if (!item) return;
          if (item.type === "image") {
            const url = String((item as any)?.content?.url ?? "").trim();
            if (!url) return;
            const alt = String((item as any)?.content?.alt ?? "").trim();
            const cover = Boolean((item as any)?.content?.cover);
            outItems.push({
              id: `${block.id}-${colIdx}-${itemIdx}`,
              url,
              alt,
              cover,
            });
            return;
          }
          if (item.type === "video") {
            const content = (item as any)?.content as VideoContent | undefined;
            if (!content) return;
            const hasMux =
              content.provider === "mux" && Boolean(content.muxPlaybackId);
            const hasUrl = Boolean(String(content.url ?? "").trim());
            if (!hasMux && !hasUrl) return;
            outItems.push({
              id: `${block.id}-${colIdx}-${itemIdx}`,
              content,
            });
          }
        });
        return outItems;
      });

      const hasAny = cols.some((c) => c.length > 0);
      if (!hasAny) continue;

      out.push({ id: block.id, columns: c.columns, cols });
    }

    return out;
  }, [blocksQuery.data]);

  const fallbackMedia = React.useMemo<GalleryItem[]>(() => {
    const media = mediaQuery.data ?? [];
    return media
      .filter((m) => Boolean(String(m.url ?? "").trim()))
      .map((m: CaseMediaItem) => {
        if (m.type === "video") {
          const muxPlaybackId = parseMuxPlaybackId(m.url);
          const provider: VideoContent["provider"] = muxPlaybackId
            ? "mux"
            : detectVideoProvider(m.url);

          const content: VideoContent = {
            url: m.url,
            provider,
            aspect: "16/9",
            muxPlaybackId: muxPlaybackId ?? undefined,
            controls: true,
            autoplay: false,
            loop: false,
          };

          return { id: m.id, content } satisfies GalleryVideo;
        }

        return {
          id: m.id,
          url: m.url,
          alt: m.alt_text ?? m.title ?? "",
        } satisfies GalleryImage;
      });
  }, [mediaQuery.data]);

  const hasContainerLayout = containerGrids.length > 0;
  const hasAnyMedia = hasContainerLayout || fallbackMedia.length > 0;

  React.useEffect(() => {
    if (!infoOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setInfoOpen(false);
    }

    function onPointerDown(e: MouseEvent | PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (infoMenuRef.current?.contains(target)) return;
      if (infoButtonRef.current?.contains(target)) return;
      setInfoOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [infoOpen]);

  React.useEffect(() => {
    const el = dockSentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setDockMenu(entry?.isIntersecting ?? false);
      },
      {
        root: null,
        threshold: 0,
        rootMargin: "0px 0px -96px 0px",
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [containerGrids.length, fallbackMedia.length, caseQuery.data?.id]);

  return (
    <main
      className="min-h-screen bg-background text-foreground"
      style={
        caseQuery.data?.page_background
          ? { backgroundColor: caseQuery.data.page_background }
          : undefined
      }
    >
      <section className="p-0">
        <div className="fixed top-4 left-4 z-50">
          <div className="relative">
            <button
              ref={infoButtonRef}
              type="button"
              onClick={() => setInfoOpen((v) => !v)}
              className={[
                "h-11 w-11 rounded-full",
                "bg-black/40 text-white",
                "backdrop-blur-xl",
                "ring-1 ring-white/15",
                "shadow-lg shadow-black/20",
                "grid place-items-center",
                "transition-colors",
                "hover:bg-black/55",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              ].join(" ")}
              aria-label="Abrir informações do projeto"
              aria-expanded={infoOpen}
            >
              <Plus
                className={[
                  "h-5 w-5 transition-transform",
                  infoOpen ? "rotate-45" : "rotate-0",
                ].join(" ")}
                aria-hidden="true"
              />
            </button>

            {infoOpen ? (
              <div
                ref={infoMenuRef}
                role="dialog"
                aria-label="Informações do projeto"
                className={[
                  "absolute left-0 mt-3 w-[min(380px,calc(100vw-2rem))]",
                  "rounded-2xl",
                  "bg-black/70 text-white",
                  "backdrop-blur-md",
                  "ring-1 ring-white/15",
                  "shadow-xl shadow-black/30",
                  "p-4",
                ].join(" ")}
              >
                <div className="space-y-3 text-sm">
                  <div className="text-[11px] text-amber-300/90 font-medium">
                    Prévia (rascunho) — só fica público após Salvar
                  </div>
                  <div>
                    <div className="text-[11px] text-white/60">Cliente</div>
                    <div className="font-medium">
                      {caseQuery.data?.client_name ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-white/60">Projeto</div>
                    <div className="font-medium">
                      {caseQuery.data?.title ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-white/60">Descrição</div>
                    <div className="text-white/90 leading-relaxed line-clamp-4">
                      {caseQuery.data?.summary ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-white/60">Ano</div>
                      <div className="font-medium tabular-nums">
                        {caseQuery.data?.year
                          ? String(caseQuery.data.year)
                          : "—"}
                      </div>
                    </div>
                    <div className="text-[11px] text-white/50">
                      ESC para fechar
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative w-full pb-28">
          {caseQuery.isLoading ? (
            <div className="space-y-0">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 md:h-80 bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : caseQuery.isError || !caseQuery.data ? (
            <div className="border border-border bg-card p-8 text-sm text-muted-foreground">
              Case não encontrado.
            </div>
          ) : !hasAnyMedia ? (
            <div className="border border-border bg-card p-8 text-sm text-muted-foreground">
              Esse case ainda não tem mídia. Salve os blocos no builder para
              ver a prévia.
            </div>
          ) : hasContainerLayout ? (
            <div
              className="flex flex-col"
              style={{
                padding: `${caseQuery.data?.container_padding ?? 0}px`,
                gap: `${caseQuery.data?.container_gap ?? 0}px`,
              }}
            >
              {(blocksQuery.data ?? [])
                .filter((b) => b.type === "container")
                .map((block) => {
                  const radius = caseQuery.data?.container_radius ?? 0;
                  return (
                    <div
                      key={block.id}
                      style={{
                        borderRadius: radius ? `${radius}px` : undefined,
                        overflow: radius ? "hidden" : undefined,
                      }}
                    >
                      <PublicContainerBlock
                        content={normalizeContainerContent(block.content as any)}
                        accentColor={accentColor}
                      />
                    </div>
                  );
                })}
            </div>
          ) : (
            <div>
              {fallbackMedia.map((item) =>
                "url" in item ? (
                  <OptimizedImage
                    key={item.id}
                    src={item.url}
                    alt={item.alt}
                    preset="gallery"
                    widths={[640, 960, 1280, 1920]}
                    sizes="100vw"
                    className="w-full h-auto"
                  />
                ) : (
                  <div key={item.id}>
                    <PublicVideoBlock content={item.content} accentColor={accentColor} />
                  </div>
                ),
              )}
            </div>
          )}

          <div ref={dockSentinelRef} className="h-1" />

          <div
            className={[
              dockMenu
                ? "absolute bottom-4 left-1/2 -translate-x-1/2"
                : "fixed bottom-4 left-1/2 -translate-x-1/2",
              "z-50 w-[min(520px,calc(100vw-2rem))] px-0 pointer-events-none",
            ].join(" ")}
          >
            <div className="pointer-events-auto flex items-center justify-center gap-2">
              <div className="flex-1 rounded-full bg-background/80 backdrop-blur-md ring-1 ring-border/70 shadow-lg shadow-black/10">
                <div className="h-12 px-2 sm:px-3 flex items-center justify-between gap-3">
                  <Button
                    asChild
                    variant="ghost"
                    className="h-10 px-3 rounded-full hover:bg-black/[0.04]"
                  >
                    <Link
                      to={`/admin/cases/${id}/builder`}
                      aria-label="Voltar ao builder"
                    >
                      <ChevronLeft
                        className="h-4 w-4 mr-1"
                        aria-hidden="true"
                      />
                      <span className="text-sm font-medium">Voltar ao builder</span>
                    </Link>
                  </Button>

                  <div className="min-w-0 flex-1 px-1 text-center">
                    <div className="text-sm font-medium truncate">
                      {caseQuery.data?.title ?? ""} (prévia)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
