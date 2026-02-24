alter table public.cases
  add column if not exists sort_order integer;
