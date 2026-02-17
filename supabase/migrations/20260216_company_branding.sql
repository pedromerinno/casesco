alter table public.companies
  add column if not exists logo_url text,
  add column if not exists brand_color text; -- hex: "#9D00F2"
