import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, LayoutGrid, Space } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BlockType } from "@/lib/case-builder/types";

const TYPE_META: Record<BlockType, { label: string; icon: typeof LayoutGrid }> = {
  container: { label: "Seção", icon: LayoutGrid },
  spacer: { label: "Espaço", icon: Space },
};

type Props = {
  id: string;
  type: BlockType;
  onDelete: () => void;
  children: React.ReactNode;
};

export default function BlockWrapper({ id, type, onDelete, children }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const meta = TYPE_META[type];
  const Icon = meta.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-accent"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          {meta.label}
        </span>

        <div className="flex-1" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onDelete}
          aria-label="Remover bloco"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="p-4">{children}</div>
    </div>
  );
}
