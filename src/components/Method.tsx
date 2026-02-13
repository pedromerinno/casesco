import { motion } from "framer-motion";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Pause, Play } from "lucide-react";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const steps = [
  { num: "01", title: "Diagnóstico e contexto" },
  { num: "02", title: "Estratégia e conceito criativo" },
  { num: "03", title: "Desenvolvimento e produção" },
  { num: "04", title: "Execução multicanal" },
  { num: "05", title: "Otimização e evolução contínua" },
];

const Method = () => {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);
  const [isHoverPaused, setIsHoverPaused] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const prefersReducedMotion = React.useMemo(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  React.useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  React.useEffect(() => {
    if (!api || !isPlaying || isHoverPaused || prefersReducedMotion) return;

    const intervalId = window.setInterval(() => {
      api.scrollNext();
    }, 5200);

    return () => window.clearInterval(intervalId);
  }, [api, isPlaying, isHoverPaused, prefersReducedMotion]);

  return (
    <section id="metodo" className="section-padding scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="inline-flex items-center rounded-full bg-primary/10 text-primary font-body text-sm font-medium px-4 py-2 mb-4"
        >
          Como trabalhamos
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-3xl md:text-5xl font-display font-bold mb-16"
        >
          Processo claro. Entrega previsível.
        </motion.h2>
      </div>

      {/* Full-width carousel */}
      <div
        className="mt-10 -mx-6 md:-mx-12 lg:-mx-20 overflow-x-hidden"
        onMouseEnter={() => setIsHoverPaused(true)}
        onMouseLeave={() => setIsHoverPaused(false)}
        onFocusCapture={() => setIsHoverPaused(true)}
        onBlurCapture={() => setIsHoverPaused(false)}
      >
        <Carousel
          setApi={setApi}
          opts={{ align: "center", loop: true, containScroll: "trimSnaps" }}
          className="relative"
        >
          <CarouselContent className="-ml-4">
            {steps.map((step, i) => (
              <CarouselItem
                key={step.num}
                aria-label={`${step.num} — ${step.title}`}
                className="pl-4 w-full max-w-4xl basis-[92%] sm:basis-[78%] lg:basis-[62%]"
              >
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.05 }}
                  className="h-full w-full min-h-[26rem] md:min-h-[32rem] rounded-3xl bg-gradient-to-br from-card to-accent/40 ring-1 ring-border/70 shadow-sm p-12 md:p-14"
                >
                  <div className="inline-flex items-center rounded-full bg-primary/10 text-primary font-body text-sm font-medium px-4 py-2">
                    {step.num}
                  </div>
                  <h3 className="mt-6 font-display font-semibold text-foreground text-sm">
                    {step.title}
                  </h3>
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>

          <CarouselPrevious className="left-3 top-1/2 -translate-y-1/2 md:left-4 bg-background/80 backdrop-blur border-border/70 hover:bg-background" />
          <CarouselNext className="right-3 top-1/2 -translate-y-1/2 md:right-4 bg-background/80 backdrop-blur border-border/70 hover:bg-background" />
        </Carousel>

        {count > 1 && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-muted/70 px-4 py-3 backdrop-blur-sm ring-1 ring-border/60">
              {Array.from({ length: count }).map((_, index) => {
                const isActive = index === current;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => api?.scrollTo(index)}
                    className={cn(
                      "h-2.5 rounded-full transition-all",
                      isActive
                        ? "w-10 bg-foreground/55"
                        : "w-2.5 bg-foreground/25 hover:bg-foreground/35",
                    )}
                    aria-label={`Ir para o passo ${index + 1}`}
                    aria-current={isActive ? "true" : undefined}
                  />
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsPlaying((v) => !v)}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted/70 backdrop-blur-sm ring-1 ring-border/60 text-foreground/70 transition-colors hover:bg-muted"
              aria-label={isPlaying ? "Pausar carrossel" : "Reproduzir carrossel"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default Method;
