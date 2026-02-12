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
    const elements = itemRefs.current.filter(Boolean) as HTMLDivElement[];
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .map((e) => ({
            index: Number((e.target as HTMLElement).dataset.index),
            ratio: e.intersectionRatio,
          }))
          .sort((a, b) => b.ratio - a.ratio);

        if (visible[0]?.index != null) setActiveIndex(visible[0].index);
      },
      {
        // Central band to mimic “current” as you scroll
        root: null,
        rootMargin: "-40% 0px -40% 0px",
        threshold: [0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="section-padding border-t border-border">
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

        <div className="space-y-7">
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
              animate={{ opacity: isActive ? 1 : 0.4 }}
              className="group flex items-center gap-4 min-h-32 md:min-h-40 p-9 md:p-10 rounded-2xl bg-card border border-border transition-opacity hover:opacity-100"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary ring-1 ring-border/60 transition-colors group-hover:bg-primary/10 group-hover:ring-primary/20 flex-shrink-0">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="font-display font-medium text-foreground">{bullet.title}</span>
            </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Differentials;
