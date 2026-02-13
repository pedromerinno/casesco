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
      <div className="max-w-7xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-3xl md:text-5xl font-display font-bold mb-12"
        >
          Feita para empresas que precisam de comunicação no nível certo.
        </motion.h2>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-7 text-left">
          {audiences.map((item, i) => (
            <motion.li
              key={item}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className={[
                "group relative overflow-hidden rounded-3xl border border-border/70",
                "bg-gradient-to-br from-card via-card to-accent/35",
                "shadow-sm transition-all duration-300",
                "hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/20",
                "focus-within:-translate-y-0.5 focus-within:shadow-lg focus-within:border-primary/20",
                "aspect-square",
              ].join(" ")}
            >
              {/* subtle shine */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 bg-gradient-to-r from-primary/10 via-transparent to-transparent group-hover:opacity-100"
              />

              <div className="relative h-full p-8 md:p-10 flex flex-col justify-between">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                </span>

                <p className="mt-6 font-body text-base md:text-lg text-foreground/85 leading-relaxed">
                  {item}
                </p>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default Audience;
