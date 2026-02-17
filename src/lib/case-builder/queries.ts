import { supabase } from "@/lib/supabase/client";
import type { CaseBlock, DraftBlock } from "./types";

// ── Shared helpers (moved from AdminCases) ──────────────────────────

export type ClientOption = { id: string; name: string };
export type CategoryOption = { id: string; name: string };

export function toPublicObjectUrl(url: string, bucketId: string) {
  if (url.includes(`/storage/v1/object/public/${bucketId}/`)) return url;
  if (url.includes(`/storage/v1/object/${bucketId}/`)) {
    return url.replace(
      `/storage/v1/object/${bucketId}/`,
      `/storage/v1/object/public/${bucketId}/`,
    );
  }
  return url;
}

export async function getClients(groupId: string): Promise<ClientOption[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id,name")
    .eq("group_id", groupId)
    .order("name");
  if (error) throw error;
  return (data as ClientOption[]) ?? [];
}

export async function getCategoriesForCompany(
  companyId: string,
): Promise<CategoryOption[]> {
  const { data, error } = await supabase
    .from("case_category_companies")
    .select("case_categories(id,name)")
    .eq("company_id", companyId);
  if (error) throw error;
  const cats = (data as any[])
    ?.map((r) => r.case_categories)
    .filter(Boolean) as CategoryOption[] | undefined;
  const uniq = new Map<string, CategoryOption>();
  (cats ?? []).forEach((c) => uniq.set(c.id, c));
  return Array.from(uniq.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export async function uploadCover(
  caseId: string,
  file: File,
): Promise<string> {
  const safeName = file.name
    .replace(/[^a-z0-9.\-_]/gi, "-")
    .toLowerCase();
  const path = `covers/${caseId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("case-covers")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    throw new Error(
      uploadError.message.includes("row-level security") ||
        uploadError.message.includes("permission")
        ? "Permissão insuficiente no Storage para enviar arquivos no bucket case-covers."
        : uploadError.message,
    );
  }

  const { data } = supabase.storage.from("case-covers").getPublicUrl(path);
  const publicUrl = toPublicObjectUrl(data.publicUrl, "case-covers");

  const { data: updated, error: updateError } = await supabase
    .from("cases")
    .update({ cover_image_url: publicUrl })
    .eq("id", caseId)
    .select("cover_image_url")
    .single();

  if (updateError) {
    throw new Error(
      updateError.message.includes("row-level security") ||
        updateError.message.includes("permission")
        ? "Permissão insuficiente para salvar a capa no banco (tabela cases)."
        : updateError.message,
    );
  }

  if (!updated?.cover_image_url) {
    throw new Error(
      "Não foi possível salvar a capa no case (update não retornou cover_image_url).",
    );
  }

  return publicUrl;
}

// ── Case Blocks ─────────────────────────────────────────────────────

export async function getCaseBlocks(caseId: string): Promise<CaseBlock[]> {
  const { data, error } = await supabase
    .from("case_blocks")
    .select("*")
    .eq("case_id", caseId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as CaseBlock[]) ?? [];
}

export async function getPublicCaseBlocks(
  caseId: string,
): Promise<CaseBlock[]> {
  return getCaseBlocks(caseId);
}

/** Case detail by ID (any status), for admin preview. */
export type CaseDetailPreview = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  year: number | null;
  cover_image_url: string | null;
  cover_video_url: string | null;
  cover_mux_playback_id: string | null;
  page_background: string | null;
  services: string[] | null;
  client_name: string | null;
  categories: Array<{ id: string; name: string; slug?: string }>;
};

export type CaseMediaItem = {
  id: string;
  url: string;
  type: string;
  title: string | null;
  alt_text: string | null;
  sort_order: number | null;
};

export async function getCaseMedia(caseId: string): Promise<CaseMediaItem[]> {
  const { data, error } = await supabase
    .from("case_media")
    .select("id,url,type,title,alt_text,sort_order")
    .eq("case_id", caseId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as CaseMediaItem[]) ?? [];
}

export async function getCaseByIdForPreview(
  caseId: string,
): Promise<CaseDetailPreview | null> {
  const { data, error } = await supabase
    .from("cases")
    .select(
      "id,title,slug,summary,year,cover_image_url,cover_video_url,cover_mux_playback_id,page_background,services,clients(name),case_category_cases(case_categories(id,name,slug))",
    )
    .eq("id", caseId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as any;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    year: row.year,
    cover_image_url: row.cover_image_url,
    cover_video_url: row.cover_video_url ?? null,
    cover_mux_playback_id: row.cover_mux_playback_id ?? null,
    page_background: row.page_background ?? null,
    services: row.services,
    client_name: row.clients?.name ?? null,
    categories:
      (row.case_category_cases ?? [])
        ?.map((cc: any) => cc.case_categories)
        .filter(Boolean) ?? [],
  };
}

export async function saveCaseBlocks(
  caseId: string,
  drafts: DraftBlock[],
): Promise<void> {
  // 1) Fetch existing block IDs
  const { data: existing, error: fetchErr } = await supabase
    .from("case_blocks")
    .select("id")
    .eq("case_id", caseId);
  if (fetchErr) throw fetchErr;

  const existingIds = new Set((existing ?? []).map((b: any) => b.id));
  const keptIds = new Set(drafts.filter((d) => d.id).map((d) => d.id!));

  // 2) Delete removed blocks
  const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
  if (toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from("case_blocks")
      .delete()
      .in("id", toDelete);
    if (delErr) throw delErr;
  }

  // 3) Upsert all current blocks
  const rows = drafts.map((d, i) => ({
    ...(d.id ? { id: d.id } : {}),
    case_id: caseId,
    type: d.type,
    content: d.content,
    sort_order: i,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length > 0) {
    const { error: upsertErr } = await supabase
      .from("case_blocks")
      .upsert(rows, { onConflict: "id" });
    if (upsertErr) throw upsertErr;
  }
}

export async function deleteBlock(blockId: string): Promise<void> {
  const { error } = await supabase
    .from("case_blocks")
    .delete()
    .eq("id", blockId);
  if (error) throw error;
}

export async function uploadBlockImage(
  caseId: string,
  file: File,
): Promise<string> {
  const safeName = file.name
    .replace(/[^a-z0-9.\-_]/gi, "-")
    .toLowerCase();
  const path = `blocks/${caseId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("case-covers")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from("case-covers").getPublicUrl(path);
  return toPublicObjectUrl(data.publicUrl, "case-covers");
}

// ── Cases list (used by AdminCases) ─────────────────────────────────

export type CaseRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  year: number | null;
  cover_image_url: string | null;
  cover_video_url: string | null;
  cover_mux_playback_id: string | null;
  page_background: string | null;
  services: string[] | null;
  status: string | null;
  published_at: string | null;
  clients: { id: string; name: string } | null;
  categories: { id: string; name: string }[];
};

export async function getCases(companyId: string): Promise<CaseRow[]> {
  const { data, error } = await supabase
    .from("cases")
    .select(
      "id,title,slug,summary,year,cover_image_url,cover_video_url,cover_mux_playback_id,page_background,services,status,published_at,clients(id,name),case_category_cases(case_categories(id,name))",
    )
    .eq("owner_company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    (data as any[])?.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      summary: row.summary,
      year: row.year,
      cover_image_url: row.cover_image_url,
      cover_video_url: row.cover_video_url ?? null,
      cover_mux_playback_id: row.cover_mux_playback_id ?? null,
      page_background: row.page_background ?? null,
      services: row.services,
      status: row.status,
      published_at: row.published_at,
      clients: row.clients,
      categories: (row.case_category_cases ?? [])
        .map((cc: any) => cc.case_categories)
        .filter(Boolean),
    })) ?? []
  );
}
