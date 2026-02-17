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

