-- Super-admins: INSERT e DELETE em user_companies (vincular/desvincular usuários a empresas)
drop policy if exists "Super-admins insert user_companies" on public.user_companies;
create policy "Super-admins insert user_companies"
  on public.user_companies for insert
  with check (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));

drop policy if exists "Super-admins delete user_companies" on public.user_companies;
create policy "Super-admins delete user_companies"
  on public.user_companies for delete
  using (exists (select 1 from public.admin_users where admin_users.user_id = auth.uid()));

-- Sync auth.users → public.users ao criar conta (convite ou signup)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(excluded.name, public.users.name),
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url);
  return new;
end;
$$;

-- Só cria o trigger se não existir (auth.users é do schema auth)
do $$
begin
  if not exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth' and c.relname = 'users' and t.tgname = 'on_auth_user_created'
  ) then
    execute 'create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user()';
  end if;
end;
$$;
