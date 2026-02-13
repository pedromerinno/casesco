import * as React from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase/client";

const FinalCTA = () => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const form = e.currentTarget;
    const data = new FormData(form);

    const prospectCompany = String(data.get("company") ?? "").trim();
    const name = String(data.get("name") ?? "").trim();
    const role = String(data.get("role") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const whatsapp = String(data.get("whatsapp") ?? "").trim();
    const contactPreference = String(data.get("contactPreference") ?? "email");

    if (!prospectCompany || !name || !email) {
      toast.error("Preencha Empresa, Nome e E-mail.");
      return;
    }

    if (contactPreference === "whatsapp" && !whatsapp) {
      toast.error("Informe seu WhatsApp para essa preferência.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("leads").insert({
        prospect_company: prospectCompany,
        name,
        role: role || null,
        email,
        whatsapp: whatsapp || null,
        contact_preference: contactPreference,
      });

      if (error) throw error;

      toast.success("Recebido. Vamos te chamar em até 1 dia útil.");
      form.reset();
    } catch (err) {
      // Avoid leaking backend details to the UI.
      toast.error("Não conseguimos enviar agora. Tente novamente em instantes.");
      // eslint-disable-next-line no-console
      console.error("[FinalCTA] lead insert failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contato">
      <div className="px-6 md:px-12 lg:px-20 py-10 md:py-12">
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-accent/30 ring-1 ring-border/70 shadow-sm">
            {/* subtle texture */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.10),transparent_45%),radial-gradient(circle_at_80%_0%,hsl(var(--accent)/0.18),transparent_40%)]"
            />

            <div className="relative px-8 md:px-14 lg:px-20 py-20 md:py-28 lg:py-32 min-h-[32rem] md:min-h-[40rem] lg:min-h-[42rem] flex items-center">
              <div className="mx-auto w-full max-w-5xl text-center">
                <motion.h2
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7 }}
                  className="text-2xl md:text-4xl font-display font-bold tracking-tight leading-[1.05]"
                >
                  Marcas líderes não improvisam.
                  <span className="block">Executam com método.</span>
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="mt-8 md:mt-10 text-base md:text-lg text-foreground/70 leading-relaxed max-w-2xl mx-auto"
                >
                  Converse com a ONMX e tenha um plano completo para comunicar, lançar
                  e evoluir com consistência.
                </motion.p>

                <motion.form
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.18 }}
                  className="mt-12 md:mt-14 mx-auto w-full max-w-5xl"
                  onSubmit={onSubmit}
                >
                  <div className="rounded-3xl bg-background/55 backdrop-blur-sm ring-1 ring-border/70 p-5 md:p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="text-left">
                        <label
                          htmlFor="finalcta-company"
                          className="sr-only"
                        >
                          Empresa
                        </label>
                        <Input
                          id="finalcta-company"
                          aria-label="Empresa"
                          name="company"
                          autoComplete="organization"
                          placeholder="Nome da empresa"
                          required
                          className="h-12 md:h-14 rounded-2xl bg-background/70 ring-1 ring-border/60 focus-visible:ring-ring"
                        />
                      </div>

                      <div className="text-left">
                        <label
                          htmlFor="finalcta-name"
                          className="sr-only"
                        >
                          Nome
                        </label>
                        <Input
                          id="finalcta-name"
                          aria-label="Nome"
                          name="name"
                          autoComplete="name"
                          placeholder="Seu nome"
                          required
                          className="h-12 md:h-14 rounded-2xl bg-background/70 ring-1 ring-border/60 focus-visible:ring-ring"
                        />
                      </div>

                      <div className="text-left">
                        <label
                          htmlFor="finalcta-role"
                          className="sr-only"
                        >
                          Cargo
                        </label>
                        <Input
                          id="finalcta-role"
                          aria-label="Cargo"
                          name="role"
                          autoComplete="organization-title"
                          placeholder="Seu cargo"
                          className="h-12 md:h-14 rounded-2xl bg-background/70 ring-1 ring-border/60 focus-visible:ring-ring"
                        />
                      </div>

                      <div className="text-left">
                        <label
                          htmlFor="finalcta-email"
                          className="sr-only"
                        >
                          E-mail
                        </label>
                        <Input
                          id="finalcta-email"
                          aria-label="E-mail"
                          type="email"
                          name="email"
                          autoComplete="email"
                          inputMode="email"
                          placeholder="voce@empresa.com"
                          required
                          className="h-12 md:h-14 rounded-2xl bg-background/70 ring-1 ring-border/60 focus-visible:ring-ring"
                        />
                      </div>

                      <div className="text-left">
                        <label
                          htmlFor="finalcta-whatsapp"
                          className="sr-only"
                        >
                          WhatsApp
                        </label>
                        <Input
                          id="finalcta-whatsapp"
                          aria-label="WhatsApp"
                          type="tel"
                          name="whatsapp"
                          autoComplete="tel"
                          inputMode="tel"
                          placeholder="(11) 99999-9999"
                          className="h-12 md:h-14 rounded-2xl bg-background/70 ring-1 ring-border/60 focus-visible:ring-ring"
                        />
                      </div>

                      <div className="text-left">
                        <label
                          htmlFor="finalcta-preference"
                          className="sr-only"
                        >
                          Preferência
                        </label>
                        <select
                          id="finalcta-preference"
                          name="contactPreference"
                          defaultValue="email"
                          className="h-12 md:h-14 w-full rounded-2xl bg-background/70 ring-1 ring-border/60 px-4 text-sm text-foreground/85 focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="email">E-mail</option>
                          <option value="whatsapp">WhatsApp</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-5 flex justify-center sm:justify-end">
                      <motion.button
                        type="submit"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.26 }}
                        disabled={isSubmitting}
                        className="h-12 md:h-14 w-full sm:w-auto rounded-2xl bg-primary px-10 font-display text-base font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60 disabled:hover:brightness-100"
                      >
                        {isSubmitting ? "Enviando..." : "Agendar uma conversa"}
                      </motion.button>
                    </div>
                  </div>
                </motion.form>

                <p className="mt-7 md:mt-8 text-sm text-foreground/55">
                  Resposta em até 1 dia útil. Sem spam.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
