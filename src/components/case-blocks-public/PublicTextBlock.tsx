import type { TextContent } from "@/lib/case-builder/types";
import { cn } from "@/lib/utils";

type Props = { content: TextContent };

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

export default function PublicTextBlock({ content }: Props) {
  const format = content.format ?? "plain";
  const hasRich = format === "rich" && Boolean(content.html?.trim?.());
  const hasPlain = Boolean(content.body?.trim?.());
  if (!hasRich && !hasPlain) return null;

  const widthMode = content.widthMode ?? "auto";
  const maxWidth = content.maxWidth ?? "normal";
  const preset = content.preset ?? "body";
  const colors = content.colors ?? {};
  const background = Boolean(content.background);
  const padding = {
    top: Math.max(0, Number(content.padding?.top ?? 0)),
    bottom: Math.max(0, Number(content.padding?.bottom ?? 0)),
    left: Math.max(0, Number(content.padding?.left ?? 30)),
    right: Math.max(0, Number(content.padding?.right ?? 30)),
  };

  const baseColor = colors.text?.trim?.() ? colors.text : undefined;
  const titleColor =
    colors.title?.trim?.() ? colors.title : baseColor;
  const linkColor =
    colors.link?.trim?.() ? colors.link : undefined;

  const maxWClass =
    maxWidth === "wide" ? "max-w-screen-2xl" : maxWidth === "full" ? "max-w-none" : "max-w-6xl";

  const presetClass =
    preset === "title_1"
      ? "text-3xl md:text-4xl font-semibold tracking-tight leading-[1.08]"
      : "text-base leading-relaxed";

  const fallbackColorClass = "text-secondary-foreground";

  return (
    <div
      className={cn(
        "w-full",
        widthMode === "fill" ? "" : "",
        content.align === "center" ? "text-center" : "",
      )}
    >
      <div
        className={cn(
          "block-content-padding",
          widthMode === "fill" ? "w-full" : "w-fit",
          maxWClass,
          content.align === "center" ? "mx-auto" : "",
          presetClass,
          baseColor ? "" : fallbackColorClass,
          background ? "bg-white/60 rounded-xl ring-1 ring-black/5" : "",
        )}
        style={{
          paddingTop: padding.top,
          paddingBottom: padding.bottom,
          paddingLeft: padding.left,
          paddingRight: padding.right,
          color: preset === "title_1" ? (titleColor ?? baseColor) : baseColor,
          // CSS vars for rich typography overrides.
          ["--onmx-title-color" as any]: titleColor ?? baseColor ?? "",
          ["--onmx-link-color" as any]: linkColor ?? "",
        }}
      >
        {hasRich ? (
          <div
            className={cn(
              "prose prose-neutral max-w-none",
              "prose-p:my-0 prose-headings:my-0 prose-ul:my-0 prose-ol:my-0 prose-li:my-0",
              "prose-a:no-underline hover:prose-a:underline",
              "prose-headings:text-[color:var(--onmx-title-color)]",
              linkColor ? "prose-a:text-[color:var(--onmx-link-color)]" : "prose-a:text-primary",
            )}
            dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(content.html ?? "") }}
          />
        ) : (
          <p className="whitespace-pre-line">{content.body}</p>
        )}
      </div>
    </div>
  );
}
