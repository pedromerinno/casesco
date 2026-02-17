-- 1. Tabela de perfis (espelha auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 2. Tabela junction user ↔ company
create table if not exists public.user_companies (
  user_id uuid not null references public.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

-- 3. Índices
create index if not exists idx_user_companies_user on public.user_companies(user_id);
create index if not exists idx_user_companies_company on public.user_companies(company_id);

-- 4. RLS em user_companies
alter table public.user_companies enable row level security;

create policy "Users read own assignments"
  on public.user_companies for select
  using (auth.uid() = user_id);

create policy "Super-admins read all assignments"
  on public.user_companies for select
  using (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));

-- 5. RLS em users
alter table public.users enable row level security;

create policy "Users read own profile"
  on public.users for select using (auth.uid() = id);

create policy "Super-admins read all profiles"
  on public.users for select
  using (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));
