import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user: caller }, error: authError } = await sb.auth.getUser(token);
    if (authError || !caller) {
      const msg = authError?.message ?? "Token inválido ou expirado. Faça login novamente.";
      return new Response(JSON.stringify({ error: msg }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: adminRow } = await sb
      .from("admin_users")
      .select("user_id")
      .eq("user_id", caller.id)
      .maybeSingle();
    if (!adminRow) {
      return new Response(JSON.stringify({ error: "Apenas super-admins podem convidar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const companyIds = Array.isArray(body?.company_ids)
      ? body.company_ids.filter((id: unknown) => typeof id === "string")
      : [];

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "E-mail inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (companyIds.length === 0) {
      return new Response(JSON.stringify({ error: "Selecione ao menos uma empresa" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inviteData, error: inviteError } = await sb.auth.admin.inviteUserByEmail(email, {
      redirectTo: typeof body.redirect_to === "string" ? body.redirect_to : undefined,
    });

    if (inviteError) {
      const msg = inviteError.message || "Não foi possível enviar o convite";
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invitedUser = inviteData?.user;
    if (!invitedUser?.id) {
      return new Response(JSON.stringify({ error: "Convite enviado, mas não foi possível vincular às empresas" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sb.from("users").upsert(
      {
        id: invitedUser.id,
        email: invitedUser.email ?? email,
        name: invitedUser.user_metadata?.name ?? null,
        avatar_url: invitedUser.user_metadata?.avatar_url ?? null,
      },
      { onConflict: "id" }
    );

    const rows = companyIds.map((company_id: string) => ({
      user_id: invitedUser.id,
      company_id,
    }));
    const { error: linkError } = await sb.from("user_companies").insert(rows);
    if (linkError) {
      return new Response(
        JSON.stringify({
          error: "Convite enviado, mas falha ao vincular às empresas: " + linkError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        user_id: invitedUser.id,
        message: "Convite enviado. O usuário foi vinculado às empresas selecionadas.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
