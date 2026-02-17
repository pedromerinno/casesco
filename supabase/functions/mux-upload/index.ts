import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MUX_TOKEN_ID = Deno.env.get("MUX_TOKEN_ID")!;
const MUX_TOKEN_SECRET = Deno.env.get("MUX_TOKEN_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const muxAuth = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { owner_company_id, title, mime_type, size_bytes } = await req.json();

    // Create Mux Direct Upload
    const muxRes = await fetch("https://api.mux.com/video/v1/uploads", {
      method: "POST",
      headers: {
        Authorization: `Basic ${muxAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        new_asset_settings: {
          playback_policy: ["public"],
          encoding_tier: "baseline",
        },
        cors_origin: "*",
      }),
    });

    if (!muxRes.ok) {
      const err = await muxRes.text();
      throw new Error(`Mux API error: ${err}`);
    }

    const { data: upload } = await muxRes.json();

    // Insert row in media_library
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: row, error: insertError } = await sb
      .from("media_library")
      .insert({
        owner_company_id,
        url: "",
        title: title || "video",
        type: "video",
        mime_type: mime_type || null,
        size_bytes: size_bytes || null,
        mux_asset_id: upload.id,
        mux_status: "waiting",
      })
      .select("id")
      .single();

    if (insertError) throw new Error(insertError.message);

    return new Response(
      JSON.stringify({
        upload_url: upload.url,
        upload_id: upload.id,
        media_id: row.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
