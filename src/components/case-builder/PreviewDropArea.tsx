import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

export type PreviewDropAreaVariant = "empty" | "cell" | "column";

type BaseProps = {
  variant: PreviewDropAreaVariant;
  isOver?: boolean;
  label?: string;
  className?: string;
  /** Remove left border (e.g. when column is not the first, to avoid gap between columns) */
  noLeftBorder?: boolean;
};

type AsProps =
  | ({
      as?: "div";
    } & React.HTMLAttributes<HTMLDivElement>)
  | ({
      as: "button";
    } & React.ButtonHTMLAttributes<HTMLButtonElement>);

export const PreviewDropArea = React.forwardRef<
  HTMLDivElement | HTMLButtonElement,
  BaseProps & AsProps
>(function PreviewDropArea(
  { as = "div", variant, isOver = false, label, className, noLeftBorder = false, ...rest },
  ref,
) {
  const common = cn(
    "transition-colors",
    variant !== "cell" ? "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" : "",
    className,
  );

  if (variant === "empty") {
    const Comp: any = as;
    return (
      <Comp
        ref={ref as any}
        className={cn(
          "m-10",
          "rounded-2xl border border-dashed",
          "min-h-[240px]",
          "flex items-center justify-center",
          isOver ? "border-primary/55 bg-primary/10" : "border-primary/45 bg-accent/20",
          common,
        )}
        aria-label="Área para soltar e começar"
        {...(rest as any)}
      >
        <div className="text-center space-y-2">
          <div className="text-3xl font-light text-primary leading-none">+</div>
          <div className="text-sm font-medium text-primary">
            {label ?? "Solte aqui para começar"}
          </div>
        </div>
      </Comp>
    );
  }

  if (variant === "column") {
    const Comp: any = as;
    return (
      <Comp
        ref={ref as any}
        className={cn(
          "w-full",
          "min-h-[160px]",
          "rounded-xl border border-dashed",
          noLeftBorder && "border-l-0 rounded-l-none",
          "flex items-center justify-center",
          isOver ? "border-primary/55 bg-primary/10" : "border-primary/35 bg-accent/20",
          common,
        )}
        aria-label="Área para soltar conteúdo"
        {...(rest as any)}
      >
        <div className="text-center space-y-2">
          <div className="text-2xl font-light text-primary leading-none">+</div>
          <div className="text-sm font-medium text-primary">{label ?? "Solte aqui"}</div>
        </div>
      </Comp>
    );
  }

  // cell
  const Comp: any = as;
  return (
    <Comp
      ref={ref as any}
      className={cn(
        "flex-1 min-h-[60px]",
        "rounded-lg border border-dashed",
        isOver ? "border-primary/55 bg-primary/10" : "border-primary/25 bg-accent/10",
        common,
      )}
      aria-label="Área para soltar"
      {...(rest as any)}
    />
  );
});

export function PreviewDroppableArea({
  id,
  ...props
}: {
  id: string;
} & Omit<React.ComponentProps<typeof PreviewDropArea>, "isOver">) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <PreviewDropArea ref={setNodeRef} isOver={isOver} {...props} />;
}

