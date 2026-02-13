import * as React from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";

const FinalCTA = () => {
  return (
    <section id="contato">
      <div className="px-6 md:px-12 lg:px-20 py-10 md:py-12">
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="rounded-3xl bg-gradient-to-br from-card to-accent/40 ring-1 ring-border/70 shadow-sm px-8 md:px-14 lg:px-20 py-16 md:py-24 min-h-[28rem] md:min-h-[32rem] flex items-center">
            <div className="max-w-3xl mx-auto text-center">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="text-3xl md:text-5xl font-display font-bold mb-6"
              >
                Pronto para organizar a execução de verdade?
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="text-lg text-secondary-foreground leading-relaxed mb-10 max-w-xl mx-auto"
              >
                Marque uma conversa com a ONMX® e saia com um plano claro,
                priorizado e viável.
              </motion.p>

              <form
                className="mx-auto w-full max-w-3xl"
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
                  <Input
                    aria-label="Nome"
                    name="name"
                    autoComplete="name"
                    placeholder="Seu nome"
                    className="h-12 md:h-14 rounded-2xl bg-background/70 ring-1 ring-border/60 focus-visible:ring-ring"
                  />
                  <Input
                    aria-label="E-mail"
                    type="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="voce@empresa.com"
                    className="h-12 md:h-14 rounded-2xl bg-background/70 ring-1 ring-border/60 focus-visible:ring-ring"
                  />
                  <motion.button
                    type="submit"
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="h-12 md:h-14 w-full sm:w-auto rounded-2xl bg-primary px-8 font-display text-base font-semibold text-primary-foreground transition-all hover:brightness-110"
                  >
                    Agendar uma conversa
                  </motion.button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
