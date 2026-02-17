alter table public.cases
  add column if not exists cover_video_url text,
  add column if not exists cover_mux_playback_id text;
