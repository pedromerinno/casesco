import * as React from "react";
import { arrayMove } from "@dnd-kit/sortable";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  getCaseBlocks,
  saveCaseBlocks,
} from "@/lib/case-builder/queries";
import {
  createContainerContent,
  DEFAULT_SPACER_CONTENT,
  type ContainerColumns,
  type CaseBlock,
  type DraftBlock,
} from "@/lib/case-builder/types";
import BlockToolbar from "./BlockToolbar";
import BlockCanvas from "./BlockCanvas";

type Props = {
  caseId: string;
};

let keyCounter = 0;
function nextKey() {
  return `draft-${++keyCounter}-${Date.now()}`;
}

function toDraft(b: CaseBlock): DraftBlock {
  return {
    _key: b.id,
    id: b.id,
    type: b.type,
    content: b.content,
    sort_order: b.sort_order,
  };
}

export default function CaseEditorPhase2({ caseId }: Props) {
  const { toast } = useToast();
  const [blocks, setBlocks] = React.useState<DraftBlock[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCaseBlocks(caseId).then((data) => {
      if (cancelled) return;
      setBlocks(data.map(toDraft));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  function addContainer(columns: ContainerColumns) {
    const draft: DraftBlock = {
      _key: nextKey(),
      id: null,
      type: "container",
      content: createContainerContent(columns),
      sort_order: blocks.length,
    };
    setBlocks((prev) => [...prev, draft]);
  }

  function addSpacer() {
    const draft: DraftBlock = {
      _key: nextKey(),
      id: null,
      type: "spacer",
      content: { ...DEFAULT_SPACER_CONTENT },
      sort_order: blocks.length,
    };
    setBlocks((prev) => [...prev, draft]);
  }

  function updateBlock(key: string, content: DraftBlock["content"]) {
    setBlocks((prev) =>
      prev.map((b) => (b._key === key ? { ...b, content } : b)),
    );
  }

  function deleteBlock(key: string) {
    setBlocks((prev) => prev.filter((b) => b._key !== key));
  }

  function reorder(activeKey: string, overKey: string) {
    setBlocks((prev) => {
      const oldIndex = prev.findIndex((b) => b._key === activeKey);
      const newIndex = prev.findIndex((b) => b._key === overKey);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveCaseBlocks(caseId, blocks);
      const fresh = await getCaseBlocks(caseId);
      setBlocks(fresh.map(toDraft));
      toast({ title: "Blocos salvos", description: "Alterações salvas com sucesso." });
    } catch (err: any) {
      toast({
        title: "Erro ao salvar blocos",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <BlockToolbar onAddContainer={addContainer} onAddSpacer={addSpacer} />
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando…" : "Salvar blocos"}
        </Button>
      </div>

      <BlockCanvas
        caseId={caseId}
        blocks={blocks}
        onReorder={reorder}
        onUpdate={updateBlock}
        onDelete={deleteBlock}
      />
    </div>
  );
}
