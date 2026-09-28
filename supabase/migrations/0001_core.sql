-- JV FX · Vitorino LAB — core schema
-- Run in a fresh Supabase project. Designed so user-owned trading data is isolated by RLS.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'America/Sao_Paulo',
  preferred_currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key in ('FREE','TRADER','ADMIN')),
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  key text primary key,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

create table if not exists public.user_permission_overrides (
  user_id uuid not null references auth.users(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  allowed boolean not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, permission_key)
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique,
  display_name text not null,
  market_type text not null check (market_type in ('FOREX','COMMODITY','INDEX','CRYPTO')),
  base_currency text,
  quote_currency text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.broker_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  account_currency text not null default 'USD',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

create table if not exists public.broker_instruments (
  id uuid primary key default gen_random_uuid(),
  broker_profile_id uuid not null references public.broker_profiles(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  broker_symbol text not null,
  contract_size numeric,
  min_lot numeric,
  max_lot numeric,
  lot_step numeric,
  tick_size numeric,
  tick_value numeric,
  pip_size numeric,
  commission_per_lot numeric,
  leverage numeric,
  verified_at timestamptz,
  unique(broker_profile_id, broker_symbol)
);

create table if not exists public.trading_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  broker_profile_id uuid references public.broker_profiles(id) on delete set null,
  name text not null,
  account_type text not null check (account_type in ('PERSONAL','PROP','EVALUATION','FUNDED','DEMO')),
  currency text not null default 'USD',
  initial_balance numeric not null default 0,
  current_balance numeric not null default 0,
  current_equity numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.confluences (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  category text not null,
  label text not null,
  default_weight numeric not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Profile bootstrap.
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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Effective access for the signed-in user only.
create or replace function public.get_my_access()
returns jsonb
language sql
stable
security definer
set search_path = public
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
  )
  select jsonb_build_object(
    'role', coalesce((select key from primary_role), 'FREE'),
    'permissions', coalesce((select jsonb_agg(permission_key order by permission_key) from effective_permissions), '[]'::jsonb)
  );
$$;

grant execute on function public.get_my_access() to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.trading_accounts enable row level security;
alter table public.broker_profiles enable row level security;
alter table public.broker_instruments enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_permission_overrides enable row level security;
alter table public.admin_logs enable row level security;

create policy "profiles_read_own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "accounts_own_all" on public.trading_accounts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "broker_profiles_own_all" on public.broker_profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "broker_instruments_own" on public.broker_instruments for all to authenticated
using (exists (select 1 from public.broker_profiles bp where bp.id = broker_profile_id and bp.user_id = auth.uid()))
with check (exists (select 1 from public.broker_profiles bp where bp.id = broker_profile_id and bp.user_id = auth.uid()));

create policy "user_roles_read_own" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "permission_overrides_read_own" on public.user_permission_overrides for select to authenticated using (user_id = auth.uid());

-- Public reference catalogs are readable after authentication.
alter table public.assets enable row level security;
alter table public.confluences enable row level security;
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
create policy "assets_read" on public.assets for select to authenticated using (true);
create policy "confluences_read" on public.confluences for select to authenticated using (true);
create policy "permissions_read" on public.permissions for select to authenticated using (true);
create policy "roles_read" on public.roles for select to authenticated using (true);
create policy "role_permissions_read" on public.role_permissions for select to authenticated using (true);

-- No client policy is created for admin_logs writes. Future admin mutations should use a trusted server path.
