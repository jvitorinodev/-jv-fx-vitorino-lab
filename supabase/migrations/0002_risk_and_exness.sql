-- JV FX · Vitorino LAB — Batch 2: risk policy + Exness broker reference profile

alter table public.broker_profiles add column if not exists broker_code text;
alter table public.broker_profiles add column if not exists account_type text not null default 'STANDARD';
alter table public.broker_profiles add column if not exists platform text not null default 'MT5';
alter table public.broker_profiles add column if not exists is_template boolean not null default false;

alter table public.broker_instruments add column if not exists profit_currency text;
alter table public.broker_instruments add column if not exists max_lot_day numeric;
alter table public.broker_instruments add column if not exists max_lot_night numeric;
alter table public.broker_instruments add column if not exists source_url text;
alter table public.broker_instruments add column if not exists source_note text;

create table if not exists public.risk_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trading_account_id uuid references public.trading_accounts(id) on delete cascade,
  default_risk_per_trade_pct numeric not null default 5 check (default_risk_per_trade_pct >= 0 and default_risk_per_trade_pct <= 100),
  max_risk_per_trade_pct numeric not null default 10 check (max_risk_per_trade_pct >= 0 and max_risk_per_trade_pct <= 100),
  max_daily_loss_pct numeric not null default 25 check (max_daily_loss_pct >= 0 and max_daily_loss_pct <= 100),
  max_weekly_loss_pct numeric not null default 50 check (max_weekly_loss_pct >= 0 and max_weekly_loss_pct <= 100),
  max_trades_per_day integer not null default 3 check (max_trades_per_day >= 0),
  caution_consecutive_losses integer not null default 2 check (caution_consecutive_losses >= 0),
  lock_on_daily_loss_limit boolean not null default true,
  lock_on_weekly_loss_limit boolean not null default true,
  lock_on_trade_limit boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint risk_default_not_above_max check (default_risk_per_trade_pct <= max_risk_per_trade_pct)
);

create unique index if not exists risk_settings_one_per_account
  on public.risk_settings (user_id, trading_account_id)
  where trading_account_id is not null;

create unique index if not exists risk_settings_one_global_per_user
  on public.risk_settings (user_id)
  where trading_account_id is null;

alter table public.risk_settings enable row level security;

drop policy if exists "risk_settings_own_all" on public.risk_settings;
create policy "risk_settings_own_all" on public.risk_settings
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Reference broker profiles can be read by authenticated users but remain immutable from the client.
drop policy if exists "broker_profiles_template_read" on public.broker_profiles;
create policy "broker_profiles_template_read" on public.broker_profiles
for select to authenticated
using (user_id is null and is_template = true);

drop policy if exists "broker_instruments_template_read" on public.broker_instruments;
create policy "broker_instruments_template_read" on public.broker_instruments
for select to authenticated
using (
  exists (
    select 1
    from public.broker_profiles bp
    where bp.id = broker_profile_id
      and bp.user_id is null
      and bp.is_template = true
  )
);
