-- Adds configurable background media (image/video) for the "Positioning" section.
-- Run in Supabase SQL Editor (project: MNNO).

alter table public.companies
  add column if not exists positioning_media_type text
    check (positioning_media_type in ('image', 'video')),
  add column if not exists positioning_media_url text,
  add column if not exists positioning_media_poster_url text;

-- Optional: defaults (keep null-safe for existing rows)
-- update public.companies set positioning_media_type = 'image'
-- where positioning_media_type is null;

