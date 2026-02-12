import { motion } from "framer-motion";

const FinalCTA = () => {
  return (
    <section id="contato" className="section-padding border-t border-border">
      <div className="max-w-3xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-3xl md:text-5xl font-display font-bold mb-6"
        >
          Vamos construir o próximo passo{" "}
          <span className="text-gradient">da sua marca.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-lg text-secondary-foreground leading-relaxed mb-10 max-w-xl mx-auto"
        >
          Se você busca uma agência que pensa como parceiro estratégico e entrega
          como operação de elite, a ONMX é o time certo.
        </motion.p>
        <motion.a
          href="#contato"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="inline-flex items-center gap-2 px-10 py-4 bg-primary text-primary-foreground font-display font-semibold rounded-full hover:brightness-110 transition-all text-lg"
        >
          👉 Agendar uma conversa
        </motion.a>
      </div>
    </section>
  );
};

export default FinalCTA;
