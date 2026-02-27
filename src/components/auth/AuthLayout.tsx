import * as React from "react";
import { cn } from "@/lib/utils";

const DEFAULT_BG_IMAGE = "/IMG_001.jpeg";

type AuthLayoutProps = {
  children: React.ReactNode;
  /** Conteúdo no canto superior direito do painel do formulário (ex: botão "Solicitar conta") */
  topRight?: React.ReactNode;
  /** URL da imagem de fundo do painel de marca. Fallback: fundo slate-900 só */
  backgroundImage?: string | null;
  /** Linha principal do copy de marca */
  brandCopyMain?: string;
  /** Linha secundária do copy de marca */
  brandCopySecondary?: string;
  /** Logo: texto ou nó (ex: "MNNO" + badge "FIN") */
  logo?: React.ReactNode;
  className?: string;
};

export function AuthLayout({
  children,
  topRight,
  backgroundImage = DEFAULT_BG_IMAGE,
  brandCopyMain = "Construindo um futuro melhor e mais bonito.",
  brandCopySecondary = "De forma justa, organizada e coerente.",
  logo,
  className,
}: AuthLayoutProps) {
  const bgUrl = backgroundImage ?? undefined;
  const hasImage = Boolean(bgUrl);

  return (
    <div
      className={cn("flex min-h-screen w-full flex-col bg-white lg:flex-row", className)}
      role="main"
    >
      {/* Painel esquerdo (2/5) — oculto em mobile */}
      <div
        className={cn(
          "hidden lg:flex lg:w-2/5 flex-col justify-between bg-slate-900 relative overflow-hidden",
        )}
      >
        {hasImage && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-no-repeat bg-center"
              style={{
                backgroundImage: `url(${bgUrl})`,
                backgroundPosition: "65% center",
              }}
              aria-hidden
            />
            <div className="absolute inset-0 bg-black/25" aria-hidden />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent"
              aria-hidden
            />
          </>
        )}
        <div className="relative z-10 p-8 lg:p-10">
          <div className="flex items-center gap-2">
            {logo ?? (
              <>
                <span className="text-2xl font-semibold tracking-tight text-white">
                  MNNO
                </span>
                <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-slate-700 backdrop-blur-sm">
                  FIN
                </span>
              </>
            )}
          </div>
        </div>
        <div className="relative z-10 p-8 lg:p-10">
          <p className="text-white drop-shadow-sm text-lg leading-snug">
            {brandCopyMain}
          </p>
          <p className="mt-2 text-white/95 text-sm drop-shadow-sm">
            {brandCopySecondary}
          </p>
        </div>
      </div>

      {/* Painel direito (3/5) — formulário */}
      <div className="relative flex flex-1 flex-col lg:w-3/5">
        {topRight && (
          <div className="absolute top-6 right-6 z-10 lg:top-8 lg:right-10">
            {topRight}
          </div>
        )}
        <div className="flex flex-1 flex-col items-center justify-center p-8 lg:p-10">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
