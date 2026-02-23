import { supabase } from "@/lib/supabase/client";

export async function isCurrentUserAdmin(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return false;
  return !!data?.user_id;
}

export type UserAccessInfo = {
  userId: string;
  email: string;
  userName?: string | null;
  userAvatarUrl?: string | null;
  isSuperAdmin: boolean;
  companies: Array<{ id: string; group_id: string; name: string; slug: string; logo_url?: string | null; brand_color?: string | null }>;
};

const COMPANY_COLS_FULL = "id,group_id,name,slug,logo_url,brand_color";
const COMPANY_COLS_BASE = "id,group_id,name,slug";

export async function getUserAccessInfo(): Promise<UserAccessInfo | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const isSuperAdmin = await isCurrentUserAdmin();
  let companies: UserAccessInfo["companies"] = [];

  if (isSuperAdmin) {
    // Try with branding columns; fall back if they don't exist yet
    let { data, error } = await supabase
      .from("companies")
      .select(COMPANY_COLS_FULL)
      .eq("is_active", true)
      .order("name");
    if (error) {
      ({ data } = await supabase
        .from("companies")
        .select(COMPANY_COLS_BASE)
        .eq("is_active", true)
        .order("name"));
    }
    if (data) companies = data;
  } else {
    let { data, error } = await supabase
      .from("user_companies")
      .select(`companies(${COMPANY_COLS_FULL})`)
      .eq("user_id", user.id);
    if (error) {
      ({ data } = await supabase
        .from("user_companies")
        .select(`companies(${COMPANY_COLS_BASE})`)
        .eq("user_id", user.id));
    }
    if (data) companies = data.map((r: any) => r.companies).filter(Boolean);
  }

  if (companies.length === 0 && !isSuperAdmin) return null;

  let userName: string | null = null;
  let userAvatarUrl: string | null = null;
  const { data: profile } = await supabase
    .from("users")
    .select("name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  if (profile) {
    userName = profile.name ?? null;
    userAvatarUrl = profile.avatar_url ?? null;
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    userName,
    userAvatarUrl,
    isSuperAdmin,
    companies,
  };
}

export type UserWithCompaniesRow = {
  id: string;
  email: string;
  name: string | null;
  companies: Array<{ id: string; name: string }>;
};

/** Lista usuários e empresas vinculadas (apenas super-admin consegue ler todos). */
export async function getUsersWithCompanies(): Promise<UserWithCompaniesRow[]> {
  const { data, error } = await supabase
    .from("user_companies")
    .select("user_id, companies(id, name), users(id, email, name)");
  if (error) throw error;

  const byUser = new Map<string, UserWithCompaniesRow>();
  for (const row of data as any[]) {
    const u = row.users;
    const c = row.companies;
    if (!u?.id || !c?.id) continue;
    let rec = byUser.get(u.id);
    if (!rec) {
      rec = { id: u.id, email: u.email ?? "", name: u.name ?? null, companies: [] };
      byUser.set(u.id, rec);
    }
    if (!rec.companies.some((x: { id: string }) => x.id === c.id)) {
      rec.companies.push({ id: c.id, name: c.name ?? "" });
    }
  }
  return Array.from(byUser.values()).sort((a, b) => a.email.localeCompare(b.email));
}

/** Lista empresas ativas para seleção (super-admin). */
export async function getAllCompaniesForAdmin(): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Array<{ id: string; name: string }>;
}

/** Busca usuário por e-mail (super-admin; para vincular existente). */
export async function findUserByEmail(email: string): Promise<{ id: string; email: string; name: string | null } | null> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return null;
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name")
    .ilike("email", trimmed)
    .limit(1);
  if (error || !data?.length) return null;
  return data[0] as { id: string; email: string; name: string | null };
}

