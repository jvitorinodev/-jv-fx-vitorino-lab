-- JV FX · Vitorino LAB — v1.0.0
-- Consolidação da primeira geração: remove escopos descontinuados e preserva usuários existentes.

-- Se uma instalação anterior tiver usuários na função VIP, eles passam para TRADER.
do $$
declare
  vip_role_id uuid;
  trader_role_id uuid;
begin
  select id into vip_role_id from public.roles where key = 'VIP';
  select id into trader_role_id from public.roles where key = 'TRADER';

  if vip_role_id is not null and trader_role_id is not null then
    insert into public.user_roles (user_id, role_id)
    select user_id, trader_role_id
    from public.user_roles
    where role_id = vip_role_id
    on conflict do nothing;

    delete from public.user_roles where role_id = vip_role_id;
  end if;
end $$;

-- Remove estruturas e permissões que saíram do escopo da v1.0.
drop table if exists public.smt_observations cascade;
drop table if exists public.smt_pairs cascade;

delete from public.user_permission_overrides
where permission_key in ('smt.view','vip.view','admin.vip','admin.permissions','settings.view');

delete from public.role_permissions
where permission_key in ('smt.view','vip.view','admin.vip','admin.permissions','settings.view');

delete from public.permissions
where key in ('smt.view','vip.view','admin.vip','admin.permissions','settings.view');

delete from public.price_zone_confluences where confluence_key = 'smt';
delete from public.user_confluence_weights where confluence_key = 'smt';
delete from public.trade_confluences where confluence_key = 'smt';
delete from public.confluences where key = 'smt';
delete from public.roles where key = 'VIP';

alter table public.roles drop constraint if exists roles_key_check;
alter table public.roles
  add constraint roles_key_check check (key in ('FREE','TRADER','ADMIN'));
