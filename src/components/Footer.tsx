const Footer = () => {
  return (
    <footer className="px-6 md:px-12 lg:px-20 py-10 border-t border-border">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <span className="font-display text-xl font-bold text-primary">ONMX</span>
          <p className="text-sm text-muted-foreground mt-1">
            Parte do ecossistema MERINNO Creative Group
          </p>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-primary transition-colors">Instagram</a>
          <a href="#" className="hover:text-primary transition-colors">Contato</a>
          <a href="#" className="hover:text-primary transition-colors">Apresentação</a>
        </div>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} ONMX. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
