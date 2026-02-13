import { motion } from "framer-motion";
import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Layers, Sparkles, Zap, Wand2 } from "lucide-react";

const bullets: { title: string; icon: LucideIcon }[] = [
  { title: "Time senior e operação ágil", icon: Zap },
  { title: "Design e narrativa no centro", icon: Sparkles },
  { title: "Estrutura escalável para demandas recorrentes", icon: Layers },
  { title: "Integração com branding e VFX quando necessário", icon: Wand2 },
];

const Differentials = () => {
  const itemRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    let rafId = 0;

    const updateActive = () => {
      rafId = 0;

      const viewportTopInset = 96; // accounts for the floating nav + breathing room
      const viewportCenter = (viewportTopInset + window.innerHeight) / 2;

      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      itemRefs.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();

        // Ignore elements fully outside viewport
        if (rect.bottom < viewportTopInset || rect.top > window.innerHeight) return;

        const center = rect.top + rect.height / 2;
        const distance = Math.abs(center - viewportCenter);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i;
        }
      });

      setActiveIndex(bestIndex);
    };

    const onScrollOrResize = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(updateActive);
    };

    updateActive();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  return (
    <section className="section-padding">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-start">
        <div className="md:sticky md:top-24 self-start">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center rounded-full bg-primary/10 text-primary font-body text-sm font-medium px-4 py-2 mb-4"
          >
            Nosso diferencial
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-3xl md:text-5xl font-display font-bold mb-6"
          >
            Full-service de verdade.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-secondary-foreground leading-relaxed"
          >
            Na ONMX, estratégia e execução acontecem dentro do mesmo ecossistema.
            Isso significa menos retrabalho, mais velocidade e entregas com padrão global.
          </motion.p>
        </div>

        <div className="space-y-8 md:space-y-10">
          {bullets.map((bullet, i) => {
            const Icon = bullet.icon;
            const isActive = i === activeIndex;

            return (
            <motion.div
              key={bullet.title}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              data-index={i}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              animate={{ opacity: isActive ? 1 : 0.7 }}
              className={[
                "group relative overflow-hidden flex items-center gap-5 md:gap-6",
                "min-h-36 md:min-h-44 px-8 md:px-10 py-8 md:py-10",
                "rounded-3xl border transition-all duration-300",
                "hover:-translate-y-0.5 hover:shadow-lg focus-within:shadow-lg",
                isActive
                  ? "bg-gradient-to-br from-card via-card to-accent/40 border-primary/25 shadow-xl shadow-primary/10 ring-1 ring-primary/15"
                  : "bg-card/80 border-border/70 shadow-sm hover:border-primary/20 hover:bg-card",
              ].join(" ")}
            >
              {/* Subtle shine */}
              <div
                aria-hidden="true"
                className={[
                  "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300",
                  "bg-gradient-to-r from-primary/10 via-transparent to-transparent",
                  isActive ? "opacity-100" : "group-hover:opacity-100",
                ].join(" ")}
              />

              <div
                className={[
                  "relative inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-2xl",
                  "text-primary ring-1 transition-colors flex-shrink-0",
                  isActive
                    ? "bg-primary/12 ring-primary/20"
                    : "bg-accent ring-border/60 group-hover:bg-primary/10 group-hover:ring-primary/20",
                ].join(" ")}
              >
                <Icon className="h-5 w-5 md:h-6 md:w-6" aria-hidden="true" />
              </div>

              <span className="relative font-display font-semibold text-lg md:text-xl text-foreground leading-snug">
                {bullet.title}
              </span>
            </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Differentials;
