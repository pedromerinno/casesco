import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt=""
          className="w-full h-full object-cover opacity-25 dark:opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/92 to-background dark:from-background/60 dark:via-background/80" />
      </div>

      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 md:px-12 lg:px-20 py-6">
        <span className="font-display text-2xl font-bold tracking-tight text-primary">ONMX</span>
        <a
          href="#contato"
          className="hidden md:inline-flex items-center gap-2 px-6 py-2.5 border border-primary/30 rounded-full text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          Falar com a ONMX
        </a>
      </nav>

      {/* Content */}
      <div className="relative z-10 section-padding max-w-5xl pt-32">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center rounded-full bg-primary/10 text-primary font-body text-sm font-medium px-4 py-2 mb-6"
        >
          Full-service creative agency
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="text-4xl md:text-6xl lg:text-7xl font-display font-bold leading-[1.05] mb-8 max-w-4xl"
        >
          Agência full-service para marcas que precisam crescer{" "}
          <span className="text-gradient">com impacto.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="text-lg md:text-xl text-secondary-foreground max-w-2xl mb-10 leading-relaxed"
        >
          Estratégia, criatividade e execução em um único time, com entrega premium
          para empresas que não podem errar na comunicação.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <a
            href="#contato"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-display font-semibold rounded-full hover:brightness-110 transition-all"
          >
            Falar com a ONMX
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-12 text-sm text-muted-foreground max-w-lg"
        >
          Trabalhamos com marcas que exigem velocidade, consistência e performance.
        </motion.p>
      </div>
    </section>
  );
};

export default Hero;
