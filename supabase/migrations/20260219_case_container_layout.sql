-- Padding geral da página (em px) e borda arredondada dos containers (em px)
alter table public.cases
  add column if not exists container_padding integer default 24,
  add column if not exists container_radius integer default 12;

comment on column public.cases.container_padding is 'Padding geral da página em pixels (aplicado ao redor dos containers)';
comment on column public.cases.container_radius is 'Border radius dos containers em pixels';
