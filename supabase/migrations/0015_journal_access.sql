-- JV FX · Vitorino LAB v1.2.2 — Journal avançado + acesso sob aprovação

alter table public.trades
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists quick_note text not null default '';

create index if not exists trades_tags_gin_idx on public.trades using gin(tags);

-- Expande o ciclo de acesso para permitir cadastro público com aprovação do CEO.
alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('PENDING','ACTIVE','SUSPENDED'));

-- Novos cadastros entram como PENDING. Usuários já existentes permanecem inalterados.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, account_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''), '@', 1)),
    'PENDING'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role_id)
  select new.id, id from public.roles where key = 'FREE'
  on conflict do nothing;
  return new;
end;
$$;

-- PENDING e SUSPENDED não recebem permissões efetivas.
create or replace function public.get_my_access()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  with base_permissions as (
    select distinct rp.permission_key
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    where ur.user_id = auth.uid()
  ), effective_permissions as (
    select p.permission_key
    from base_permissions p
    where not exists (
      select 1 from public.user_permission_overrides o
      where o.user_id = auth.uid()
        and o.permission_key = p.permission_key
        and o.allowed = false
    )
    union
    select o.permission_key
    from public.user_permission_overrides o
    where o.user_id = auth.uid() and o.allowed = true
  ), primary_role as (
    select r.key
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
    order by case r.key when 'ADMIN' then 3 when 'TRADER' then 2 else 1 end desc
    limit 1
  ), profile_status as (
    select coalesce(p.account_status, 'PENDING') as account_status
    from public.profiles p
    where p.id = auth.uid()
  )
  select jsonb_build_object(
    'role', coalesce((select key from primary_role), 'FREE'),
    'status', coalesce((select account_status from profile_status), 'PENDING'),
    'permissions', case
      when coalesce((select account_status from profile_status), 'PENDING') <> 'ACTIVE' then '[]'::jsonb
      else coalesce((select jsonb_agg(permission_key order by permission_key) from effective_permissions), '[]'::jsonb)
    end
  );
$$;

grant execute on function public.get_my_access() to authenticated;

create or replace function public.admin_get_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare result jsonb;
begin
  perform public.admin_assert_permission('admin.access');
  select jsonb_build_object(
    'total_users', (select count(*) from auth.users),
    'active_users_30d', (
      select count(*) from auth.users u
      left join public.profiles p on p.id = u.id
      where coalesce(p.account_status, 'PENDING') = 'ACTIVE'
        and u.last_sign_in_at >= now() - interval '30 days'
    ),
    'new_users_30d', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
    'pending_users', (select count(*) from public.profiles where account_status = 'PENDING'),
    'suspended_users', (select count(*) from public.profiles where account_status = 'SUSPENDED'),
    'admin_users', (
      select count(distinct ur.user_id)
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where r.key = 'ADMIN'
    ),
    'audit_events_24h', (select count(*) from public.admin_logs where created_at >= now() - interval '24 hours')
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_get_dashboard_stats() from public;
grant execute on function public.admin_get_dashboard_stats() to authenticated;

create or replace function public.admin_set_user_status(target_user_id uuid, new_status text, reason_input text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare old_status text; target_email text;
begin
  perform public.admin_assert_permission('admin.users');
  if new_status not in ('PENDING','ACTIVE','SUSPENDED') then
    raise exception 'Status inválido.' using errcode = '22023';
  end if;
  if target_user_id = auth.uid() and new_status <> 'ACTIVE' then
    raise exception 'O administrador atual não pode bloquear a própria conta.' using errcode = '42501';
  end if;

  select coalesce(account_status, 'PENDING') into old_status from public.profiles where id = target_user_id;
  if old_status is null then raise exception 'Usuário não encontrado.' using errcode = 'P0002'; end if;

  update public.profiles
  set account_status = new_status,
      status_reason = nullif(btrim(reason_input), ''),
      status_updated_at = now(),
      status_updated_by = auth.uid(),
      updated_at = now()
  where id = target_user_id;

  select email into target_email from auth.users where id = target_user_id;
  insert into public.admin_logs (actor_user_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    case when old_status = 'PENDING' and new_status = 'ACTIVE' then 'USER_APPROVED' else 'USER_STATUS_CHANGED' end,
    'USER', target_user_id::text,
    jsonb_build_object(
      'oldStatus', old_status,
      'newStatus', new_status,
      'reason', nullif(btrim(reason_input), ''),
      'targetEmail', coalesce(target_email,'')
    )
  );
end;
$$;

revoke all on function public.admin_set_user_status(uuid, text, text) from public;
grant execute on function public.admin_set_user_status(uuid, text, text) to authenticated;
