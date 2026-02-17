import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import type { DraftBlock } from "@/lib/case-builder/types";
import BlockWrapper from "./BlockWrapper";
import BlockRenderer from "./BlockRenderer";

type Props = {
  caseId: string;
  blocks: DraftBlock[];
  onReorder: (activeKey: string, overKey: string) => void;
  onUpdate: (key: string, content: DraftBlock["content"]) => void;
  onDelete: (key: string) => void;
};

export default function BlockCanvas({
  caseId,
  blocks,
  onReorder,
  onUpdate,
  onDelete,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  }

  if (blocks.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Use a barra acima para adicionar blocos ao case.
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={blocks.map((b) => b._key)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {blocks.map((block) => (
            <BlockWrapper
              key={block._key}
              id={block._key}
              type={block.type}
              onDelete={() => onDelete(block._key)}
            >
              <BlockRenderer
                caseId={caseId}
                block={block}
                onChange={(content) => onUpdate(block._key, content)}
              />
            </BlockWrapper>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
