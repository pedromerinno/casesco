import { supabase } from "@/lib/supabase/client";
import { toPublicObjectUrl } from "./queries";

export type MediaItem = {
  id: string;
  url: string;
  type: "image" | "video";
  title: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  mux_status: "waiting" | "preparing" | "ready" | "errored" | null;
};

export async function getMediaLibrary(
  companyId: string,
  filter?: "image" | "video",
): Promise<MediaItem[]> {
  let query = supabase
    .from("media_library")
    .select("id,url,type,title,storage_bucket,storage_path,mime_type,size_bytes,created_at,mux_asset_id,mux_playback_id,mux_status")
    .eq("owner_company_id", companyId)
    .order("created_at", { ascending: false });

  if (filter) {
    query = query.eq("type", filter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as MediaItem[]) ?? [];
}

export async function uploadToMediaLibrary(companyId: string, file: File): Promise<MediaItem> {
  const safeName = file.name
    .replace(/[^a-z0-9.\-_]/gi, "-")
    .toLowerCase();
  const path = `library/${Date.now()}-${safeName}`;
  const bucket = "case-covers";

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw new Error(uploadError.message);

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  const publicUrl = toPublicObjectUrl(urlData.publicUrl, bucket);

  const mediaType: "image" | "video" = file.type.startsWith("video/")
    ? "video"
    : "image";

  const { data: row, error: insertError } = await supabase
    .from("media_library")
    .insert({
      owner_company_id: companyId,
      url: publicUrl,
      title: file.name,
      type: mediaType,
      storage_bucket: bucket,
      storage_path: path,
      mime_type: file.type || null,
      size_bytes: file.size || null,
    })
    .select("id,url,type,title,storage_bucket,storage_path,mime_type,size_bytes,created_at,mux_asset_id,mux_playback_id,mux_status")
    .single();

  if (insertError) throw new Error(insertError.message);
  return row as MediaItem;
}

export async function createMuxUpload(companyId: string, file: File): Promise<{
  uploadUrl: string;
  mediaId: string;
}> {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error("Você precisa estar logado para enviar vídeos.");
  }

  const { data, error } = await supabase.functions.invoke("mux-upload", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: {
      owner_company_id: companyId,
      title: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    },
  });
  if (error) throw new Error(error.message);
  return { uploadUrl: data.upload_url, mediaId: data.media_id };
}

export async function syncMuxMedia(mediaId: string): Promise<void> {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const token = sessionData.session?.access_token;
  if (!token) return;

  const { error } = await supabase.functions.invoke("mux-sync", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: { media_id: mediaId },
  });

  // Best-effort: this is just a safety net for stuck uploads.
  if (error) {
    console.warn("mux-sync failed", error);
  }
}

export async function getMediaItem(id: string): Promise<MediaItem> {
  const { data, error } = await supabase
    .from("media_library")
    .select("id,url,type,title,storage_bucket,storage_path,mime_type,size_bytes,created_at,mux_asset_id,mux_playback_id,mux_status")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as MediaItem;
}

export async function deleteFromMediaLibrary(id: string): Promise<void> {
  const { error } = await supabase
    .from("media_library")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
