type ClientLogo = {
  name: string;
  src?: string;
};

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

const fallbackClients: ClientLogo[] = [
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

async function getClientsForMarquee(): Promise<ClientLogo[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id,name,logo_url,created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (
    data?.map((c) => ({
      name: c.name,
      src: c.logo_url ?? undefined,
    })) ?? []
  );
}

function LogoItem({ client }: { client: ClientLogo }) {
  return (
    <li className="flex items-center justify-center">
      <div className="flex items-center justify-center h-12 px-6 rounded-full bg-primary-foreground/10 border border-primary-foreground/15 text-primary-foreground/90 backdrop-blur-sm">
        {client.src ? (
          <img
            src={client.src}
            alt={client.name}
            className="h-5 w-auto opacity-95 brightness-0 invert"
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
  const { data, isLoading } = useQuery({
    queryKey: ["clients", "marquee"],
    queryFn: getClientsForMarquee,
    staleTime: 5 * 60 * 1000,
  });

  const clients = (data && data.length > 0 ? data : fallbackClients).slice(0, 14);

  return (
    <section aria-label="Clientes" className="bg-primary overflow-x-hidden">
      <div className="relative w-full px-6 md:px-12 lg:px-20 py-8 md:py-10">
        <h2 className="sr-only">Clientes</h2>

        <div className="relative overflow-hidden rounded-2xl bg-primary/90">
          {/* Edge fade */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-primary/95 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-primary/95 to-transparent z-10" />

          <div className="group flex items-center">
            <div className="marquee flex w-max items-center gap-10 py-6 pr-10 [--marquee-duration:42s] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none">
              <ul className="flex items-center gap-10">
                {isLoading && (
                  <li className="text-primary-foreground/70 font-body text-sm">
                    Carregando clientes…
                  </li>
                )}
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

