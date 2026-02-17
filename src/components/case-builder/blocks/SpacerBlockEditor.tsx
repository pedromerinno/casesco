import type { SpacerContent, SpacerHeight } from "@/lib/case-builder/types";

type Props = {
  content: SpacerContent;
  onChange: (content: SpacerContent) => void;
};

const OPTIONS: { value: SpacerHeight; label: string; desc: string }[] = [
  { value: "sm", label: "P", desc: "2 rem" },
  { value: "md", label: "M", desc: "4 rem" },
  { value: "lg", label: "G", desc: "6 rem" },
];

export default function SpacerBlockEditor({ content, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground mr-1">
        Altura
      </span>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange({ height: opt.value })}
          className={
            content.height === opt.value
              ? "px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium"
              : "px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-xs font-medium hover:bg-accent"
          }
        >
          {opt.label}
          <span className="ml-1 text-[10px] opacity-70">{opt.desc}</span>
        </button>
      ))}
    </div>
  );
}
