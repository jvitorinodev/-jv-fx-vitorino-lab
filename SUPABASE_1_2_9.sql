-- JV FX · Vitorino LAB v1.2.8
-- Execute este arquivo UMA VEZ no SQL Editor do Supabase.
-- Ele adiciona conta principal, corrige vínculo Demo/Real antigo e impede um mesmo login MT5 em duas contas.

alter table public.trading_accounts
  add column if not exists is_primary boolean not null default false;

do $$
declare
  r record;
  demo_id uuid;
begin
  for r in
    select id, user_id, broker_account_login, broker_server, current_balance, current_equity, last_synced_at
    from public.trading_accounts
    where account_type <> 'DEMO'
      and broker_account_login is not null
      and (
        lower(coalesce(broker_server, '')) like '%trial%'
        or lower(coalesce(broker_server, '')) like '%demo%'
      )
  loop
    select id into demo_id
    from public.trading_accounts
    where user_id = r.user_id and account_type = 'DEMO' and active = true
    order by created_at asc
    limit 1;

    if demo_id is not null then
      update public.trading_accounts
      set broker_account_login = r.broker_account_login,
          broker_server = r.broker_server,
          current_balance = r.current_balance,
          current_equity = r.current_equity,
          last_synced_at = r.last_synced_at,
          updated_at = now()
      where id = demo_id;

      update public.trades
      set account_id = demo_id
      where user_id = r.user_id
        and broker_provider = 'MT5'
        and broker_account_login = r.broker_account_login;

      delete from public.broker_sync_states
      where user_id = r.user_id
        and trading_account_id in (r.id, demo_id)
        and provider = 'MT5';

      update public.trading_accounts
      set broker_account_login = null,
          broker_server = null,
          current_balance = 0,
          current_equity = 0,
          last_synced_at = null,
          updated_at = now()
      where id = r.id;
    end if;
  end loop;
end $$;

with ranked as (
  select id,
         row_number() over (
           partition by user_id, broker_account_login
           order by updated_at desc, created_at asc
         ) as rn
  from public.trading_accounts
  where broker_account_login is not null
)
update public.trading_accounts a
set broker_account_login = null,
    broker_server = null,
    last_synced_at = null,
    updated_at = now()
from ranked r
where a.id = r.id and r.rn > 1;

create unique index if not exists trading_accounts_unique_broker_login_idx
  on public.trading_accounts(user_id, broker_account_login)
  where broker_account_login is not null;

update public.trading_accounts set is_primary = false where is_primary = true;

with preferred as (
  select distinct on (user_id) id
  from public.trading_accounts
  where active = true
  order by user_id,
           case when account_type = 'DEMO' then 1 else 0 end,
           case when lower(name) = 'exness real' then 0 else 1 end,
           created_at asc
)
update public.trading_accounts a
set is_primary = true,
    updated_at = now()
from preferred p
where a.id = p.id;

create unique index if not exists trading_accounts_one_primary_idx
  on public.trading_accounts(user_id)
  where is_primary = true and active = true;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''), '@', 1)))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role_id)
  select new.id, id from public.roles where key = 'FREE'
  on conflict do nothing;

  if not exists (
    select 1 from public.trading_accounts
    where user_id = new.id and account_type <> 'DEMO' and active = true
  ) then
    insert into public.trading_accounts (
      user_id, name, account_type, currency,
      initial_balance, current_balance, current_equity, active, is_primary
    ) values (
      new.id, 'Exness Real', 'PERSONAL', 'USD',
      0, 0, 0, true, true
    );
  end if;

  if not exists (
    select 1 from public.trading_accounts
    where user_id = new.id and account_type = 'DEMO' and active = true
  ) then
    insert into public.trading_accounts (
      user_id, name, account_type, currency,
      initial_balance, current_balance, current_equity, active, is_primary
    ) values (
      new.id, 'Conta Demonstração', 'DEMO', 'USD',
      25000, 25000, 25000, true, false
    );
  end if;

  return new;
end;
$$;

-- Registro de versão para evitar divergências silenciosas entre código e banco.
create table if not exists public.jvfx_schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now(),
  notes text
);

alter table public.jvfx_schema_migrations enable row level security;

drop policy if exists "schema_migrations_read_authenticated" on public.jvfx_schema_migrations;
create policy "schema_migrations_read_authenticated"
  on public.jvfx_schema_migrations
  for select
  to authenticated
  using (true);

insert into public.jvfx_schema_migrations (version, notes)
values ('1.2.9', 'Conta principal, vínculo MT5 único e compatibilidade de schema')
on conflict (version) do update
set applied_at = now(), notes = excluded.notes;
