-- JV FX · Vitorino LAB — Batch 3: trade planner + journal lifecycle

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  setup_id text not null,
  symbol text not null,
  broker_symbol text not null,
  market_type text not null check (market_type in ('FOREX','COMMODITY','INDEX','CRYPTO')),
  direction text not null check (direction in ('LONG','SHORT')),
  status text not null default 'OPEN' check (status in ('OPEN','CLOSED','CANCELLED')),
  result text check (result in ('WIN','LOSS','BE')),
  session text not null default 'OTHER' check (session in ('ASIA','LONDON','NEW_YORK','OTHER')),
  higher_timeframe text,
  timeframe text not null,
  strategy text not null default 'Personalizada',
  setup_name text not null default 'Setup manual',
  entry_price numeric not null check (entry_price > 0),
  stop_price numeric not null check (stop_price > 0),
  target_price numeric check (target_price is null or target_price > 0),
  exit_price numeric check (exit_price is null or exit_price > 0),
  position_size numeric not null check (position_size > 0),
  risk_percent numeric not null check (risk_percent > 0),
  risk_amount numeric not null check (risk_amount > 0),
  expected_rr numeric,
  realized_r numeric,
  gross_pnl numeric,
  net_pnl numeric,
  commission numeric not null default 0,
  swap numeric not null default 0,
  contract_size numeric not null check (contract_size > 0),
  conversion_rate numeric not null default 1 check (conversion_rate > 0),
  checklist jsonb not null default '{}'::jsonb,
  notes text not null default '',
  mistakes text not null default '',
  lessons text not null default '',
  source text not null default 'MANUAL' check (source in ('DEMO','MANUAL','BROKER','REALTIME','DELAYED')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, setup_id)
);

create table if not exists public.trade_confluences (
  id bigint generated always as identity primary key,
  trade_id uuid not null references public.trades(id) on delete cascade,
  confluence_key text not null,
  label text not null,
  weight numeric not null default 1,
  timeframe text,
  created_at timestamptz not null default now()
);

create index if not exists trades_user_status_idx on public.trades(user_id, status);
create index if not exists trades_user_opened_at_idx on public.trades(user_id, opened_at desc);
create index if not exists trades_user_closed_at_idx on public.trades(user_id, closed_at desc);
create index if not exists trades_account_idx on public.trades(account_id);
create index if not exists trades_symbol_idx on public.trades(symbol);
create index if not exists trade_confluences_trade_idx on public.trade_confluences(trade_id);

alter table public.trades enable row level security;
alter table public.trade_confluences enable row level security;

create policy "trades_own_select" on public.trades
for select to authenticated
using (user_id = auth.uid());

create policy "trades_own_insert" on public.trades
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.trading_accounts a
    where a.id = account_id and a.user_id = auth.uid()
  )
);

create policy "trades_own_update" on public.trades
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.trading_accounts a
    where a.id = account_id and a.user_id = auth.uid()
  )
);

create policy "trades_own_delete" on public.trades
for delete to authenticated
using (user_id = auth.uid());

create policy "trade_confluences_own_all" on public.trade_confluences
for all to authenticated
using (
  exists (
    select 1 from public.trades t
    where t.id = trade_id and t.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.trades t
    where t.id = trade_id and t.user_id = auth.uid()
  )
);
