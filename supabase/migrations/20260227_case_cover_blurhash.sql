-- Blurhash da capa do case (gerado no upload para placeholder/loading)
alter table public.cases
  add column if not exists cover_blurhash text;

comment on column public.cases.cover_blurhash is 'BlurHash da imagem de capa (gerado no upload).';
