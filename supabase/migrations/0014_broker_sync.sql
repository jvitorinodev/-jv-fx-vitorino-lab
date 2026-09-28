-- JV FX · Vitorino LAB v1.2.1
-- Sincronização Exness / MT5 orientada a performance.

alter table public.trading_accounts add column if not exists broker_account_login text;
alter table public.trading_accounts add column if not exists broker_server text;
alter table public.trading_accounts add column if not exists last_synced_at timestamptz;

create index if not exists trading_accounts_broker_login_idx
  on public.trading_accounts(user_id, broker_account_login)
  where broker_account_login is not null;

create table if not exists public.broker_sync_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trading_account_id uuid not null references public.trading_accounts(id) on delete cascade,
  provider text not null default 'MT5' check (provider in ('MT5')),
  broker_account_login text,
  status text not null default 'NEVER' check (status in ('NEVER','RUNNING','SUCCESS','PARTIAL','ERROR')),
  last_started_at timestamptz,
  last_completed_at timestamptz,
  imported_count integer not null default 0 check (imported_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  error_message text,
  source_window_days integer not null default 365 check (source_window_days between 1 and 3650),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, trading_account_id, provider)
);

create index if not exists broker_sync_states_user_idx
  on public.broker_sync_states(user_id, updated_at desc);

alter table public.broker_sync_states enable row level security;

drop policy if exists "broker_sync_states_own_all" on public.broker_sync_states;
create policy "broker_sync_states_own_all" on public.broker_sync_states
for all to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.trading_accounts a
    where a.id = trading_account_id and a.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.trading_accounts a
    where a.id = trading_account_id and a.user_id = auth.uid()
  )
);
