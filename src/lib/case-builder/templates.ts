import { supabase } from "@/lib/supabase/client";
import type { DraftBlock } from "./types";

export type CaseTemplate = {
  id: string;
  name: string;
  description: string;
  /** Number of blocks (shown as badge) */
  blockCount: number;
  /** Factory that generates fresh DraftBlocks with unique keys */
  create: () => DraftBlock[];
};

function uid(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

// ── Template: Case padrão ────────────────────────────────────────────
function createStandardCase(): DraftBlock[] {
  const heroId = uid();
  const introId = uid();
  const spacer1 = uid();
  const galleryId = uid();
  const spacer2 = uid();
  const resultsId = uid();

  return [
    {
      _key: heroId,
      id: heroId,
      type: "container",
      sort_order: 0,
      content: {
        name: "Hero",
        columns: 1 as const,
        slots: [
          [
            {
              _key: uid(),
              type: "image" as const,
              content: {
                url: "",
                alt: "Hero do case",
                cover: false,
                aspect: "16/9" as const,
                widthDesktop: "fill" as const,
                widthMobile: "fill" as const,
                borderStyle: "none" as const,
                radius: 0,
                padding: { top: 0, bottom: 0, left: 0, right: 0 },
              },
            },
          ],
        ],
      },
    },
    {
      _key: spacer1,
      id: spacer1,
      type: "spacer",
      sort_order: 1,
      content: { name: "Espaço", height: "md" as const },
    },
    {
      _key: introId,
      id: introId,
      type: "container",
      sort_order: 2,
      content: {
        name: "Introdução",
        columns: 1 as const,
        slots: [
          [
            {
              _key: uid(),
              type: "text" as const,
              content: {
                body: "Título do case",
                align: "left" as const,
                format: "rich" as const,
                html: "<h1>Título do case</h1>",
                widthMode: "auto" as const,
                maxWidth: "normal" as const,
                preset: "title_1" as const,
                colorRole: "title" as const,
                colors: {},
                background: false,
                padding: { top: 0, bottom: 0, left: 0, right: 0 },
              },
            },
            {
              _key: uid(),
              type: "text" as const,
              content: {
                body: "Descreva o contexto do projeto, o desafio enfrentado pelo cliente e a abordagem adotada pela equipe.",
                align: "left" as const,
                format: "plain" as const,
                html: "",
                widthMode: "auto" as const,
                maxWidth: "normal" as const,
                preset: "body" as const,
                colorRole: "text" as const,
                colors: {},
                background: false,
                padding: { top: 0, bottom: 0, left: 0, right: 0 },
              },
            },
          ],
        ],
      },
    },
    {
      _key: spacer2,
      id: spacer2,
      type: "spacer",
      sort_order: 3,
      content: { name: "Espaço", height: "md" as const },
    },
    {
      _key: galleryId,
      id: galleryId,
      type: "container",
      sort_order: 4,
      content: {
        name: "Galeria",
        columns: 2 as const,
        slots: [
          [
            {
              _key: uid(),
              type: "image" as const,
              content: {
                url: "",
                alt: "Imagem 1",
                cover: false,
                aspect: "auto" as const,
                widthDesktop: "fill" as const,
                widthMobile: "fill" as const,
                borderStyle: "none" as const,
                radius: 0,
                padding: { top: 0, bottom: 0, left: 0, right: 0 },
              },
            },
          ],
          [
            {
              _key: uid(),
              type: "image" as const,
              content: {
                url: "",
                alt: "Imagem 2",
                cover: false,
                aspect: "auto" as const,
                widthDesktop: "fill" as const,
                widthMobile: "fill" as const,
                borderStyle: "none" as const,
                radius: 0,
                padding: { top: 0, bottom: 0, left: 0, right: 0 },
              },
            },
          ],
        ],
      },
    },
    {
      _key: uid(),
      id: uid(),
      type: "spacer",
      sort_order: 5,
      content: { name: "Espaço", height: "md" as const },
    },
    {
      _key: resultsId,
      id: resultsId,
      type: "container",
      sort_order: 6,
      content: {
        name: "Resultados",
        columns: 1 as const,
        slots: [
          [
            {
              _key: uid(),
              type: "text" as const,
              content: {
                body: "Resultados",
                align: "left" as const,
                format: "rich" as const,
                html: "<h2>Resultados</h2>",
                widthMode: "auto" as const,
                maxWidth: "normal" as const,
                preset: "title_1" as const,
                colorRole: "title" as const,
                colors: {},
                background: false,
                padding: { top: 0, bottom: 0, left: 0, right: 0 },
              },
            },
            {
              _key: uid(),
              type: "text" as const,
              content: {
                body: "Descreva os resultados alcançados, métricas de sucesso e impacto para o cliente.",
                align: "left" as const,
                format: "plain" as const,
                html: "",
                widthMode: "auto" as const,
                maxWidth: "normal" as const,
                preset: "body" as const,
                colorRole: "text" as const,
                colors: {},
                background: false,
                padding: { top: 0, bottom: 0, left: 0, right: 0 },
              },
            },
          ],
        ],
      },
    },
  ];
}

// ── Template: Galeria visual ─────────────────────────────────────────
function createVisualGallery(): DraftBlock[] {
  const heroId = uid();
  const row1 = uid();
  const row2 = uid();

  return [
    {
      _key: heroId,
      id: heroId,
      type: "container",
      sort_order: 0,
      content: {
        name: "Hero",
        columns: 1 as const,
        slots: [
          [
            {
              _key: uid(),
              type: "image" as const,
              content: {
                url: "",
                alt: "Hero",
                cover: false,
                aspect: "16/9" as const,
                widthDesktop: "fill" as const,
                widthMobile: "fill" as const,
                borderStyle: "none" as const,
                radius: 0,
                padding: { top: 0, bottom: 0, left: 0, right: 0 },
              },
            },
          ],
        ],
      },
    },
    {
      _key: uid(),
      id: uid(),
      type: "spacer",
      sort_order: 1,
      content: { height: "sm" as const },
    },
    {
      _key: row1,
      id: row1,
      type: "container",
      sort_order: 2,
      content: {
        name: "Galeria 1",
        columns: 3 as const,
        slots: [
          [{ _key: uid(), type: "image" as const, content: { url: "", alt: "Imagem 1", cover: false, aspect: "1/1" as const, widthDesktop: "fill" as const, widthMobile: "fill" as const, borderStyle: "none" as const, radius: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 } } }],
          [{ _key: uid(), type: "image" as const, content: { url: "", alt: "Imagem 2", cover: false, aspect: "1/1" as const, widthDesktop: "fill" as const, widthMobile: "fill" as const, borderStyle: "none" as const, radius: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 } } }],
          [{ _key: uid(), type: "image" as const, content: { url: "", alt: "Imagem 3", cover: false, aspect: "1/1" as const, widthDesktop: "fill" as const, widthMobile: "fill" as const, borderStyle: "none" as const, radius: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 } } }],
        ],
      },
    },
    {
      _key: uid(),
      id: uid(),
      type: "spacer",
      sort_order: 3,
      content: { height: "sm" as const },
    },
    {
      _key: row2,
      id: row2,
      type: "container",
      sort_order: 4,
      content: {
        name: "Galeria 2",
        columns: 2 as const,
        slots: [
          [{ _key: uid(), type: "image" as const, content: { url: "", alt: "Imagem 4", cover: false, aspect: "auto" as const, widthDesktop: "fill" as const, widthMobile: "fill" as const, borderStyle: "none" as const, radius: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 } } }],
          [{ _key: uid(), type: "image" as const, content: { url: "", alt: "Imagem 5", cover: false, aspect: "auto" as const, widthDesktop: "fill" as const, widthMobile: "fill" as const, borderStyle: "none" as const, radius: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 } } }],
        ],
      },
    },
    {
      _key: uid(),
      id: uid(),
      type: "spacer",
      sort_order: 5,
      content: { height: "sm" as const },
    },
    {
      _key: uid(),
      id: uid(),
      type: "container",
      sort_order: 6,
      content: {
        name: "Imagem destaque",
        columns: 1 as const,
        slots: [
          [{ _key: uid(), type: "image" as const, content: { url: "", alt: "Destaque", cover: false, aspect: "16/9" as const, widthDesktop: "fill" as const, widthMobile: "fill" as const, borderStyle: "none" as const, radius: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 } } }],
        ],
      },
    },
  ];
}

// ── Template: Vídeo + texto ──────────────────────────────────────────
function createVideoCase(): DraftBlock[] {
  const videoId = uid();
  const textId = uid();
  const galleryId = uid();

  return [
    {
      _key: videoId,
      id: videoId,
      type: "container",
      sort_order: 0,
      content: {
        name: "Vídeo principal",
        columns: 1 as const,
        slots: [
          [
            {
              _key: uid(),
              type: "video" as const,
              content: {
                url: "",
                provider: "file" as const,
                aspect: "16/9" as const,
                autoplay: false,
                controls: true,
                loop: false,
                source: "uploaded" as const,
                widthDesktopPct: 100,
                widthMobilePct: 100,
                borderStyle: "none" as const,
                borderColor: "#000000",
                borderWidth: 1,
                borderOpacity: 100,
                radius: 0,
                padding: { top: 0, bottom: 0, left: 0, right: 0 },
              },
            },
          ],
        ],
      },
    },
    {
      _key: uid(),
      id: uid(),
      type: "spacer",
      sort_order: 1,
      content: { name: "Espaço", height: "md" as const },
    },
    {
      _key: textId,
      id: textId,
      type: "container",
      sort_order: 2,
      content: {
        name: "Sobre o projeto",
        columns: 1 as const,
        slots: [
          [
            {
              _key: uid(),
              type: "text" as const,
              content: {
                body: "Sobre o projeto",
                align: "left" as const,
                format: "rich" as const,
                html: "<h2>Sobre o projeto</h2>",
                widthMode: "auto" as const,
                maxWidth: "normal" as const,
                preset: "title_1" as const,
                colorRole: "title" as const,
                colors: {},
                background: false,
                padding: { top: 0, bottom: 0, left: 0, right: 0 },
              },
            },
            {
              _key: uid(),
              type: "text" as const,
              content: {
                body: "Descreva o contexto do projeto, os objetivos e a solução desenvolvida.",
                align: "left" as const,
                format: "plain" as const,
                html: "",
                widthMode: "auto" as const,
                maxWidth: "normal" as const,
                preset: "body" as const,
                colorRole: "text" as const,
                colors: {},
                background: false,
                padding: { top: 0, bottom: 0, left: 0, right: 0 },
              },
            },
          ],
        ],
      },
    },
    {
      _key: uid(),
      id: uid(),
      type: "spacer",
      sort_order: 3,
      content: { name: "Espaço", height: "md" as const },
    },
    {
      _key: galleryId,
      id: galleryId,
      type: "container",
      sort_order: 4,
      content: {
        name: "Making of",
        columns: 2 as const,
        slots: [
          [{ _key: uid(), type: "image" as const, content: { url: "", alt: "Making of 1", cover: false, aspect: "auto" as const, widthDesktop: "fill" as const, widthMobile: "fill" as const, borderStyle: "none" as const, radius: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 } } }],
          [{ _key: uid(), type: "image" as const, content: { url: "", alt: "Making of 2", cover: false, aspect: "auto" as const, widthDesktop: "fill" as const, widthMobile: "fill" as const, borderStyle: "none" as const, radius: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 } } }],
        ],
      },
    },
  ];
}

// ── Registry ─────────────────────────────────────────────────────────

export const CASE_TEMPLATES: CaseTemplate[] = [
  {
    id: "standard",
    name: "Case padrão",
    description: "Hero, introdução, galeria e resultados.",
    blockCount: 7,
    create: createStandardCase,
  },
  {
    id: "visual-gallery",
    name: "Galeria visual",
    description: "Foco em imagens: hero + grids de 2 e 3 colunas.",
    blockCount: 7,
    create: createVisualGallery,
  },
  {
    id: "video-case",
    name: "Vídeo + texto",
    description: "Vídeo principal, texto descritivo e galeria making of.",
    blockCount: 5,
    create: createVideoCase,
  },
];

// ── Custom (DB-persisted) templates ──────────────────────────────────

export type CustomCaseTemplate = {
  id: string;
  group_id: string;
  name: string;
  description: string;
  blocks: unknown[];
  created_at: string;
  updated_at: string;
};

/** Regenerate _key and id on every block + nested slot item so they are unique. */
function rehydrateBlocks(raw: unknown[]): DraftBlock[] {
  return (raw as any[]).map((b, i) => {
    const key = uid();
    const block: DraftBlock = {
      _key: key,
      id: key,
      type: b.type,
      sort_order: i,
      content: structuredClone(b.content),
    };
    // Regenerate slot item keys inside containers
    if (block.type === "container") {
      const c = block.content as any;
      if (Array.isArray(c?.slots)) {
        c.slots = c.slots.map((col: any[]) =>
          (col ?? []).map((item: any) => ({ ...item, _key: uid() })),
        );
      }
    }
    return block;
  });
}

export async function getCustomTemplates(
  groupId: string,
): Promise<CustomCaseTemplate[]> {
  const { data, error } = await supabase
    .from("case_templates")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as CustomCaseTemplate[]) ?? [];
}

/** Serialize current drafts into a new template row. */
export async function saveAsTemplate(
  groupId: string,
  name: string,
  description: string,
  drafts: DraftBlock[],
): Promise<CustomCaseTemplate> {
  // Strip _key and id so they're regenerated when applied
  const blocks = drafts.map((d, i) => ({
    type: d.type,
    sort_order: i,
    content: d.content,
  }));

  const { data, error } = await supabase
    .from("case_templates")
    .insert({ group_id: groupId, name, description, blocks })
    .select("*")
    .single();
  if (error) throw error;
  return data as CustomCaseTemplate;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from("case_templates")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** Convert a custom template's JSON blocks into fresh DraftBlocks. */
export function createBlocksFromCustomTemplate(
  template: CustomCaseTemplate,
): DraftBlock[] {
  return rehydrateBlocks(template.blocks);
}
