import { supabase } from "@/lib/supabase/client";

export type PrimaryCompany = {
  id: string;
  group_id: string;
  name: string;
  slug: string;
};

const PRIMARY_COMPANY_SLUG =
  (import.meta.env.VITE_PRIMARY_COMPANY_SLUG as string | undefined) ?? "onmx";

export async function getPrimaryCompany(): Promise<PrimaryCompany> {
  // Single-company site: prefer a stable slug (defaults to "onmx").
  const preferred = await supabase
    .from("companies")
    .select("id,group_id,name,slug,is_active,created_at")
    .eq("is_active", true)
    .eq("slug", PRIMARY_COMPANY_SLUG)
    .maybeSingle();

  if (preferred.error) throw preferred.error;
  if (preferred.data) {
    return {
      id: preferred.data.id,
      group_id: preferred.data.group_id,
      name: preferred.data.name,
      slug: preferred.data.slug,
    };
  }

  const { data, error } = await supabase
    .from("companies")
    .select("id,group_id,name,slug,is_active,created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Nenhuma empresa ativa encontrada.");

  return {
    id: data.id,
    group_id: data.group_id,
    name: data.name,
    slug: data.slug,
  };
}

