type ClientLogo = {
  name: string;
  src?: string;
  svg?: string;
};

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { OptimizedImage } from "@/components/ui/optimized-image";

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
    .select("id,name,logo_url,logo_svg,created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (
    data?.map((c) => ({
      name: c.name,
      src: c.logo_url ?? undefined,
      svg: c.logo_svg ?? undefined,
    })) ?? []
  );
}

function LogoItem({ client }: { client: ClientLogo }) {
  return (
    <li className="flex items-center justify-center">
      <div className="flex items-center justify-center h-10 md:h-12 px-2 text-primary/80">
        {client.svg ? (
          <span
            className="[&_svg]:h-7 md:[&_svg]:h-8 [&_svg]:w-auto [&_svg]:max-w-[160px] [&_svg_*]:fill-current [&_svg_*]:stroke-current"
            aria-label={client.name}
            dangerouslySetInnerHTML={{ __html: client.svg }}
          />
        ) : client.src ? (
          <OptimizedImage
            src={client.src}
            alt={client.name}
            preset="logo"
            // Assumes logos are mostly monochrome; this tints them to purple.
            className="h-7 md:h-8 w-auto object-contain opacity-90 brightness-0 saturate-[100%] invert-[17%] sepia-[95%] saturate-[6500%] hue-rotate-[265deg] brightness-[0.92] contrast-[1.06]"
          />
        ) : (
          <span className="font-display text-sm font-medium tracking-wide whitespace-nowrap text-primary/80">
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
  const trackClients = React.useMemo(() => {
    if (clients.length === 0) return [];

    // Repeat enough times so the marquee never “runs out” on wide screens.
    const minItems = 36;
    const repeats = Math.max(4, Math.ceil(minItems / clients.length));
    return Array.from({ length: repeats }, () => clients).flat();
  }, [clients]);

  return (
    <section aria-label="Clientes" className="bg-[#f3eaf5] overflow-x-hidden">
      <div className="relative w-full px-6 md:px-12 lg:px-20 py-8 md:py-10">
        <h2 className="sr-only">Clientes</h2>

        <div className="relative overflow-hidden rounded-2xl bg-[#f3eaf5]">
          {/* Edge fade */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#f3eaf5] to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#f3eaf5] to-transparent z-10" />

          <div className="group relative flex items-center py-6">
            {isLoading && (
              <div className="absolute inset-0 grid place-items-center">
                <span className="text-primary/70 font-body text-sm">
                  Carregando clientes…
                </span>
              </div>
            )}

            <div className="marquee flex w-max items-center gap-24 md:gap-28 [--marquee-duration:110s] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none">
              <ul className="flex items-center gap-24 md:gap-28">
                {trackClients.map((client, idx) => (
                  <LogoItem key={`${client.name}-${idx}`} client={client} />
                ))}
              </ul>

              {/* Duplicate for seamless loop */}
              <ul className="flex items-center gap-24 md:gap-28" aria-hidden="true">
                {trackClients.map((client, idx) => (
                  <LogoItem key={`${client.name}-${idx}-dup`} client={client} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

