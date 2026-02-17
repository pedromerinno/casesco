import * as React from "react";
import {
  AlignCenter,
  AlignLeft,
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
} from "lucide-react";

import type {
  TextAlign,
  TextColorRole,
  TextContent,
  TextFormat,
  TextColors,
  TextMaxWidth,
  TextPadding,
  TextPreset,
  TextWidthMode,
} from "@/lib/case-builder/types";
import { cn } from "@/lib/utils";

type Props = {
  content: TextContent;
  onChange: (content: TextContent) => void;
};

const ALIGN_OPTIONS: { value: TextAlign; icon: typeof AlignLeft; label: string }[] = [
  { value: "left", icon: AlignLeft, label: "Alinhar à esquerda" },
  { value: "center", icon: AlignCenter, label: "Centralizar" },
];

const PRESET_OPTIONS: Array<{ value: TextPreset; label: string }> = [
  { value: "title_1", label: "Título 1" },
  { value: "body", label: "Parágrafo" },
];

const MAX_WIDTH_OPTIONS: Array<{ value: TextMaxWidth; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "wide", label: "Wide" },
  { value: "full", label: "Full" },
];

const COLOR_OPTIONS: Array<{ value: TextColorRole; label: string }> = [
  { value: "text", label: "Texto" },
  { value: "title", label: "Título" },
  { value: "link", label: "Link" },
];

const FORMAT_OPTIONS: Array<{ value: "p" | "h1"; label: string }> = [
  { value: "p", label: "Texto" },
  { value: "h1", label: "H1" },
];

function sanitizeRichHtml(input: string): string {
  try {
    const doc = new DOMParser().parseFromString(input, "text/html");

    doc.querySelectorAll("script,style,iframe,object,embed").forEach((n) => n.remove());

    doc.querySelectorAll("*").forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.toLowerCase().startsWith("on")) el.removeAttribute(attr.name);
      }

      const href = el.getAttribute("href");
      if (href && /^\s*javascript:/i.test(href)) el.removeAttribute("href");
    });

    return doc.body.innerHTML;
  } catch {
    return input;
  }
}

function stripTextFromHtml(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent ?? "").trim();
  } catch {
    return "";
  }
}

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

function exec(cmd: string, value?: string) {
  try {
    // execCommand is deprecated but works well for lightweight admin editors.
    document.execCommand(cmd, false, value);
  } catch {
    // ignore
  }
}

function inferFormatFromHtml(html: string): "p" | "h1" {
  const trimmed = html.trim();
  if (/^<h1[\s>]/i.test(trimmed)) return "h1";
  return "p";
}

function escapeLine(line: string): string {
  return line.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export default function TextBlockEditor({ content, onChange }: Props) {
  const editorRef = React.useRef<HTMLDivElement | null>(null);

  const format: TextFormat = content.format ?? "plain";
  const widthMode: TextWidthMode = content.widthMode ?? "auto";
  const maxWidth: TextMaxWidth = content.maxWidth ?? "normal";
  const preset: TextPreset = content.preset ?? "body";
  const colorRole: TextColorRole = content.colorRole ?? "text";
  const colors: TextColors = content.colors ?? {};
  const background = Boolean(content.background);
  const padding = clampPadding(content.padding);

  const htmlValue =
    format === "rich"
      ? content.html ?? ""
      : (content.body ?? "")
          .split("\n")
          .map((line) => `<p>${escapeLine(line)}</p>`)
          .join("");

  const [formatBlock, setFormatBlock] = React.useState<"p" | "h1">(
    inferFormatFromHtml(htmlValue),
  );

  React.useEffect(() => {
    setFormatBlock(inferFormatFromHtml(htmlValue));
  }, [htmlValue]);

  function commitHtml(nextHtmlRaw: string) {
    const nextHtml = sanitizeRichHtml(nextHtmlRaw);
    onChange({
      ...content,
      format: "rich",
      html: nextHtml,
      body: stripTextFromHtml(nextHtml),
    });
  }

  return (
    <div className="space-y-4">
      {/* Texto */}
      <div className="space-y-2">
        <div className="text-[12px] font-medium text-black/70">Texto</div>

        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-[#fbfbf9]">
            <select
              value={formatBlock}
              onChange={(e) => {
                const v = e.target.value as "p" | "h1";
                setFormatBlock(v);
                editorRef.current?.focus();
                exec("formatBlock", v === "h1" ? "H1" : "P");
                queueMicrotask(() => commitHtml(editorRef.current?.innerHTML ?? ""));
              }}
              className="h-8 rounded-lg border border-border bg-white px-2 text-[12px] font-medium"
              aria-label="Formato"
            >
              {FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <div className="h-6 w-px bg-black/[0.08] mx-1" aria-hidden="true" />

            <button
              type="button"
              onClick={() => {
                editorRef.current?.focus();
                exec("bold");
                queueMicrotask(() => commitHtml(editorRef.current?.innerHTML ?? ""));
              }}
              className="h-8 w-8 rounded-lg hover:bg-black/[0.04] grid place-items-center text-black/70"
              aria-label="Negrito"
              title="Negrito"
            >
              <Bold className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                editorRef.current?.focus();
                exec("italic");
                queueMicrotask(() => commitHtml(editorRef.current?.innerHTML ?? ""));
              }}
              className="h-8 w-8 rounded-lg hover:bg-black/[0.04] grid place-items-center text-black/70"
              aria-label="Itálico"
              title="Itálico"
            >
              <Italic className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                editorRef.current?.focus();
                const url = window.prompt("URL do link");
                if (!url) return;
                exec("createLink", url);
                queueMicrotask(() => commitHtml(editorRef.current?.innerHTML ?? ""));
              }}
              className="h-8 w-8 rounded-lg hover:bg-black/[0.04] grid place-items-center text-black/70"
              aria-label="Link"
              title="Link"
            >
              <LinkIcon className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="h-6 w-px bg-black/[0.08] mx-1" aria-hidden="true" />

            <button
              type="button"
              onClick={() => {
                editorRef.current?.focus();
                exec("insertUnorderedList");
                queueMicrotask(() => commitHtml(editorRef.current?.innerHTML ?? ""));
              }}
              className="h-8 w-8 rounded-lg hover:bg-black/[0.04] grid place-items-center text-black/70"
              aria-label="Lista"
              title="Lista"
            >
              <List className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                editorRef.current?.focus();
                exec("insertOrderedList");
                queueMicrotask(() => commitHtml(editorRef.current?.innerHTML ?? ""));
              }}
              className="h-8 w-8 rounded-lg hover:bg-black/[0.04] grid place-items-center text-black/70"
              aria-label="Lista numerada"
              title="Lista numerada"
            >
              <ListOrdered className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="ml-auto inline-flex items-center gap-1">
              {ALIGN_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = content.align === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ ...content, align: opt.value })}
                    className={cn(
                      "h-8 w-8 rounded-lg grid place-items-center transition-colors",
                      active
                        ? "bg-white ring-1 ring-black/5 text-black"
                        : "hover:bg-black/[0.04] text-black/70",
                    )}
                    aria-label={opt.label}
                    title={opt.label}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-2">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              spellCheck
              className={cn(
                "min-h-[84px] w-full rounded-lg border border-border bg-white px-3 py-2",
                "text-[14px] leading-relaxed text-black",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                content.align === "center" ? "text-center" : "text-left",
              )}
              onInput={(e) => commitHtml((e.currentTarget as HTMLDivElement).innerHTML)}
              dangerouslySetInnerHTML={{ __html: htmlValue || "<p><br/></p>" }}
              aria-label="Texto"
            />
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="space-y-2">
        <div className="text-[12px] font-medium text-black/70">Layout</div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[12px] text-black/60">Largura</div>
            <Segment
              value={widthMode}
              options={[
                { value: "auto", label: "Ajustar" },
                { value: "fill", label: "Preencher" },
              ]}
              onChange={(v) => onChange({ ...content, widthMode: v as TextWidthMode })}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-[12px] text-black/60">Largura máxima</div>
            <select
              value={maxWidth}
              onChange={(e) =>
                onChange({ ...content, maxWidth: e.target.value as TextMaxWidth })
              }
              className="h-9 rounded-xl border border-border bg-white px-3 text-[12px] font-medium"
              aria-label="Largura máxima"
            >
              {MAX_WIDTH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tipografia */}
      <div className="space-y-2">
        <div className="text-[12px] font-medium text-black/70">Tipografia</div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[12px] text-black/60">Predefinição</div>
            <select
              value={preset}
              onChange={(e) => onChange({ ...content, preset: e.target.value as TextPreset })}
              className="h-9 rounded-xl border border-border bg-white px-3 text-[12px] font-medium"
              aria-label="Predefinição"
            >
              {PRESET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-[12px] text-black/60">Cor</div>
            <div className="inline-flex items-center rounded-xl bg-[#fbfbf9] ring-1 ring-black/5 p-1">
              {COLOR_OPTIONS.map((opt) => {
                const active = colorRole === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ ...content, colorRole: opt.value })}
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
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-[12px] text-black/60"> </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colors[colorRole] ?? "#111111"}
                onChange={(e) => {
                  const hex = normalizeHex(e.target.value);
                  const next: TextColors = { ...(content.colors ?? {}) };
                  if (hex) next[colorRole] = hex;
                  onChange({ ...content, colors: next });
                }}
                className="h-9 w-10 rounded-lg border border-border bg-white p-1"
                aria-label="Selecionar cor"
              />
              <input
                type="text"
                value={colors[colorRole] ?? ""}
                onChange={(e) => {
                  const hex = normalizeHex(e.target.value);
                  const next: TextColors = { ...(content.colors ?? {}) };
                  if (!e.target.value.trim()) {
                    delete next[colorRole];
                    onChange({ ...content, colors: next });
                    return;
                  }
                  if (!hex) return;
                  next[colorRole] = hex;
                  onChange({ ...content, colors: next });
                }}
                placeholder="#111111"
                className="h-9 w-[120px] rounded-xl border border-border bg-white px-3 text-[12px] font-medium tabular-nums"
                aria-label="Cor (hex)"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Aparência */}
      <div className="space-y-2">
        <div className="text-[12px] font-medium text-black/70">Aparência</div>

        <button
          type="button"
          role="switch"
          aria-checked={background}
          onClick={() => onChange({ ...content, background: !background })}
          className={cn(
            "w-full h-10 rounded-xl border border-border bg-white px-3",
            "flex items-center justify-between",
            "hover:bg-black/[0.02] transition-colors",
          )}
        >
          <div className="text-[12px] text-black/60">Plano de fundo</div>
          <span
            className={cn(
              "h-6 w-11 rounded-full p-0.5 transition-colors",
              background ? "bg-primary" : "bg-black/10",
            )}
            aria-hidden="true"
          >
            <span
              className={cn(
                "block h-5 w-5 rounded-full bg-white shadow transition-transform",
                background ? "translate-x-5" : "translate-x-0",
              )}
            />
          </span>
        </button>
      </div>

      {/* Preenchimento */}
      <div className="space-y-3">
        <div className="text-[12px] font-medium text-black/70">Preenchimento</div>

        <div className="space-y-3">
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
        </div>
      </div>
    </div>
  );
}

