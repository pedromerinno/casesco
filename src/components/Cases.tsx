import { motion } from "framer-motion";

const sectors = [
  "Agronegócio",
  "Indústria",
  "Saúde",
  "Inovação",
  "Marcas Globais",
];

const Cases = () => {
  return (
    <section className="section-padding border-t border-border">
      <div className="max-w-6xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-primary font-display text-sm tracking-[0.3em] uppercase mb-4"
        >
          Cases & Experiências
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-3xl md:text-5xl font-display font-bold mb-12"
        >
          Projetos que falam por si.
        </motion.h2>

        <div className="flex flex-wrap gap-3 mb-10">
          {sectors.map((sector, i) => (
            <motion.span
              key={sector}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="px-6 py-3 rounded-full border border-border bg-card font-display font-medium text-sm text-foreground hover:border-primary/40 hover:text-primary transition-all cursor-default"
            >
              {sector}
            </motion.span>
          ))}
        </div>

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
