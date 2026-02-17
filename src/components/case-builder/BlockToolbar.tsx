import { Columns2, Columns3, Columns4, Square, Space } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ContainerColumns } from "@/lib/case-builder/types";

type Props = {
  onAddContainer: (columns: ContainerColumns) => void;
  onAddSpacer: () => void;
};

const CONTAINER_OPTIONS: {
  columns: ContainerColumns;
  label: string;
  icon: typeof Square;
}[] = [
  { columns: 1, label: "1 col", icon: Square },
  { columns: 2, label: "2 col", icon: Columns2 },
  { columns: 3, label: "3 col", icon: Columns3 },
  { columns: 4, label: "4 col", icon: Columns4 },
];

export default function BlockToolbar({ onAddContainer, onAddSpacer }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {CONTAINER_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        return (
          <Button
            key={opt.columns}
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => onAddContainer(opt.columns)}
          >
            <Icon className="h-4 w-4" />
            {opt.label}
          </Button>
        );
      })}

      <div className="w-px h-6 bg-border mx-1" />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={onAddSpacer}
      >
        <Space className="h-4 w-4" />
        Espaço
      </Button>
    </div>
  );
}
