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
      return new Response(JSON.stringify({ error: "Apenas super-admins podem criar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const name = typeof body?.name === "string" ? body.name.trim() || null : null;
    const companyIds = Array.isArray(body?.company_ids)
      ? body.company_ids.filter((id: unknown) => typeof id === "string")
      : [];

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "E-mail inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "A senha deve ter no mínimo 6 caracteres" }), {
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

    const { data: createData, error: createError } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: name ? { name } : undefined,
    });

    if (createError) {
      const msg = createError.message || "Não foi possível criar o usuário";
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUser = createData?.user;
    if (!newUser?.id) {
      return new Response(JSON.stringify({ error: "Usuário criado, mas não foi possível vincular às empresas" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sb.from("users").upsert(
      {
        id: newUser.id,
        email: newUser.email ?? email,
        name: name ?? newUser.user_metadata?.name ?? null,
        avatar_url: newUser.user_metadata?.avatar_url ?? null,
      },
      { onConflict: "id" }
    );

    const rows = companyIds.map((company_id: string) => ({
      user_id: newUser.id,
      company_id,
    }));
    const { error: linkError } = await sb.from("user_companies").insert(rows);
    if (linkError) {
      return new Response(
        JSON.stringify({
          error: "Usuário criado, mas falha ao vincular às empresas: " + linkError.message,
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
        user_id: newUser.id,
        message: "Usuário criado e vinculado às empresas selecionadas.",
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
