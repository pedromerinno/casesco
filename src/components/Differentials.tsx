import { motion } from "framer-motion";

const bullets = [
  "Time senior e operação ágil",
  "Design e narrativa no centro",
  "Estrutura escalável para demandas recorrentes",
  "Integração com branding e VFX quando necessário",
];

const Differentials = () => {
  return (
    <section className="section-padding border-t border-border">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-primary font-display text-sm tracking-[0.3em] uppercase mb-4"
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
            Full-service{" "}
            <span className="text-gradient">de verdade.</span>
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

        <div className="space-y-4">
          {bullets.map((bullet, i) => (
            <motion.div
              key={bullet}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex items-center gap-4 p-5 rounded-xl bg-card border border-border"
            >
              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              <span className="font-display font-medium text-foreground">{bullet}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Differentials;
