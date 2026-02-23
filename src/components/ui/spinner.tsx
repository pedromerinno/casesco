import { cn } from "@/lib/utils";

type SpinnerProps = {
  className?: string;
  /** Tamanho: sm (20px), md (24px). Default sm. */
  size?: "sm" | "md";
};

export function Spinner({ className, size = "sm" }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className={cn(
        "rounded-full border-2 border-muted border-t-foreground animate-spin",
        size === "sm" && "h-5 w-5",
        size === "md" && "h-6 w-6",
        className
      )}
      style={{ animationDuration: "0.4s" }}
    />
  );
}
