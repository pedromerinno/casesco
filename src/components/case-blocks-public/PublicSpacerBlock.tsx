import type { SpacerContent } from "@/lib/case-builder/types";

const HEIGHT_MAP: Record<string, string> = {
  sm: "h-8",  // 2rem
  md: "h-16", // 4rem
  lg: "h-24", // 6rem
};

type Props = { content: SpacerContent };

export default function PublicSpacerBlock({ content }: Props) {
  const height = HEIGHT_MAP[content.height] ?? HEIGHT_MAP.md;
  return <div className={`w-full ${height}`} />;
}
