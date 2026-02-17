import * as React from "react";
import { AlignCenter, AlignLeft } from "lucide-react";

import { Input } from "@/components/ui/input";
import type {
  TitleContent,
  TitlePreset,
  TextAlign,
  TextPadding,
} from "@/lib/case-builder/types";
import { cn } from "@/lib/utils";

type Props = {
  content: TitleContent;
  onChange: (content: TitleContent) => void;
};

const ALIGN_OPTIONS: { value: TextAlign; icon: typeof AlignLeft; label: string }[] = [
  { value: "left", icon: AlignLeft, label: "Esquerda" },
  { value: "center", icon: AlignCenter, label: "Centro" },
];

const PRESET_OPTIONS: Array<{ value: TitlePreset; label: string }> = [
  { value: "title_1", label: "Título 1" },
  { value: "title_2", label: "Título 2" },
  { value: "title_3", label: "Título 3" },
];

function clampPadding(p: Partial<TextPadding> | undefined): TextPadding {
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

export default function TitleBlockEditor({ content, onChange }: Props) {
  const padding = clampPadding(content.padding);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-[12px] font-medium text-black/70">Texto</div>
        <Input
          value={content.text ?? ""}
          onChange={(e) => onChange({ ...content, text: e.target.value })}
          placeholder="Título"
          className="rounded-xl border-border"
          aria-label="Texto do título"
        />
      </div>

      <div className="space-y-2">
        <div className="text-[12px] font-medium text-black/70">Alinhamento</div>
        <div className="inline-flex items-center rounded-xl bg-[#fbfbf9] ring-1 ring-black/5 p-1">
          {ALIGN_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = (content.align ?? "left") === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...content, align: opt.value })}
                className={cn(
                  "h-9 px-3 rounded-lg inline-flex items-center gap-2 text-[12px] font-medium transition-colors",
                  active
                    ? "bg-white text-black ring-1 ring-black/5"
                    : "text-black/50 hover:bg-black/[0.03]",
                )}
                aria-pressed={active}
                aria-label={opt.label}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[12px] font-medium text-black/70">Tamanho</div>
        <select
          value={content.preset ?? "title_1"}
          onChange={(e) =>
            onChange({ ...content, preset: e.target.value as TitlePreset })
          }
          className="h-9 w-full rounded-xl border border-border bg-white px-3 text-[12px] font-medium"
          aria-label="Tamanho do título"
        >
          {PRESET_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <div className="text-[12px] font-medium text-black/70">Cor</div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={content.color?.trim() || "#111111"}
            onChange={(e) => {
              const hex = normalizeHex(e.target.value);
              onChange({ ...content, color: hex ?? undefined });
            }}
            className="h-9 w-10 rounded-lg border border-border bg-white p-1"
            aria-label="Cor do título"
          />
          <Input
            type="text"
            value={content.color ?? ""}
            onChange={(e) => {
              const hex = normalizeHex(e.target.value);
              onChange({
                ...content,
                color: hex ?? (e.target.value.trim() ? content.color : undefined),
              });
            }}
            placeholder="#111111"
            className="h-9 flex-1 rounded-xl border-border text-[12px] tabular-nums"
            aria-label="Cor (hex)"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-[12px] font-medium text-black/70">Preenchimento</div>
        <div className="space-y-3">
          <PropertyRow
            label="Superior"
            value={padding.top}
            onChange={(v) =>
              onChange({ ...content, padding: { ...padding, top: v } })
            }
          />
          <PropertyRow
            label="Inferior"
            value={padding.bottom}
            onChange={(v) =>
              onChange({ ...content, padding: { ...padding, bottom: v } })
            }
          />
          <PropertyRow
            label="Esquerda"
            value={padding.left}
            onChange={(v) =>
              onChange({ ...content, padding: { ...padding, left: v } })
            }
          />
          <PropertyRow
            label="Direita"
            value={padding.right}
            onChange={(v) =>
              onChange({ ...content, padding: { ...padding, right: v } })
            }
          />
        </div>
      </div>
    </div>
  );
}
