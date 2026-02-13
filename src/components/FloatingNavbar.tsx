import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Globe } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: "Início", href: "#inicio" },
  { label: "Serviços", href: "#servicos" },
  { label: "Como funciona", href: "#metodo" },
  { label: "Cases", href: "#cases" },
];

export default function FloatingNavbar() {
  const [isVisible, setIsVisible] = React.useState(false);
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    const threshold = 56;

    const onScroll = () => {
      setIsVisible(window.scrollY >= threshold);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible ? (
        reduceMotion ? (
          <div
            key="floating-nav"
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[min(980px,calc(100%_-_2.5rem))]"
          >
            <div className="flex items-center justify-between gap-4 rounded-full border border-black/10 bg-white/80 px-4 py-3 shadow-[0_14px_50px_rgba(0,0,0,0.14)] backdrop-blur-md md:px-5">
              <a
                href="#inicio"
                className="flex items-center gap-2 rounded-full px-2 py-1 font-display text-[15px] font-semibold tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Ir para o início"
              >
                ONMX
              </a>

              <nav aria-label="Navegação principal" className="hidden md:block">
                <ul className="flex items-center gap-6">
                  {navItems.map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        className="rounded-full px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/60 text-muted-foreground transition-colors hover:bg-white hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Mudar idioma"
                >
                  <Globe className="h-4 w-4" aria-hidden="true" />
                </button>

                <a
                  href="#contato"
                  className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Falar com a ONMX
                </a>
              </div>
            </div>
          </div>
        ) : (
          <motion.div
            key="floating-nav"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{ x: "-50%" }}
            className="fixed top-4 left-1/2 z-50 w-[min(980px,calc(100%_-_2.5rem))]"
          >
            <div className="flex items-center justify-between gap-4 rounded-full border border-black/10 bg-white/80 px-4 py-3 shadow-[0_14px_50px_rgba(0,0,0,0.14)] backdrop-blur-md md:px-5">
              <a
                href="#inicio"
                className="flex items-center gap-2 rounded-full px-2 py-1 font-display text-[15px] font-semibold tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Ir para o início"
              >
                ONMX
              </a>

              <nav aria-label="Navegação principal" className="hidden md:block">
                <ul className="flex items-center gap-6">
                  {navItems.map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        className="rounded-full px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/60 text-muted-foreground transition-colors hover:bg-white hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Mudar idioma"
                >
                  <Globe className="h-4 w-4" aria-hidden="true" />
                </button>

                <a
                  href="#contato"
                  className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Falar com a ONMX
                </a>
              </div>
            </div>
          </motion.div>
        )
      ) : null}
    </AnimatePresence>
  );
}

