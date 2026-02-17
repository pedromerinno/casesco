import * as React from "react";
import { Film } from "lucide-react";

import { Input } from "@/components/ui/input";
import MediaLibraryDialog from "@/components/case-builder/MediaLibraryDialog";
import { cn } from "@/lib/utils";
import type {
  VideoAspect,
  VideoBorderStyle,
  VideoContent,
  VideoProvider,
  VideoSource,
  VideoPadding,
} from "@/lib/case-builder/types";

type Props = {
  content: VideoContent;
  onChange: (content: VideoContent) => void;
};

function detectProvider(url: string): VideoProvider {
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/vimeo\.com/i.test(url)) return "vimeo";
  return "file";
}

function clampPct(v: number): number {
  if (!Number.isFinite(v)) return 100;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function clampPx(v: number, max = 240): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(max, Math.round(v)));
}

function clampPadding(p: Partial<VideoPadding> | undefined): VideoPadding {
  return {
    top: clampPx(Number(p?.top ?? 0)),
    bottom: clampPx(Number(p?.bottom ?? 0)),
    left: clampPx(Number(p?.left ?? 0)),
    right: clampPx(Number(p?.right ?? 0)),
  };
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

function SwitchRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "w-full h-10 rounded-xl border border-border bg-white px-3",
        "flex items-center justify-between",
        "hover:bg-black/[0.02] transition-colors",
      )}
    >
      <div className="min-w-0 text-left">
        <div className="text-[12px] font-medium text-black/70 leading-none">{label}</div>
        {description ? (
          <div className="text-[11px] text-black/40 mt-1">{description}</div>
        ) : null}
      </div>
      <span
        className={cn(
          "h-6 w-11 rounded-full p-0.5 transition-colors shrink-0",
          checked ? "bg-primary" : "bg-black/10",
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "block h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}

function SliderRow({
  label,
  value,
  suffix,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-[80px_1fr_70px] items-center gap-3">
      <div className="text-[12px] text-black/60">{label}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
        aria-label={`${label} (${suffix})`}
      />
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value || 0))}
          className="w-full h-8 rounded-lg border border-border bg-white px-2 pr-8 text-[12px] tabular-nums"
          aria-label={`${label} (${suffix})`}
        />
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-black/40">
          {suffix}
        </div>
      </div>
    </div>
  );
}

function getPrettyName(url: string): string {
  try {
    const u = new URL(url);
    const p = u.pathname.split("/").filter(Boolean).pop();
    return p ? decodeURIComponent(p) : u.hostname;
  } catch {
    const p = url.split("/").filter(Boolean).pop();
    return p ? p : "Vídeo";
  }
}

export default function VideoBlockEditor({ content, onChange }: Props) {
  const [libOpen, setLibOpen] = React.useState(false);

  const source: VideoSource =
    content.source ??
    (content.provider === "youtube" || content.provider === "vimeo" ? "external" : "uploaded");

  const autoplay = Boolean(content.autoplay);
  const loop = Boolean(content.loop);
  const showControls = content.controls !== false;

  const widthDesktopPct = clampPct(Number(content.widthDesktopPct ?? 100));
  const widthMobilePct = clampPct(Number(content.widthMobilePct ?? 100));

  const borderStyle: VideoBorderStyle = content.borderStyle ?? "none";
  const borderColor = normalizeHex(content.borderColor ?? "") ?? "#000000";
  const borderWidth = clampPx(Number(content.borderWidth ?? 1), 24);
  const borderOpacity = clampPct(Number(content.borderOpacity ?? 100));
  const radius = clampPx(Number(content.radius ?? 0), 80);
  const padding = clampPadding(content.padding);

  function setSource(next: VideoSource) {
    if (next === source) return;
    if (next === "external") {
      const url = content.url ?? "";
      onChange({
        ...content,
        source: "external",
        provider: detectProvider(url),
        muxPlaybackId: undefined,
      });
    } else {
      onChange({
        ...content,
        source: "uploaded",
      });
    }
  }

  function setExternalUrl(url: string) {
    onChange({
      ...content,
      source: "external",
      url,
      provider: detectProvider(url),
      muxPlaybackId: undefined,
    });
  }

  const prettyName = content.url?.trim?.() ? getPrettyName(content.url) : "Sem vídeo";

  return (
    <div className="space-y-4">
      <div className="text-[12px] font-medium text-black/70">Vídeo</div>

      {/* Fonte */}
      <div className="space-y-2">
        <div className="text-[12px] font-medium text-black/70">Fonte</div>
        <Segment
          value={source}
          options={[
            { value: "uploaded", label: "Enviado" },
            { value: "external", label: "URL externo" },
          ]}
          onChange={(v) => setSource(v as VideoSource)}
        />
      </div>

      {/* Vídeo (preview / pick) */}
      <div className="space-y-2">
        <div className="text-[12px] font-medium text-black/70">Vídeo</div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <div className="h-12 w-24 rounded-xl bg-accent/30 ring-1 ring-black/10 overflow-hidden grid place-items-center">
              <Film className="h-5 w-5 text-black/40" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-black truncate">{prettyName}</div>
              <div className="text-[11px] text-black/40 truncate">
                {content.provider === "mux" ? "Enviado" : source === "external" ? "URL externo" : "Enviado"}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLibOpen(true)}
            className={cn(
              "h-10 w-10 rounded-xl border border-border bg-white grid place-items-center text-black/60 hover:bg-black/[0.03]",
              source === "external" ? "opacity-50 pointer-events-none" : "",
            )}
            aria-label="Abrir biblioteca"
            title="Biblioteca"
          >
            <Film className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {source === "external" ? (
          <Input
            value={content.url}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="Cole a URL do vídeo (YouTube, Vimeo ou arquivo)"
            className="h-10"
          />
        ) : null}
      </div>

      {/* Toggles */}
      <div className="space-y-2">
        <SwitchRow
          label="Exibir controladores"
          description="Barra de play, volume e progresso. Desative para ocultar inclusive no hover."
          checked={showControls}
          onChange={(v) => onChange({ ...content, controls: v })}
        />
        <SwitchRow
          label="Reprodução automática"
          description="Os vídeos ficarão sem som por padrão"
          checked={autoplay}
          onChange={(v) => onChange({ ...content, autoplay: v })}
        />
        <SwitchRow
          label="Repetir vídeo em loop"
          checked={loop}
          onChange={(v) => onChange({ ...content, loop: v })}
        />
      </div>

      {/* Tamanho */}
      <div className="space-y-2">
        <div className="text-[12px] font-medium text-black/70">Tamanho</div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[12px] text-black/60">Proporção</div>
            <select
              value={content.aspect ?? "16/9"}
              onChange={(e) => onChange({ ...content, aspect: e.target.value as VideoAspect })}
              className="h-9 rounded-xl border border-border bg-white px-3 text-[12px] font-medium min-w-[100px]"
              aria-label="Proporção do vídeo"
            >
              <option value="original">Original</option>
              <option value="16/9">16:9</option>
              <option value="9/16">9:16</option>
              <option value="1/1">1:1</option>
            </select>
          </div>
          <SliderRow
            label="Largura"
            value={widthDesktopPct}
            suffix="%"
            min={0}
            max={100}
            step={1}
            onChange={(v) => onChange({ ...content, widthDesktopPct: clampPct(v) })}
          />
          <SliderRow
            label="Largura no celular"
            value={widthMobilePct}
            suffix="%"
            min={0}
            max={100}
            step={1}
            onChange={(v) => onChange({ ...content, widthMobilePct: clampPct(v) })}
          />
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
              onChange={(v) => onChange({ ...content, borderStyle: v as VideoBorderStyle })}
            />
          </div>

          {borderStyle === "solid" ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="text-[12px] text-black/60">Cor da borda</div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => {
                      const hex = normalizeHex(e.target.value);
                      if (!hex) return;
                      onChange({ ...content, borderColor: hex });
                    }}
                    className="h-9 w-10 rounded-lg border border-border bg-white p-1"
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
                      if (!hex) return;
                      onChange({ ...content, borderColor: hex });
                    }}
                    placeholder="#000000"
                    className="h-9 w-[120px] rounded-xl border border-border bg-white px-3 text-[12px] font-medium tabular-nums"
                    aria-label="Cor da borda (hex)"
                  />
                </div>
              </div>

              <SliderRow
                label="Espessura"
                value={borderWidth}
                suffix="px"
                min={0}
                max={12}
                step={1}
                onChange={(v) => onChange({ ...content, borderWidth: clampPx(v, 24) })}
              />

              <SliderRow
                label="Opacidade"
                value={borderOpacity}
                suffix="%"
                min={0}
                max={100}
                step={1}
                onChange={(v) => onChange({ ...content, borderOpacity: clampPct(v) })}
              />
            </>
          ) : null}

          <SliderRow
            label="Raio do canto"
            value={radius}
            suffix="px"
            min={0}
            max={48}
            step={1}
            onChange={(v) => onChange({ ...content, radius: clampPx(v, 80) })}
          />
        </div>
      </div>

      {/* Preenchimento */}
      <div className="space-y-3">
        <div className="text-[12px] font-medium text-black/70">Preenchimento</div>

        <div className="space-y-3">
          <SliderRow
            label="Superior"
            value={padding.top}
            suffix="px"
            min={0}
            max={120}
            step={4}
            onChange={(v) => onChange({ ...content, padding: { ...padding, top: clampPx(v) } })}
          />
          <SliderRow
            label="Inferior"
            value={padding.bottom}
            suffix="px"
            min={0}
            max={120}
            step={4}
            onChange={(v) =>
              onChange({ ...content, padding: { ...padding, bottom: clampPx(v) } })
            }
          />
          <SliderRow
            label="Esquerda"
            value={padding.left}
            suffix="px"
            min={0}
            max={120}
            step={4}
            onChange={(v) => onChange({ ...content, padding: { ...padding, left: clampPx(v) } })}
          />
          <SliderRow
            label="Direita"
            value={padding.right}
            suffix="px"
            min={0}
            max={120}
            step={4}
            onChange={(v) => onChange({ ...content, padding: { ...padding, right: clampPx(v) } })}
          />
        </div>
      </div>

      <MediaLibraryDialog
        open={libOpen}
        onOpenChange={setLibOpen}
        onSelect={(selection) => {
          if (selection.muxPlaybackId) {
            onChange({
              ...content,
              source: "uploaded",
              url: selection.url,
              provider: "mux",
              muxPlaybackId: selection.muxPlaybackId,
            });
          } else {
            onChange({
              ...content,
              source: "uploaded",
              url: selection.url,
              provider: detectProvider(selection.url),
              muxPlaybackId: undefined,
            });
          }
        }}
        accept="video"
      />
    </div>
  );
}

