import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import * as React from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { getPrimaryCompany } from "@/lib/onmx/company";
import { useNavigate } from "react-router-dom";

type CaseCategory = {
  id: string;
  name: string;
  slug: string;
};

type CaseItem = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  year: number | null;
  cover_image_url: string | null;
  client_name: string | null;
  services: string[] | null;
  categories: CaseCategory[];
};

function toPublicObjectUrl(url: string, bucketId: string) {
  // Supabase sometimes returns `/object/<bucket>/...` which 400s in browser.
  // Ensure we always use the public path.
  if (url.includes(`/storage/v1/object/public/${bucketId}/`)) return url;
  if (url.includes(`/storage/v1/object/${bucketId}/`)) {
    return url.replace(
      `/storage/v1/object/${bucketId}/`,
      `/storage/v1/object/public/${bucketId}/`,
    );
  }
  return url;
}

async function getCases(): Promise<CaseItem[]> {
  // Pull from base table and join categories
  const { data, error } = await supabase
    .from("cases")
    .select(
      "id,title,slug,summary,year,cover_image_url,services,status,published_at,clients(name),case_category_cases(case_categories(id,name,slug))",
    )
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(24);

  if (error) throw error;

  return (
    (data as unknown as Array<{
      id: string;
      title: string;
      slug: string;
      summary: string | null;
      year: number | null;
      cover_image_url: string | null;
      services: string[] | null;
      clients: { name: string } | null;
      case_category_cases: Array<{ case_categories: CaseCategory | null }> | null;
    }>)?.map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      summary: item.summary,
      year: item.year,
      cover_image_url: item.cover_image_url,
      services: item.services,
      client_name: item.clients?.name ?? null,
      categories:
        item.case_category_cases
          ?.map((cc) => cc.case_categories)
          .filter(Boolean) as CaseCategory[] | undefined ?? [],
    })) ?? []
  );
}

async function getCaseCategories(): Promise<CaseCategory[]> {
  // Categories are defined per company. We try to scope by the primary active company.
  // If company lookup fails for any reason, we fall back to "all categories" to avoid
  // silently rendering hardcoded categories.
  let companyId: string | null = null;
  try {
    const company = await getPrimaryCompany();
    companyId = company.id;
  } catch {
    companyId = null;
  }

  const baseSelect = "id,name,slug";
  const scopedSelect = `${baseSelect},case_category_companies!inner(company_id)`;

  const query = companyId
    ? supabase
        .from("case_categories")
        .select(scopedSelect)
        .eq("case_category_companies.company_id", companyId)
    : supabase.from("case_categories").select(baseSelect);

  const { data, error } = await query.order("name", { ascending: true });

  if (error) throw error;
  return (
    (data as unknown as Array<{ id: string; name: string; slug: string }>)?.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    })) ?? []
  );
}

const Cases = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["cases", "featured"],
    queryFn: getCases,
    staleTime: 5 * 60 * 1000,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["cases", "categories"],
    queryFn: getCaseCategories,
    staleTime: 10 * 60 * 1000,
  });

  const cases = data ?? [];
  const categories = categoriesData ?? [];
  const [activeFilter, setActiveFilter] = React.useState<string>("Todos");

  const filteredCases = React.useMemo(() => {
    if (activeFilter === "Todos") return cases;

    return cases.filter((c) => c.categories.some((cat) => cat.id === activeFilter));
  }, [cases, activeFilter]);

  return (
    <section id="cases" className="section-padding scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="inline-flex items-center rounded-full bg-primary/10 text-primary font-body text-sm font-medium px-4 py-2 mb-4"
        >
          Cases & Experiências
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-3xl md:text-5xl font-display font-bold mb-14 md:mb-16"
        >
          Projetos que falam por si.
        </motion.h2>

        <div className="flex flex-wrap gap-3 mb-14 md:mb-16">
          {[{ id: "Todos", label: "Todos" }, ...categories.map((c) => ({ id: c.id, label: c.name }))].map(
            (item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              type="button"
              onClick={() => setActiveFilter(item.id)}
              aria-pressed={activeFilter === item.id}
              className={
                activeFilter === item.id
                  ? "px-6 py-3 rounded-full bg-primary text-primary-foreground font-body font-medium text-sm transition-colors"
                  : "px-6 py-3 rounded-full border border-border bg-card font-body font-medium text-sm text-foreground hover:border-primary/40 hover:text-primary transition-all"
              }
            >
              {item.label}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-16 md:mb-20">
          {isLoading &&
            Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-card border border-border overflow-hidden"
              >
                <div className="aspect-[1/1] md:aspect-[5/4] bg-muted animate-pulse" />
                <div className="p-6 md:p-7 space-y-3">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-4/5 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-full bg-muted rounded animate-pulse" />
                  <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}

          {!isLoading &&
            filteredCases.map((item, i) => (
              // Image-first card: cover takes over, info is an overlay.
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                role="button"
                tabIndex={0}
                aria-label={`Abrir case: ${item.title}`}
                className="group h-full rounded-2xl bg-card border border-border overflow-hidden hover:border-primary/25 transition-colors transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:-translate-y-0.5"
                onClick={() => navigate(`/cases/${item.slug || item.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/cases/${item.slug || item.id}`);
                  }
                }}
              >
                <div className="relative aspect-[1/1] md:aspect-[5/4] bg-muted">
                  {item.cover_image_url ? (
                    <OptimizedImage
                      src={toPublicObjectUrl(item.cover_image_url, "case-covers")}
                      alt=""
                      preset="card"
                      widths={[640, 800, 1024, 1280, 1600, 2000]}
                      // 1 col until md, 2 cols on md, 3 cols on lg.
                      sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/40" />
                  )}
                  {/* Base overlay (always on), stronger on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/0 opacity-85 transition-opacity group-hover:opacity-95" />
                  {/* Top legibility layer */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-black/0 opacity-75 transition-opacity group-hover:opacity-90" />

                  <div className="absolute inset-x-0 top-0 p-8 md:p-10">
                    <div className="flex items-center justify-between gap-3 text-sm text-white/85">
                      <span className="font-body">{item.client_name ?? "Case"}</span>
                      {item.year ? <span className="tabular-nums">{item.year}</span> : null}
                    </div>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-8 md:p-10">
                    <h3 className="font-display font-semibold text-white text-lg md:text-xl leading-snug">
                      {item.title}
                    </h3>

                    {!!item.categories.length && (
                      <div className="mt-3 flex flex-wrap gap-2.5">
                        {item.categories.slice(0, 2).map((cat) => (
                          <span
                            key={cat.id}
                            className="px-3.5 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-medium border border-white/20 backdrop-blur-sm"
                          >
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.summary ? (
                      <p className="mt-3 text-base text-white/85 leading-relaxed line-clamp-3">
                        {item.summary}
                      </p>
                    ) : null}

                    {item.services?.length ? (
                      <div className="mt-5 flex flex-wrap gap-2.5">
                        {item.services.slice(0, 2).map((s) => (
                          <span
                            key={s}
                            className="px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium ring-1 ring-white/15 backdrop-blur-sm"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.article>
            ))}

          {!isLoading && !isError && cases.length === 0 && (
            <div className="rounded-2xl bg-card border border-border p-8 md:col-span-2 lg:col-span-3">
              <p className="text-secondary-foreground">
                Nenhum case publicado ainda.
              </p>
            </div>
          )}

          {!isLoading && !isError && cases.length > 0 && filteredCases.length === 0 && (
            <div className="rounded-2xl bg-card border border-border p-8 md:col-span-2 lg:col-span-3">
              <p className="text-secondary-foreground">
                Nenhum case encontrado para{" "}
                <span className="font-medium text-foreground">
                  {categories.find((c) => c.id === activeFilter)?.name ??
                    "essa categoria"}
                </span>
                .
              </p>
            </div>
          )}

          {!isLoading && isError && (
            <div className="rounded-2xl bg-card border border-border p-8 md:col-span-2 lg:col-span-3">
              <p className="text-secondary-foreground">
                Não foi possível carregar os cases no momento.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-secondary-foreground max-w-lg"
        >
          Experiência em projetos de alta complexidade, com foco em consistência e performance.
        </motion.p>
      </div>
    </section>
  );
};

export default Cases;
