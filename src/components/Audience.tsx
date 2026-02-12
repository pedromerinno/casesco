import { motion } from "framer-motion";

const audiences = [
  "Times de marketing corporativo",
  "Empresas em fase de crescimento ou reposicionamento",
  "Marcas com alta exigência visual e estratégica",
  "Projetos que demandam execução rápida e premium",
];

const Audience = () => {
  return (
    <section className="section-padding">
      <div className="max-w-4xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-3xl md:text-5xl font-display font-bold mb-12"
        >
          Feita para empresas que precisam de comunicação{" "}
          <span className="text-gradient">no nível certo.</span>
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {audiences.map((item, i) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex items-start gap-3 p-5 rounded-xl bg-card border border-border"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span className="font-body text-secondary-foreground">{item}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Audience;
