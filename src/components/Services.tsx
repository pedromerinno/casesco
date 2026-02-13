import * as React from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Megaphone,
  Palette,
  Target,
  Video,
  Smartphone,
  Monitor,
} from "lucide-react";

const services: Array<{
  title: string;
  displayTitle: [string, string];
  description: string;
  icon: LucideIcon;
  accent: "violet" | "indigo" | "pink";
  media?: {
    src: string;
    alt?: string;
    fit?: "contain" | "cover";
  };
}> = [
  {
    title: "Campanhas institucionais e de produto",
    displayTitle: ["Campanhas institucionais", "e de produto"],
    description:
      "Mensagens claras e criativos consistentes, do conceito ao rollout.",
    icon: Megaphone,
    accent: "violet",
  },
  {
    title: "Estratégia de comunicação e posicionamento",
    displayTitle: ["Estratégia de comunicação", "e posicionamento"],
    description:
      "Clareza de narrativa, arquitetura de mensagens e foco no que move decisão.",
    icon: Target,
    accent: "indigo",
    media: {
      src: "/estrategia-comunic.webp",
      alt: "",
      fit: "cover",
    },
  },
  {
    title: "Direção criativa e design systems",
    displayTitle: ["Direção criativa", "e design systems"],
    description:
      "Um sistema visual forte, escalável e pronto para crescer com o produto.",
    icon: Palette,
    accent: "violet",
  },
  {
    title: "Produção de conteúdo premium",
    displayTitle: ["Produção de conteúdo", "premium"],
    description:
      "Cadência, consistência e formatos que performam sem perder a marca.",
    icon: Smartphone,
    accent: "pink",
    media: {
      src: "/prod-conteudo.gif",
      alt: "",
      fit: "cover",
    },
  },
  {
    title: "Materiais comerciais e apresentações",
    displayTitle: ["Materiais comerciais", "e apresentações"],
    description:
      "Decks e assets de vendas com narrativa, hierarquia e acabamento premium.",
    icon: BarChart3,
    accent: "indigo",
    media: {
      src: "/Maleta_02_Animacao.gif",
      alt: "",
      fit: "cover",
    },
  },
  {
    title: "Projetos 3D e Motion",
    displayTitle: ["Projetos 3D", "e Motion"],
    description:
      "Motion e 3D para elevar percepção, explicar e convencer.",
    icon: Video,
    accent: "violet",
  },
  {
    title: "Produtos digitais",
    displayTitle: ["Produtos", "digitais"],
    description:
      "Design e desenvolvimento de experiências digitais com performance, clareza e acabamento premium.",
    icon: Monitor,
    accent: "indigo",
  },
];

const Services = () => {
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const itemRefs = React.useRef<Array<HTMLElement | null>>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const cardContentRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const m = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!m) return;
    const onChange = () => setReduceMotion(Boolean(m.matches));
    onChange();
    // Safari < 14 fallback uses addListener/removeListener
    // eslint-disable-next-line deprecation/deprecation
    if (m.addEventListener) m.addEventListener("change", onChange);
    // eslint-disable-next-line deprecation/deprecation
    else m.addListener(onChange);
    return () => {
      // eslint-disable-next-line deprecation/deprecation
      if (m.removeEventListener) m.removeEventListener("change", onChange);
      // eslint-disable-next-line deprecation/deprecation
      else m.removeListener(onChange);
    };
  }, []);

  React.useEffect(() => {
    const elements = itemRefs.current.filter(Boolean) as HTMLElement[];
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
        root: null,
        rootMargin: "-45% 0px -45% 0px",
        threshold: [0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (reduceMotion) return;
    if (!cardContentRef.current) return;

    gsap.fromTo(
      cardContentRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" },
    );
  }, [activeIndex, reduceMotion]);

  const active = services[Math.min(activeIndex, services.length - 1)];
  const ActiveIcon = active.icon;

  const accentClass =
    active.accent === "indigo"
      ? "bg-indigo-500/10 text-indigo-600 ring-indigo-500/15"
      : active.accent === "pink"
        ? "bg-pink-500/10 text-pink-600 ring-pink-500/15"
        : "bg-primary/10 text-primary ring-primary/15";

  const descriptionToneClass =
    active.accent === "indigo"
      ? "text-indigo-950/70 dark:text-indigo-50/80"
      : active.accent === "pink"
        ? "text-pink-950/70 dark:text-pink-50/80"
        : "text-primary/85 dark:text-primary-foreground/80";

  return (
    <section id="servicos" className="section-padding scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex w-fit items-center rounded-full bg-primary/10 text-primary font-body text-sm font-medium px-4 py-2 mb-4 mx-auto"
        >
          O que fazemos
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-3xl md:text-5xl font-display font-bold mb-24 md:mb-28 max-w-3xl mx-auto text-center"
        >
          Soluções completas, sem ruído, sem burocracia.
        </motion.h2>

        <div className="grid lg:grid-cols-[1fr_1fr] gap-12 lg:gap-16 items-start">
          {/* Left: scroll narrative */}
          <div className="space-y-20 md:space-y-24">
            {services.map((s, i) => {
              const isActive = i === activeIndex;
              return (
                <div
                  key={s.title}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  data-index={i}
                  className="scroll-mt-24"
                >
                  <div
                    className={
                      isActive
                        ? "transition-opacity duration-300 opacity-100"
                        : "transition-opacity duration-300 opacity-35"
                    }
                  >
                    <div className="flex items-start gap-4">
                      <span className="font-display text-primary/80 tabular-nums text-xl md:text-2xl leading-tight mt-1">
                        {String(i + 1).padStart(2, "0")} –
                      </span>
                      <h3 className="font-display font-semibold text-2xl md:text-3xl tracking-tight">
                        <span className="block leading-tight">{s.displayTitle[0]}</span>
                        <span className="block leading-tight">{s.displayTitle[1]}</span>
                      </h3>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: sticky visual */}
          <div className="lg:sticky lg:top-24 self-start">
            <div
              className={
                "relative mx-auto w-full max-w-[520px] overflow-hidden rounded-[32px] ring-1 " +
                accentClass
              }
            >
              {/* “Image” surface */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-transparent to-transparent opacity-70 pointer-events-none" />
              <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/30 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-28 -left-28 h-80 w-80 rounded-full bg-white/20 blur-3xl pointer-events-none" />

              <div ref={cardContentRef} className="relative w-full p-10 md:p-12">
                <div
                  className={
                    "relative aspect-square w-full overflow-hidden rounded-3xl bg-background/35 ring-1 ring-white/35 " +
                    (active.media ? "" : "grid place-items-center")
                  }
                >
                  {active.media ? (
                    reduceMotion ? (
                      <img
                        src={active.media.src}
                        alt={active.media.alt ?? ""}
                        aria-hidden={active.media.alt ? undefined : "true"}
                        className={
                          "absolute inset-0 h-full w-full pointer-events-none " +
                          (active.media.fit === "cover"
                            ? "object-cover object-center"
                            : "object-contain object-center") +
                          (active.media.fit === "cover" ? "" : " p-8 md:p-10")
                        }
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <motion.img
                        key={active.media.src}
                        src={active.media.src}
                        alt={active.media.alt ?? ""}
                        aria-hidden={active.media.alt ? undefined : "true"}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className={
                          "absolute inset-0 h-full w-full pointer-events-none " +
                          (active.media.fit === "cover"
                            ? "object-cover object-center"
                            : "object-contain object-center") +
                          (active.media.fit === "cover" ? "" : " p-8 md:p-10")
                        }
                        loading="lazy"
                        decoding="async"
                      />
                    )
                  ) : (
                    <ActiveIcon
                      className="h-28 w-28 md:h-36 md:w-36 opacity-25"
                      aria-hidden="true"
                    />
                  )}
                </div>

                <p
                  className={
                    "mt-8 text-sm md:text-base font-semibold leading-relaxed text-center " +
                    descriptionToneClass
                  }
                >
                  {active.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;
