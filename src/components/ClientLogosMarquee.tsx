type ClientLogo = {
  name: string;
  src?: string;
};

const clients: ClientLogo[] = [
  // Troque pelos seus clientes reais (ideal: SVG/PNG monocromático).
  { name: "Cliente One" },
  { name: "Cliente Two" },
  { name: "Cliente Three" },
  { name: "Cliente Four" },
  { name: "Cliente Five" },
  { name: "Cliente Six" },
  { name: "Cliente Seven" },
  { name: "Cliente Eight" },
];

function LogoItem({ client }: { client: ClientLogo }) {
  return (
    <li className="flex items-center justify-center">
      <div className="flex items-center justify-center h-12 px-6 rounded-full bg-primary-foreground/10 border border-primary-foreground/15 text-primary-foreground/90 backdrop-blur-sm">
        {client.src ? (
          <img
            src={client.src}
            alt={client.name}
            className="h-5 w-auto opacity-90"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="font-display text-sm font-semibold tracking-wide whitespace-nowrap">
            {client.name}
          </span>
        )}
      </div>
    </li>
  );
}

export default function ClientLogosMarquee() {
  return (
    <section aria-label="Clientes" className="bg-primary">
      <div className="relative mx-auto max-w-6xl px-6 md:px-12 lg:px-20 py-8 md:py-10">
        <h2 className="sr-only">Clientes</h2>

        <div className="relative overflow-hidden rounded-2xl bg-primary/90 border border-primary-foreground/10">
          {/* Edge fade */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-primary/95 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-primary/95 to-transparent z-10" />

          <div className="group flex items-center">
            <div className="marquee flex w-max items-center gap-10 py-6 pr-10 [--marquee-duration:42s] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none">
              <ul className="flex items-center gap-10">
                {clients.map((client) => (
                  <LogoItem key={client.name} client={client} />
                ))}
              </ul>

              {/* Duplicate for seamless loop */}
              <ul className="flex items-center gap-10" aria-hidden="true">
                {clients.map((client) => (
                  <LogoItem key={`${client.name}-dup`} client={client} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

