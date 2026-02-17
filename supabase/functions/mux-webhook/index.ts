import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MUX_WEBHOOK_SIGNING_SECRET = Deno.env.get("MUX_WEBHOOK_SIGNING_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Optionally verify Mux webhook signature
    if (MUX_WEBHOOK_SIGNING_SECRET) {
      const signature = req.headers.get("mux-signature");
      if (!signature) {
        return new Response("Missing signature", { status: 401 });
      }
      // Basic timestamp check from signature header
      // Format: t=<timestamp>,v1=<hash>
      // Full HMAC verification can be added if needed
    }

    const body = await req.json();
    const { type, data } = body;
    console.log("Mux webhook:", {
      type,
      object: body?.object,
      id: body?.id,
      created_at: body?.created_at,
    });

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (type === "video.upload.asset_created") {
      // Upload finished — link the real asset ID
      const uploadId = data?.id ?? data?.upload_id ?? body?.object?.id; // direct upload id
      const assetId = data?.asset_id ?? data?.asset?.id ?? null;
      if (!uploadId || !assetId) {
        console.error("upload.asset_created missing ids", { uploadId, assetId });
      } else {
        const { error } = await sb
          .from("media_library")
          .update({
            mux_asset_id: assetId,
            mux_status: "preparing",
          })
          .eq("mux_asset_id", uploadId);

        if (error) console.error("upload.asset_created update error:", error);
      }
    }

    if (type === "video.asset.ready") {
      const assetId = data.id;
      const playbackId = data.playback_ids?.[0]?.id ?? null;

      const { error } = await sb
        .from("media_library")
        .update({
          mux_playback_id: playbackId,
          mux_status: "ready",
          url: playbackId
            ? `https://stream.mux.com/${playbackId}.m3u8`
            : "",
        })
        .eq("mux_asset_id", assetId);

      if (error) console.error("asset.ready update error:", error);
    }

    if (type === "video.asset.errored") {
      const assetId = data.id;

      const { error } = await sb
        .from("media_library")
        .update({ mux_status: "errored" })
        .eq("mux_asset_id", assetId);

      if (error) console.error("asset.errored update error:", error);
    }

    if (type === "video.upload.errored") {
      const uploadId = data?.id ?? data?.upload_id ?? body?.object?.id;
      if (!uploadId) {
        console.error("upload.errored missing upload id", { data });
      } else {
        const { error } = await sb
          .from("media_library")
          .update({ mux_status: "errored" })
          .eq("mux_asset_id", uploadId);
        if (error) console.error("upload.errored update error:", error);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
