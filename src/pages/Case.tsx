import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

type CaseCategory = {
  id: string;
  name: string;
  slug: string;
};

type CaseDetail = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  year: number | null;
  cover_image_url: string | null;
  services: string[] | null;
  client_name: string | null;
  categories: CaseCategory[];
};

type CaseMediaItem = {
  id: string;
  url: string;
  type: string;
  title: string | null;
  alt_text: string | null;
  sort_order: number | null;
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

async function getCaseBySlug(slug: string): Promise<CaseDetail> {
  const { data, error } = await supabase
    .from("cases")
    .select(
      "id,title,slug,summary,year,cover_image_url,services,status,published_at,clients(name),case_category_cases(case_categories(id,name,slug))",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .not("published_at", "is", null)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Case não encontrado.");

  const row = data as unknown as {
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    year: number | null;
    cover_image_url: string | null;
    services: string[] | null;
    clients: { name: string } | null;
    case_category_cases: Array<{ case_categories: CaseCategory | null }> | null;
  };

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    year: row.year,
    cover_image_url: row.cover_image_url,
    services: row.services,
    client_name: row.clients?.name ?? null,
    categories:
      row.case_category_cases
        ?.map((cc) => cc.case_categories)
        .filter(Boolean) as CaseCategory[] | undefined ?? [],
  };
}

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

export default function CasePage() {
  const { slug } = useParams<{ slug: string }>();
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  const caseQuery = useQuery({
    queryKey: ["cases", "detail", slug],
    queryFn: () => getCaseBySlug(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  const mediaQuery = useQuery({
    queryKey: ["cases", caseQuery.data?.id, "media"],
    queryFn: () => getCaseMedia(caseQuery.data!.id),
    enabled: !!caseQuery.data?.id,
    staleTime: 5 * 60 * 1000,
  });

  const media = (mediaQuery.data ?? []).filter((m) => m.type !== "video");
  const current = lightboxIndex != null ? media[lightboxIndex] : null;

  React.useEffect(() => {
    if (lightboxIndex == null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxIndex(null);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setLightboxIndex((idx) => (idx == null ? idx : (idx - 1 + media.length) % media.length));
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setLightboxIndex((idx) => (idx == null ? idx : (idx + 1) % media.length));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxIndex, media.length]);

  React.useEffect(() => {
    // Reset lightbox when navigating between cases.
    setLightboxIndex(null);
  }, [slug]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="px-6 md:px-12 lg:px-20 py-6 border-b border-border/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6">
          <Link to="/" className="font-display text-xl font-bold text-primary tracking-tight">
            ONMX
          </Link>
          <Link
            to="/#cases"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Voltar aos cases
          </Link>
        </div>
      </header>

      <section className="px-6 md:px-12 lg:px-20 py-10 md:py-12">
        <div className="max-w-6xl mx-auto">
          {caseQuery.isLoading ? (
            <div className="rounded-3xl border border-border bg-card overflow-hidden">
              <div className="aspect-[16/9] bg-muted animate-pulse" />
              <div className="p-8 md:p-10 space-y-4">
                <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                <div className="h-10 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ) : caseQuery.isError || !caseQuery.data ? (
            <div className="rounded-3xl border border-border bg-card p-10 md:p-14 text-center">
              <h1 className="font-display text-2xl md:text-3xl font-semibold">Case não encontrado</h1>
              <p className="mt-3 text-secondary-foreground leading-relaxed max-w-xl mx-auto">
                Esse projeto pode ter sido removido ou ainda não foi publicado.
              </p>
              <div className="mt-8">
                <Link to="/#cases" className="inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:brightness-110 transition-all">
                  Ver todos os cases
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-3xl border border-border bg-card overflow-hidden">
                <div className="relative aspect-[16/9] bg-muted">
                  {caseQuery.data.cover_image_url ? (
                    <OptimizedImage
                      src={toPublicObjectUrl(caseQuery.data.cover_image_url, "case-covers")}
                      alt=""
                      preset="hero"
                      priority
                      widths={[960, 1440, 1920]}
                      sizes="100vw"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/40" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/40" />
                  <div className="absolute inset-x-0 bottom-0 p-8 md:p-10">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-white/85">
                      {caseQuery.data.client_name ? (
                        <span className="font-medium">{caseQuery.data.client_name}</span>
                      ) : null}
                      {caseQuery.data.year ? <span className="text-white/70">· {caseQuery.data.year}</span> : null}
                    </div>
                    <h1 className="mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight text-white leading-[1.05]">
                      {caseQuery.data.title}
                    </h1>
                  </div>
                </div>

                <div className="p-8 md:p-10">
                  {!!caseQuery.data.categories.length && (
                    <div className="flex flex-wrap gap-2.5">
                      {caseQuery.data.categories.map((cat) => (
                        <span
                          key={cat.id}
                          className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/15"
                        >
                          {cat.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {caseQuery.data.summary ? (
                    <p className={cn("mt-6 text-secondary-foreground leading-relaxed", "max-w-3xl")}>
                      {caseQuery.data.summary}
                    </p>
                  ) : null}

                  {!!caseQuery.data.services?.length && (
                    <div className="mt-8 flex flex-wrap gap-2.5">
                      {caseQuery.data.services.map((s) => (
                        <span
                          key={s}
                          className="px-4 py-2 rounded-full bg-card text-foreground text-sm font-medium border border-border"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-14 md:mt-16">
                <div className="flex items-end justify-between gap-6">
                  <div>
                    <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                      Galeria
                    </h2>
                    <p className="mt-2 text-secondary-foreground">
                      Imagens e peças do projeto.
                    </p>
                  </div>
                </div>

                <div className="mt-8">
                  {mediaQuery.isLoading ? (
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
                  ) : mediaQuery.isError ? (
                    <div className="rounded-2xl border border-border bg-card p-8">
                      <p className="text-secondary-foreground">
                        Não foi possível carregar a galeria agora.
                      </p>
                    </div>
                  ) : media.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-card p-8">
                      <p className="text-secondary-foreground">Esse case ainda não tem imagens.</p>
                    </div>
                  ) : (
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
            </>
          )}
        </div>
      </section>

      <Footer />

      {/* Lightbox */}
      {current && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setLightboxIndex(null)}
            aria-label="Fechar"
          />

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
                      setLightboxIndex((idx) => (idx == null ? idx : (idx - 1 + media.length) % media.length))
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
                      setLightboxIndex((idx) => (idx == null ? idx : (idx + 1) % media.length))
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
    </main>
  );
}

