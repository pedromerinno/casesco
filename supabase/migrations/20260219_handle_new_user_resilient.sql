-- Trigger que sincroniza auth.users → public.users não deve falhar a criação no Auth.
-- Se o insert em public.users falhar, apenas registramos e deixamos o fluxo (ex.: Edge Function) fazer o upsert depois.
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
exception
  when others then
    -- Não falha a criação em auth.users; outro fluxo (ex.: Edge Function) pode fazer o sync.
    return new;
end;
$$;
