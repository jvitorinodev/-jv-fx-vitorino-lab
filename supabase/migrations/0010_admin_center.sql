-- JV FX · Vitorino LAB — v0.9.0
-- Central Administrativa: usuários, funções, status, atividade e auditoria.

alter table public.profiles
  add column if not exists account_status text not null default 'ACTIVE'
    check (account_status in ('ACTIVE','SUSPENDED')),
  add column if not exists status_reason text,
  add column if not exists status_updated_at timestamptz,
  add column if not exists status_updated_by uuid references auth.users(id) on delete set null;

-- Garante profile para usuários eventualmente criados antes do trigger de bootstrap.
insert into public.profiles (id, display_name)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', split_part(coalesce(u.email,''), '@', 1))
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- Resolve a permissão efetiva do usuário autenticado, incluindo overrides.
create or replace function public.admin_has_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select
    exists (
      select 1
      from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      where ur.user_id = auth.uid()
        and rp.permission_key = required_permission
        and not exists (
          select 1
          from public.user_permission_overrides o
          where o.user_id = auth.uid()
            and o.permission_key = required_permission
            and o.allowed = false
        )
    )
    or exists (
      select 1
      from public.user_permission_overrides o
      where o.user_id = auth.uid()
        and o.permission_key = required_permission
        and o.allowed = true
    );
$$;

revoke all on function public.admin_has_permission(text) from public;

create or replace function public.admin_assert_permission(required_permission text)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is null or not public.admin_has_permission(required_permission) then
    raise exception 'Acesso administrativo negado.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.admin_assert_permission(text) from public;

-- O status passa a fazer parte da resolução central de acesso.
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
    select coalesce(p.account_status, 'ACTIVE') as account_status
    from public.profiles p
    where p.id = auth.uid()
  )
  select jsonb_build_object(
    'role', coalesce((select key from primary_role), 'FREE'),
    'status', coalesce((select account_status from profile_status), 'ACTIVE'),
    'permissions', case
      when coalesce((select account_status from profile_status), 'ACTIVE') = 'SUSPENDED' then '[]'::jsonb
      else coalesce((select jsonb_agg(permission_key order by permission_key) from effective_permissions), '[]'::jsonb)
    end
  );
$$;

grant execute on function public.get_my_access() to authenticated;

create or replace function public.admin_list_users(search_term text default null)
returns table (
  id uuid,
  email text,
  display_name text,
  role_key text,
  account_status text,
  timezone text,
  preferred_currency text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  permission_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.admin_assert_permission('admin.users');

  return query
  select
    u.id,
    coalesce(u.email, '')::text,
    coalesce(p.display_name, split_part(coalesce(u.email,''), '@', 1), 'Usuário')::text,
    coalesce((
      select r.key
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = u.id
      order by case r.key when 'ADMIN' then 3 when 'TRADER' then 2 else 1 end desc
      limit 1
    ), 'FREE')::text,
    coalesce(p.account_status, 'ACTIVE')::text,
    coalesce(p.timezone, 'America/Sao_Paulo')::text,
    coalesce(p.preferred_currency, 'USD')::text,
    u.created_at,
    u.last_sign_in_at,
    coalesce((
      select count(*)::bigint
      from (
        select distinct rp.permission_key
        from public.user_roles ur2
        join public.role_permissions rp on rp.role_id = ur2.role_id
        where ur2.user_id = u.id
          and not exists (
            select 1 from public.user_permission_overrides deny
            where deny.user_id = u.id
              and deny.permission_key = rp.permission_key
              and deny.allowed = false
          )
        union
        select allow_override.permission_key
        from public.user_permission_overrides allow_override
        where allow_override.user_id = u.id and allow_override.allowed = true
      ) effective
    ), 0)::bigint
  from auth.users u
  left join public.profiles p on p.id = u.id
  where search_term is null
     or btrim(search_term) = ''
     or coalesce(u.email, '') ilike '%' || search_term || '%'
     or coalesce(p.display_name, '') ilike '%' || search_term || '%'
  order by u.created_at desc;
end;
$$;

revoke all on function public.admin_list_users(text) from public;
grant execute on function public.admin_list_users(text) to authenticated;

create or replace function public.admin_get_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  result jsonb;
begin
  perform public.admin_assert_permission('admin.access');

  select jsonb_build_object(
    'total_users', (select count(*) from auth.users),
    'active_users_30d', (
      select count(*) from auth.users u
      left join public.profiles p on p.id = u.id
      where coalesce(p.account_status, 'ACTIVE') = 'ACTIVE'
        and u.last_sign_in_at >= now() - interval '30 days'
    ),
    'new_users_30d', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
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

create or replace function public.admin_list_audit_logs(limit_count integer default 100)
returns table (
  id bigint,
  actor_user_id uuid,
  actor_display_name text,
  actor_email text,
  action text,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.admin_assert_permission('admin.audit');
  return query
  select
    l.id,
    l.actor_user_id,
    coalesce(p.display_name, split_part(coalesce(u.email,''), '@', 1), 'Sistema')::text,
    coalesce(u.email, '')::text,
    l.action,
    l.target_type,
    l.target_id,
    l.metadata,
    l.created_at
  from public.admin_logs l
  left join auth.users u on u.id = l.actor_user_id
  left join public.profiles p on p.id = l.actor_user_id
  order by l.created_at desc
  limit greatest(1, least(coalesce(limit_count, 100), 500));
end;
$$;

revoke all on function public.admin_list_audit_logs(integer) from public;
grant execute on function public.admin_list_audit_logs(integer) to authenticated;

create or replace function public.admin_set_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  role_id_value uuid;
  old_role text;
  target_email text;
begin
  perform public.admin_assert_permission('admin.users');

  if new_role not in ('FREE','TRADER','ADMIN') then
    raise exception 'Função inválida.' using errcode = '22023';
  end if;

  if target_user_id = auth.uid() and new_role <> 'ADMIN' then
    raise exception 'O administrador atual não pode remover a própria função ADMIN.' using errcode = '42501';
  end if;

  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'Usuário não encontrado.' using errcode = 'P0002';
  end if;

  select r.key into old_role
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = target_user_id
  order by case r.key when 'ADMIN' then 3 when 'TRADER' then 2 else 1 end desc
  limit 1;

  select id into role_id_value from public.roles where key = new_role;
  if role_id_value is null then raise exception 'Função não cadastrada.'; end if;

  delete from public.user_roles where user_id = target_user_id;
  insert into public.user_roles (user_id, role_id) values (target_user_id, role_id_value);

  select email into target_email from auth.users where id = target_user_id;
  insert into public.admin_logs (actor_user_id, action, target_type, target_id, metadata)
  values (
    auth.uid(), 'USER_ROLE_CHANGED', 'USER', target_user_id::text,
    jsonb_build_object('oldRole', coalesce(old_role,'FREE'), 'newRole', new_role, 'targetEmail', coalesce(target_email,''))
  );
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text) from public;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

create or replace function public.admin_set_user_status(target_user_id uuid, new_status text, reason_input text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  old_status text;
  target_email text;
begin
  perform public.admin_assert_permission('admin.users');

  if new_status not in ('ACTIVE','SUSPENDED') then
    raise exception 'Status inválido.' using errcode = '22023';
  end if;

  if target_user_id = auth.uid() and new_status = 'SUSPENDED' then
    raise exception 'O administrador atual não pode suspender a própria conta.' using errcode = '42501';
  end if;

  select coalesce(account_status, 'ACTIVE') into old_status from public.profiles where id = target_user_id;
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
    auth.uid(), 'USER_STATUS_CHANGED', 'USER', target_user_id::text,
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
