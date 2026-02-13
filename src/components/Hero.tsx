import { motion } from "framer-motion";
import { OptimizedImage } from "@/components/ui/optimized-image";

const Hero = () => {
  return (
    <section id="inicio" className="relative min-h-screen flex items-end overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <OptimizedImage
          src="/BG_onmx_02.jpg"
          alt=""
          preset="hero"
          priority
          widths={[960, 1440, 1920]}
          sizes="100vw"
          className="w-full h-full object-cover opacity-100"
        />
        {/* Dark overlay for legibility with white text (keep it subtle). */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/55" />
      </div>

      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 md:px-12 lg:px-20 py-6">
        <span className="font-display text-2xl font-bold tracking-tight text-white">ONMX</span>
        <a
          href="#contato"
          className="hidden md:inline-flex items-center gap-2 px-6 py-2.5 border border-white/25 rounded-full text-sm font-medium text-white hover:bg-white/10 transition-colors"
        >
          Falar com a ONMX
        </a>
      </nav>

      {/* Content */}
      <div className="relative z-10 w-full px-6 md:px-12 lg:px-20 pt-28 md:pt-32 pb-14 md:pb-16 text-white">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="text-4xl md:text-5xl lg:text-6xl font-display font-semibold leading-[1.05] mb-8 max-w-4xl"
        >
          Agência full-service para marcas que precisam crescer com impacto.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="text-lg md:text-xl text-white/85 max-w-2xl leading-relaxed"
        >
          Estratégia, criatividade e execução em um único time, com entrega premium e consistência.
        </motion.p>
      </div>
    </section>
  );
};

export default Hero;
