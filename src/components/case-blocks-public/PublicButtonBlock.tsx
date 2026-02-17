import type { ButtonContent, ButtonVariant } from "@/lib/case-builder/types";
import { cn } from "@/lib/utils";

type Props = { content: ButtonContent };

function clampPadding(p: Partial<{ top: number; bottom: number; left: number; right: number }> | undefined) {
  return {
    top: Math.max(0, Number(p?.top ?? 0)),
    bottom: Math.max(0, Number(p?.bottom ?? 0)),
    left: Math.max(0, Number(p?.left ?? 0)),
    right: Math.max(0, Number(p?.right ?? 0)),
  };
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 ring-1 ring-primary/20",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80 ring-1 ring-border",
  outline:
    "bg-transparent text-foreground hover:bg-black/[0.04] ring-1 ring-border",
};

export default function PublicButtonBlock({ content }: Props) {
  const label = (content.label ?? "").trim();
  const href = (content.href ?? "").trim() || "#";
  const align = content.align ?? "left";
  const variant: ButtonVariant = content.variant ?? "primary";
  const padding = clampPadding(content.padding);

  return (
    <div
      className={cn(
        "block-content-padding w-full",
        align === "center" ? "text-center" : "",
      )}
      style={{
        paddingTop: padding.top,
        paddingBottom: padding.bottom,
        paddingLeft: padding.left,
        paddingRight: padding.right,
      }}
    >
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        className={cn(
          "inline-flex items-center justify-center",
          "px-6 py-3 rounded-xl text-sm font-medium",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          VARIANT_CLASS[variant],
        )}
      >
        {label || "Botão"}
      </a>
    </div>
  );
}
