import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MUX_TOKEN_ID = Deno.env.get("MUX_TOKEN_ID")!;
const MUX_TOKEN_SECRET = Deno.env.get("MUX_TOKEN_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const muxAuth = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SyncRequest = {
  media_id?: string;
  upload_id?: string;
};

async function muxGet(path: string) {
  const res = await fetch(`https://api.mux.com${path}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${muxAuth}`,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Mux API error (${res.status}): ${text}`);
  }
  return JSON.parse(text) as any;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { media_id, upload_id } = (await req.json()) as SyncRequest;
    if (!media_id && !upload_id) {
      return new Response(JSON.stringify({ error: "missing media_id/upload_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let mediaRow:
      | { id: string; mux_asset_id: string | null; mux_playback_id: string | null }
      | null = null;

    if (media_id) {
      const { data, error } = await sb
        .from("media_library")
        .select("id,mux_asset_id,mux_playback_id")
        .eq("id", media_id)
        .single();
      if (error) throw new Error(error.message);
      mediaRow = data as any;
    }

    const currentId = upload_id ?? mediaRow?.mux_asset_id ?? null;
    if (!currentId) {
      return new Response(JSON.stringify({ error: "missing mux_asset_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Try treating it as a Direct Upload ID.
    let assetId: string | null = null;
    try {
      const uploadJson = await muxGet(`/video/v1/uploads/${currentId}`);
      assetId = uploadJson?.data?.asset_id ?? null;
      if (!assetId) {
        return new Response(JSON.stringify({ ok: true, status: "waiting" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (media_id) {
        await sb
          .from("media_library")
          .update({ mux_asset_id: assetId, mux_status: "preparing" })
          .eq("id", media_id);
      }
    } catch {
      // Not an upload id (likely already an asset id) — proceed.
      assetId = currentId;
    }

    // 2) Fetch asset status & playback id.
    const assetJson = await muxGet(`/video/v1/assets/${assetId}`);
    const status = assetJson?.data?.status ?? null;
    const playbackId = assetJson?.data?.playback_ids?.[0]?.id ?? null;

    if (media_id) {
      if (status === "ready") {
        await sb
          .from("media_library")
          .update({
            mux_playback_id: playbackId,
            mux_status: "ready",
            url: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : "",
          })
          .eq("id", media_id);
      } else if (status === "errored") {
        await sb
          .from("media_library")
          .update({ mux_status: "errored" })
          .eq("id", media_id);
      } else {
        await sb
          .from("media_library")
          .update({ mux_status: "preparing" })
          .eq("id", media_id);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        status,
        asset_id: assetId,
        playback_id: playbackId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("mux-sync error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

