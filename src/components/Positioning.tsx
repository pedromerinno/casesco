import { motion } from "framer-motion";

const Positioning = () => {
  return (
    <section className="section-padding border-t border-border">
      <div className="max-w-4xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-3xl md:text-5xl font-display font-bold mb-6"
        >
          ONMX é onde campanhas viram{" "}
          <span className="text-gradient">movimento.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg text-secondary-foreground leading-relaxed max-w-2xl mx-auto"
        >
          Uma agência construída para operar no ritmo de empresas modernas, unindo
          branding, comunicação e produção em um fluxo integrado.
        </motion.p>
      </div>
    </section>
  );
};

export default Positioning;
