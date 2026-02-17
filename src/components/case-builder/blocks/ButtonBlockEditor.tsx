import * as React from "react";
import { AlignCenter, AlignLeft } from "lucide-react";

import { Input } from "@/components/ui/input";
import type {
  ButtonContent,
  ButtonVariant,
  TextAlign,
  TextPadding,
} from "@/lib/case-builder/types";
import { cn } from "@/lib/utils";

type Props = {
  content: ButtonContent;
  onChange: (content: ButtonContent) => void;
};

const ALIGN_OPTIONS: { value: TextAlign; icon: typeof AlignLeft; label: string }[] = [
  { value: "left", icon: AlignLeft, label: "Esquerda" },
  { value: "center", icon: AlignCenter, label: "Centro" },
];

const VARIANT_OPTIONS: Array<{ value: ButtonVariant; label: string }> = [
  { value: "primary", label: "Primário" },
  { value: "secondary", label: "Secundário" },
  { value: "outline", label: "Contorno" },
];

function clampPadding(p: Partial<TextPadding> | undefined): TextPadding {
  const top = Math.max(0, Math.min(240, Number(p?.top ?? 0)));
  const bottom = Math.max(0, Math.min(240, Number(p?.bottom ?? 0)));
  const left = Math.max(0, Math.min(240, Number(p?.left ?? 0)));
  const right = Math.max(0, Math.min(240, Number(p?.right ?? 0)));
  return { top, bottom, left, right };
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

export default function ButtonBlockEditor({ content, onChange }: Props) {
  const padding = clampPadding(content.padding);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-[12px] font-medium text-black/70">Texto</div>
        <Input
          value={content.label ?? ""}
          onChange={(e) => onChange({ ...content, label: e.target.value })}
          placeholder="Texto do botão"
          className="rounded-xl border-border"
          aria-label="Texto do botão"
        />
      </div>

      <div className="space-y-2">
        <div className="text-[12px] font-medium text-black/70">Link (URL)</div>
        <Input
          value={content.href ?? ""}
          onChange={(e) => onChange({ ...content, href: e.target.value })}
          placeholder="https:// ou #"
          className="rounded-xl border-border font-mono text-[12px]"
          aria-label="URL do link"
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
        <div className="text-[12px] font-medium text-black/70">Estilo</div>
        <select
          value={content.variant ?? "primary"}
          onChange={(e) =>
            onChange({ ...content, variant: e.target.value as ButtonVariant })
          }
          className="h-9 w-full rounded-xl border border-border bg-white px-3 text-[12px] font-medium"
          aria-label="Estilo do botão"
        >
          {VARIANT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
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
