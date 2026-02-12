import { motion } from "framer-motion";

const services = [
  { title: "Campanhas institucionais e de produto", icon: "📣" },
  { title: "Estratégia de comunicação e posicionamento", icon: "🎯" },
  { title: "Direção criativa e design systems", icon: "✦" },
  { title: "Conteúdo e social media premium", icon: "📱" },
  { title: "Materiais comerciais e apresentações", icon: "📊" },
  { title: "Produção audiovisual, motion e 3D", icon: "🎬" },
];

const Services = () => {
  return (
    <section className="section-padding">
      <div className="max-w-6xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-primary font-display text-sm tracking-[0.3em] uppercase mb-4"
        >
          O que fazemos
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-3xl md:text-5xl font-display font-bold mb-16 max-w-xl"
        >
          Soluções completas, sem ruído, sem burocracia.
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group p-6 md:p-8 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300"
            >
              <span className="text-2xl mb-4 block">{service.icon}</span>
              <h3 className="font-display font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                {service.title}
              </h3>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
