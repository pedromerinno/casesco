import { motion } from "framer-motion";

const steps = [
  { num: "01", title: "Diagnóstico e contexto" },
  { num: "02", title: "Estratégia e conceito criativo" },
  { num: "03", title: "Desenvolvimento e produção" },
  { num: "04", title: "Execução multicanal" },
  { num: "05", title: "Otimização e evolução contínua" },
];

const Method = () => {
  return (
    <section className="section-padding">
      <div className="max-w-6xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-primary font-display text-sm tracking-[0.3em] uppercase mb-4"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative min-h-40 p-7 md:p-8 rounded-2xl bg-card border border-border group hover:border-primary/30 transition-colors"
            >
              <span className="text-3xl font-display font-bold text-primary/30 group-hover:text-primary/60 transition-colors">
                {step.num}
              </span>
              <h3 className="mt-3 font-display font-semibold text-foreground text-sm">
                {step.title}
              </h3>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Method;
