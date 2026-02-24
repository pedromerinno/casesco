-- ============================================================
-- RLS policies para tabelas de conteúdo
-- Permite que usuários regulares (via user_companies) façam
-- SELECT/INSERT/UPDATE/DELETE nos dados da sua empresa.
-- Super-admins (via admin_users) têm acesso total.
-- Visitantes anônimos podem ver cases publicados.
-- ============================================================

-- ── Helper: funções reutilizáveis ───────────────────────────
create or replace function public.user_belongs_to_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_companies
    where user_id = auth.uid() and company_id = p_company_id
  )
  or exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

create or replace function public.user_belongs_to_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_companies uc
    join public.companies c on c.id = uc.company_id
    where uc.user_id = auth.uid() and c.group_id = p_group_id
  )
  or exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

-- ══════════════════════════════════════════════════════════════
-- cases
-- ══════════════════════════════════════════════════════════════
alter table public.cases enable row level security;

drop policy if exists "cases: public read published" on public.cases;
create policy "cases: public read published"
  on public.cases for select
  using (status = 'published' and published_at is not null);

drop policy if exists "cases: select for company members" on public.cases;
create policy "cases: select for company members"
  on public.cases for select
  using (public.user_belongs_to_company(owner_company_id));

drop policy if exists "cases: insert for company members" on public.cases;
create policy "cases: insert for company members"
  on public.cases for insert
  with check (public.user_belongs_to_company(owner_company_id));

drop policy if exists "cases: update for company members" on public.cases;
create policy "cases: update for company members"
  on public.cases for update
  using (public.user_belongs_to_company(owner_company_id))
  with check (public.user_belongs_to_company(owner_company_id));

drop policy if exists "cases: delete for company members" on public.cases;
create policy "cases: delete for company members"
  on public.cases for delete
  using (public.user_belongs_to_company(owner_company_id));

-- ══════════════════════════════════════════════════════════════
-- media_library
-- ══════════════════════════════════════════════════════════════
alter table public.media_library enable row level security;

drop policy if exists "media_library: select for company members" on public.media_library;
create policy "media_library: select for company members"
  on public.media_library for select
  using (public.user_belongs_to_company(owner_company_id));

drop policy if exists "media_library: insert for company members" on public.media_library;
create policy "media_library: insert for company members"
  on public.media_library for insert
  with check (public.user_belongs_to_company(owner_company_id));

drop policy if exists "media_library: update for company members" on public.media_library;
create policy "media_library: update for company members"
  on public.media_library for update
  using (public.user_belongs_to_company(owner_company_id))
  with check (public.user_belongs_to_company(owner_company_id));

drop policy if exists "media_library: delete for company members" on public.media_library;
create policy "media_library: delete for company members"
  on public.media_library for delete
  using (public.user_belongs_to_company(owner_company_id));

-- ══════════════════════════════════════════════════════════════
-- clients
-- ══════════════════════════════════════════════════════════════
alter table public.clients enable row level security;

drop policy if exists "clients: select for group members" on public.clients;
create policy "clients: select for group members"
  on public.clients for select
  using (public.user_belongs_to_group(group_id));

drop policy if exists "clients: insert for group members" on public.clients;
create policy "clients: insert for group members"
  on public.clients for insert
  with check (public.user_belongs_to_group(group_id));

drop policy if exists "clients: update for group members" on public.clients;
create policy "clients: update for group members"
  on public.clients for update
  using (public.user_belongs_to_group(group_id))
  with check (public.user_belongs_to_group(group_id));

drop policy if exists "clients: delete for group members" on public.clients;
create policy "clients: delete for group members"
  on public.clients for delete
  using (public.user_belongs_to_group(group_id));

-- ══════════════════════════════════════════════════════════════
-- case_blocks
-- ══════════════════════════════════════════════════════════════
alter table public.case_blocks enable row level security;

drop policy if exists "case_blocks: public read via published case" on public.case_blocks;
create policy "case_blocks: public read via published case"
  on public.case_blocks for select
  using (exists (
    select 1 from public.cases
    where cases.id = case_blocks.case_id
      and cases.status = 'published'
      and cases.published_at is not null
  ));

drop policy if exists "case_blocks: select via case ownership" on public.case_blocks;
create policy "case_blocks: select via case ownership"
  on public.case_blocks for select
  using (exists (
    select 1 from public.cases
    where cases.id = case_blocks.case_id
      and public.user_belongs_to_company(cases.owner_company_id)
  ));

drop policy if exists "case_blocks: insert via case ownership" on public.case_blocks;
create policy "case_blocks: insert via case ownership"
  on public.case_blocks for insert
  with check (exists (
    select 1 from public.cases
    where cases.id = case_blocks.case_id
      and public.user_belongs_to_company(cases.owner_company_id)
  ));

drop policy if exists "case_blocks: update via case ownership" on public.case_blocks;
create policy "case_blocks: update via case ownership"
  on public.case_blocks for update
  using (exists (
    select 1 from public.cases
    where cases.id = case_blocks.case_id
      and public.user_belongs_to_company(cases.owner_company_id)
  ))
  with check (exists (
    select 1 from public.cases
    where cases.id = case_blocks.case_id
      and public.user_belongs_to_company(cases.owner_company_id)
  ));

drop policy if exists "case_blocks: delete via case ownership" on public.case_blocks;
create policy "case_blocks: delete via case ownership"
  on public.case_blocks for delete
  using (exists (
    select 1 from public.cases
    where cases.id = case_blocks.case_id
      and public.user_belongs_to_company(cases.owner_company_id)
  ));

-- ══════════════════════════════════════════════════════════════
-- case_media
-- ══════════════════════════════════════════════════════════════
alter table public.case_media enable row level security;

drop policy if exists "case_media: public read via published case" on public.case_media;
create policy "case_media: public read via published case"
  on public.case_media for select
  using (exists (
    select 1 from public.cases
    where cases.id = case_media.case_id
      and cases.status = 'published'
      and cases.published_at is not null
  ));

drop policy if exists "case_media: select via case ownership" on public.case_media;
create policy "case_media: select via case ownership"
  on public.case_media for select
  using (exists (
    select 1 from public.cases
    where cases.id = case_media.case_id
      and public.user_belongs_to_company(cases.owner_company_id)
  ));

drop policy if exists "case_media: insert via case ownership" on public.case_media;
create policy "case_media: insert via case ownership"
  on public.case_media for insert
  with check (exists (
    select 1 from public.cases
    where cases.id = case_media.case_id
      and public.user_belongs_to_company(cases.owner_company_id)
  ));

drop policy if exists "case_media: update via case ownership" on public.case_media;
create policy "case_media: update via case ownership"
  on public.case_media for update
  using (exists (
    select 1 from public.cases
    where cases.id = case_media.case_id
      and public.user_belongs_to_company(cases.owner_company_id)
  ))
  with check (exists (
    select 1 from public.cases
    where cases.id = case_media.case_id
      and public.user_belongs_to_company(cases.owner_company_id)
  ));

drop policy if exists "case_media: delete via case ownership" on public.case_media;
create policy "case_media: delete via case ownership"
  on public.case_media for delete
  using (exists (
    select 1 from public.cases
    where cases.id = case_media.case_id
      and public.user_belongs_to_company(cases.owner_company_id)
  ));

-- ══════════════════════════════════════════════════════════════
-- case_categories
-- ══════════════════════════════════════════════════════════════
alter table public.case_categories enable row level security;

drop policy if exists "case_categories: public read" on public.case_categories;
create policy "case_categories: public read"
  on public.case_categories for select
  using (true);

drop policy if exists "case_categories: insert for group members" on public.case_categories;
create policy "case_categories: insert for group members"
  on public.case_categories for insert
  with check (public.user_belongs_to_group(group_id));

drop policy if exists "case_categories: update for group members" on public.case_categories;
create policy "case_categories: update for group members"
  on public.case_categories for update
  using (public.user_belongs_to_group(group_id))
  with check (public.user_belongs_to_group(group_id));

drop policy if exists "case_categories: delete for group members" on public.case_categories;
create policy "case_categories: delete for group members"
  on public.case_categories for delete
  using (public.user_belongs_to_group(group_id));

-- ══════════════════════════════════════════════════════════════
-- case_category_cases (junction)
-- ══════════════════════════════════════════════════════════════
alter table public.case_category_cases enable row level security;

drop policy if exists "case_category_cases: public read via published case" on public.case_category_cases;
create policy "case_category_cases: public read via published case"
  on public.case_category_cases for select
  using (exists (
    select 1 from public.cases
    where cases.id = case_category_cases.case_id
      and cases.status = 'published'
      and cases.published_at is not null
  ));

drop policy if exists "case_category_cases: select via case ownership" on public.case_category_cases;
create policy "case_category_cases: select via case ownership"
  on public.case_category_cases for select
  using (exists (
    select 1 from public.cases
    where cases.id = case_category_cases.case_id
      and public.user_belongs_to_company(cases.owner_company_id)
  ));

drop policy if exists "case_category_cases: insert via case ownership" on public.case_category_cases;
create policy "case_category_cases: insert via case ownership"
  on public.case_category_cases for insert
  with check (exists (
    select 1 from public.cases
    where cases.id = case_category_cases.case_id
      and public.user_belongs_to_company(cases.owner_company_id)
  ));

drop policy if exists "case_category_cases: delete via case ownership" on public.case_category_cases;
create policy "case_category_cases: delete via case ownership"
  on public.case_category_cases for delete
  using (exists (
    select 1 from public.cases
    where cases.id = case_category_cases.case_id
      and public.user_belongs_to_company(cases.owner_company_id)
  ));

-- ══════════════════════════════════════════════════════════════
-- companies
-- ══════════════════════════════════════════════════════════════
alter table public.companies enable row level security;

drop policy if exists "companies: select for members" on public.companies;
create policy "companies: select for members"
  on public.companies for select
  using (
    exists (
      select 1 from public.user_companies
      where user_id = auth.uid() and company_id = companies.id
    )
    or exists (
      select 1 from public.admin_users
      where user_id = auth.uid()
    )
  );

drop policy if exists "companies: update for members" on public.companies;
create policy "companies: update for members"
  on public.companies for update
  using (
    exists (
      select 1 from public.user_companies
      where user_id = auth.uid() and company_id = companies.id
    )
    or exists (
      select 1 from public.admin_users
      where user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_companies
      where user_id = auth.uid() and company_id = companies.id
    )
    or exists (
      select 1 from public.admin_users
      where user_id = auth.uid()
    )
  );
