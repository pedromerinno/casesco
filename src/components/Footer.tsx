const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="px-6 md:px-12 lg:px-20 py-16 md:py-20">
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="min-h-[28rem] md:min-h-[34rem] flex flex-col justify-between gap-10">
            <div className="flex-1 flex items-end justify-center overflow-hidden pt-10 md:pt-14 lg:pt-16 pb-6 md:pb-8">
              <h2
                className="w-full font-body font-semibold leading-none tracking-[-0.12em] [font-kerning:none] text-primary-foreground text-center md:text-left"
              >
                <span className="block whitespace-nowrap text-[clamp(6.75rem,22vw,23.5rem)]">
                  ONMX®
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4">
              <p className="text-xs text-primary-foreground/85 text-center md:text-left">
                Part of MNNO® Group
              </p>

              <p className="text-xs text-primary-foreground/85 text-center">
                © {new Date().getFullYear()} ONMX®. Todos os direitos reservados.
              </p>

              <div className="flex justify-center md:justify-end">
                <a
                  href="#contato"
                  className="inline-flex h-10 items-center justify-center rounded-full border border-primary-foreground/25 bg-primary-foreground/5 px-5 text-xs font-medium text-primary-foreground/95 backdrop-blur-sm transition-colors hover:bg-primary-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
                >
                  Fale com nosso time
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
