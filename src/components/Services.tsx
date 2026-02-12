import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { BarChart3, Megaphone, Palette, Target, Video, Smartphone } from "lucide-react";

const services: { title: string; icon: LucideIcon }[] = [
  { title: "Campanhas institucionais e de produto", icon: Megaphone },
  { title: "Estratégia de comunicação e posicionamento", icon: Target },
  { title: "Direção criativa e design systems", icon: Palette },
  { title: "Conteúdo e social media premium", icon: Smartphone },
  { title: "Materiais comerciais e apresentações", icon: BarChart3 },
  { title: "Produção audiovisual, motion e 3D", icon: Video },
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
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary ring-1 ring-border/60 transition-colors group-hover:bg-primary/10 group-hover:ring-primary/20">
                <service.icon className="h-5 w-5" aria-hidden="true" />
              </div>
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
