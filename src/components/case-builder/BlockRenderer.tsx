import type { DraftBlock, ContainerContent, SpacerContent } from "@/lib/case-builder/types";
import ContainerBlockEditor from "./blocks/ContainerBlockEditor";
import SpacerBlockEditor from "./blocks/SpacerBlockEditor";

type Props = {
  caseId: string;
  block: DraftBlock;
  onChange: (content: DraftBlock["content"]) => void;
  focusItem?: { columnIndex: number; itemIndex: number } | null;
};

export default function BlockRenderer({
  caseId,
  block,
  onChange,
  focusItem = null,
}: Props) {
  switch (block.type) {
    case "container":
      return (
        <ContainerBlockEditor
          caseId={caseId}
          content={block.content as ContainerContent}
          onChange={onChange}
          focusItem={focusItem}
        />
      );
    case "spacer":
      return (
        <SpacerBlockEditor
          content={block.content as SpacerContent}
          onChange={onChange}
        />
      );
    default:
      return <div className="text-sm text-muted-foreground">Bloco desconhecido</div>;
  }
}
