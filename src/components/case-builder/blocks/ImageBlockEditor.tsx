import * as React from "react";
import { Equal, ImageIcon, SlidersHorizontal } from "lucide-react";

import { Input } from "@/components/ui/input";
import MediaLibraryDialog from "@/components/case-builder/MediaLibraryDialog";
import type {
  ImageAspect,
  ImageBorderStyle,
  ImageContent,
  ImagePadding,
  ImageWidthMode,
} from "@/lib/case-builder/types";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { cn } from "@/lib/utils";

type Props = {
  caseId: string;
  content: ImageContent;
  onChange: (content: ImageContent) => void;
};

const ASPECT_OPTIONS: Array<{ value: ImageAspect; label: string }> = [
  { value: "auto", label: "Original" },
  { value: "1/1", label: "Quadrado" },
  { value: "16/9", label: "16:9" },
  { value: "9/16", label: "9:16" },
];

const WIDTH_OPTIONS: Array<{ value: ImageWidthMode; label: string }> = [
  { value: "fill", label: "Preencher" },
  { value: "fit", label: "Ajustar" },
];

function clampPadding(p: Partial<ImagePadding> | undefined): ImagePadding {
  const top = Math.max(0, Math.min(240, Number(p?.top ?? 0)));
  const bottom = Math.max(0, Math.min(240, Number(p?.bottom ?? 0)));
  const left = Math.max(0, Math.min(240, Number(p?.left ?? 0)));
  const right = Math.max(0, Math.min(240, Number(p?.right ?? 0)));
  return { top, bottom, left, right };
}

function normalizeHex(v: string): string | null {
  const raw = v.trim();
  if (!raw) return null;
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const r = withHash[1];
    const g = withHash[2];
    const b = withHash[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

function PropertyRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-[80px_1fr_70px] items-center gap-3">
      <div className="text-[12px] text-black/60">{label}</div>
      <input
        type="range"
        min={0}
        max={120}
        step={4}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
        aria-label={`${label} (px)`}
      />
      <div className="relative">
        <input
          type="number"
          min={0}
          max={240}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value || 0))}
          className="w-full h-8 rounded-lg border border-border bg-white px-2 pr-7 text-[12px] tabular-nums"
          aria-label={`${label} (px)`}
        />
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-black/40">
          px
        </div>
      </div>
    </div>
  );
}

function Segment({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-xl bg-[#fbfbf9] ring-1 ring-black/5 p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors",
              active
                ? "bg-white text-black ring-1 ring-black/5"
                : "text-black/50 hover:bg-black/[0.03]",
            )}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

type PaddingMode = "equal" | "separate";

export default function ImageBlockEditor({ caseId, content, onChange }: Props) {
  const [libOpen, setLibOpen] = React.useState(false);
  const padding = clampPadding(content.padding);
  const allEqual =
    padding.top === padding.bottom &&
    padding.bottom === padding.left &&
    padding.left === padding.right;
  const [paddingMode, setPaddingMode] = React.useState<PaddingMode>(() =>
    allEqual ? "equal" : "separate",
  );

  const previewSrc = content.url?.trim?.() ? content.url : "/image-fallback.svg";

  const aspect: ImageAspect = content.aspect ?? "auto";
  const widthDesktop: ImageWidthMode = content.widthDesktop ?? "fill";
  const widthMobile: ImageWidthMode = content.widthMobile ?? "fill";
  const borderStyle: ImageBorderStyle = content.borderStyle ?? "none";
  const radius = Math.max(0, Math.min(48, Number(content.radius ?? 0)));
  const paddingValue = padding.top;
  const setPaddingAll = (v: number) => {
    const clamped = Math.max(0, Math.min(240, v));
    onChange({
      ...content,
      padding: { top: clamped, bottom: clamped, left: clamped, right: clamped },
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-black/70">Imagem</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-12 w-16 rounded-xl overflow-hidden ring-1 ring-black/10 bg-black/[0.02]">
            <OptimizedImage
              src={previewSrc}
              alt={content.alt || ""}
              preset="thumb"
              widths={[320, 640]}
              sizes="128px"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Link */}
      <div className="space-y-2">
        <div className="text-[12px] font-medium text-black/70">Link</div>
        <div className="flex items-center gap-2">
          <Input
            value={content.url}
            onChange={(e) => onChange({ ...content, url: e.target.value })}
            placeholder="Colar um link ou pesquisar"
            className="h-10"
          />
          <button
            type="button"
            onClick={() => setLibOpen(true)}
            className="h-10 w-10 rounded-xl border border-border bg-white grid place-items-center text-black/60 hover:bg-black/[0.03]"
            aria-label="Abrir biblioteca"
            title="Biblioteca"
          >
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Tamanho */}
      <div className="space-y-2">
        <div className="text-[12px] font-medium text-black/70">Tamanho</div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[12px] text-black/60">Proporção</div>
            <select
              value={aspect}
              onChange={(e) => onChange({ ...content, aspect: e.target.value as ImageAspect })}
              className="h-9 rounded-xl border border-border bg-white px-3 text-[12px] font-medium"
              aria-label="Proporção"
            >
              {ASPECT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-[12px] text-black/60">Largura no desktop</div>
            <select
              value={widthDesktop}
              onChange={(e) =>
                onChange({ ...content, widthDesktop: e.target.value as ImageWidthMode })
              }
              className="h-9 rounded-xl border border-border bg-white px-3 text-[12px] font-medium"
              aria-label="Largura no desktop"
            >
              {WIDTH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-[12px] text-black/60">Largura no celular</div>
            <select
              value={widthMobile}
              onChange={(e) =>
                onChange({ ...content, widthMobile: e.target.value as ImageWidthMode })
              }
              className="h-9 rounded-xl border border-border bg-white px-3 text-[12px] font-medium"
              aria-label="Largura no celular"
            >
              {WIDTH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Zoom no hover */}
      <div className="space-y-2">
        <div className="text-[12px] font-medium text-black/70">Zoom</div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-[12px] text-black/60">Efeito ao passar o mouse</div>
          <select
            value={content.zoom ?? 0}
            onChange={(e) =>
              onChange({ ...content, zoom: Number(e.target.value) })
            }
            className="h-9 rounded-xl border border-border bg-white px-3 text-[12px] font-medium"
            aria-label="Zoom ao passar o mouse"
          >
            <option value={0}>Desligado</option>
            <option value={5}>5%</option>
            <option value={10}>10%</option>
            <option value={15}>15%</option>
            <option value={20}>20%</option>
          </select>
        </div>
      </div>

      {/* Bordas */}
      <div className="space-y-2">
        <div className="text-[12px] font-medium text-black/70">Bordas</div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[12px] text-black/60">Estilo</div>
            <Segment
              value={borderStyle}
              options={[
                { value: "none", label: "Nenhum" },
                { value: "solid", label: "Sólido" },
              ]}
              onChange={(v) => onChange({ ...content, borderStyle: v as ImageBorderStyle })}
            />
          </div>

          {borderStyle === "solid" ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="text-[12px] text-black/60">Cor da borda</div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={
                      content.borderColor && /^#[0-9a-fA-F]{6}$/i.test(content.borderColor)
                        ? content.borderColor
                        : "#000000"
                    }
                    onChange={(e) => {
                      const hex = normalizeHex(e.target.value);
                      if (hex) onChange({ ...content, borderColor: hex });
                    }}
                    className="h-9 w-10 rounded-lg border border-border bg-white p-1 cursor-pointer"
                    aria-label="Selecionar cor da borda"
                  />
                  <input
                    type="text"
                    value={content.borderColor ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (!raw.trim()) {
                        onChange({ ...content, borderColor: "" });
                        return;
                      }
                      const hex = normalizeHex(raw);
                      if (hex) onChange({ ...content, borderColor: hex });
                    }}
                    placeholder="#000000"
                    className="h-9 w-[100px] rounded-lg border border-border bg-white px-2 text-[12px] font-medium tabular-nums"
                    aria-label="Cor da borda (hex)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[80px_1fr_70px] items-center gap-3">
                <div className="text-[12px] text-black/60">Espessura</div>
                <input
                  type="range"
                  min={1}
                  max={12}
                  step={1}
                  value={Math.max(1, Math.min(12, Number(content.borderWidth ?? 2)))}
                  onChange={(e) =>
                    onChange({ ...content, borderWidth: Number(e.target.value) })
                  }
                  className="w-full accent-primary"
                  aria-label="Espessura da borda (px)"
                />
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={Math.max(1, Math.min(24, Number(content.borderWidth ?? 2)))}
                    onChange={(e) =>
                      onChange({
                        ...content,
                        borderWidth: Math.max(1, Math.min(24, Number(e.target.value || 2))),
                      })
                    }
                    className="w-full h-8 rounded-lg border border-border bg-white px-2 pr-7 text-[12px] tabular-nums"
                    aria-label="Espessura (px)"
                  />
                  <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-black/40">
                    px
                  </div>
                </div>
              </div>
            </>
          ) : null}

          <div className="grid grid-cols-[100px_1fr_70px] items-center gap-3">
            <div className="text-[12px] text-black/60">Raio do canto</div>
            <input
              type="range"
              min={0}
              max={48}
              step={1}
              value={radius}
              onChange={(e) => onChange({ ...content, radius: Number(e.target.value) })}
              className="w-full accent-primary"
              aria-label="Raio do canto (px)"
            />
            <div className="relative">
              <input
                type="number"
                min={0}
                max={80}
                value={radius}
                onChange={(e) => onChange({ ...content, radius: Number(e.target.value || 0) })}
                className="w-full h-8 rounded-lg border border-border bg-white px-2 pr-7 text-[12px] tabular-nums"
                aria-label="Raio do canto (px)"
              />
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-black/40">
                px
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preenchimento */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[12px] font-medium text-black/70">Preenchimento</div>
          <div className="inline-flex items-center rounded-xl bg-[#fbfbf9] ring-1 ring-black/5 p-1">
            <button
              type="button"
              onClick={() => setPaddingMode("equal")}
              className={cn(
                "h-9 w-9 rounded-lg grid place-items-center transition-colors",
                paddingMode === "equal"
                  ? "bg-white text-black ring-1 ring-black/5"
                  : "text-black/50 hover:bg-black/[0.03]",
              )}
              aria-pressed={paddingMode === "equal"}
              aria-label="Todos iguais"
              title="Todos iguais"
            >
              <Equal className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setPaddingMode("separate")}
              className={cn(
                "h-9 w-9 rounded-lg grid place-items-center transition-colors",
                paddingMode === "separate"
                  ? "bg-white text-black ring-1 ring-black/5"
                  : "text-black/50 hover:bg-black/[0.03]",
              )}
              aria-pressed={paddingMode === "separate"}
              aria-label="Separado"
              title="Separado"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {paddingMode === "equal" ? (
            <PropertyRow
              label="Todos os lados"
              value={paddingValue}
              onChange={setPaddingAll}
            />
          ) : (
            <>
              <PropertyRow
                label="Superior"
                value={padding.top}
                onChange={(v) => onChange({ ...content, padding: { ...padding, top: v } })}
              />
              <PropertyRow
                label="Inferior"
                value={padding.bottom}
                onChange={(v) => onChange({ ...content, padding: { ...padding, bottom: v } })}
              />
              <PropertyRow
                label="Esquerda"
                value={padding.left}
                onChange={(v) => onChange({ ...content, padding: { ...padding, left: v } })}
              />
              <PropertyRow
                label="Direita"
                value={padding.right}
                onChange={(v) => onChange({ ...content, padding: { ...padding, right: v } })}
              />
            </>
          )}
        </div>
      </div>

      <MediaLibraryDialog
        open={libOpen}
        onOpenChange={setLibOpen}
        onSelect={({ url }) => onChange({ ...content, url })}
        accept="image"
      />
    </div>
  );
}

