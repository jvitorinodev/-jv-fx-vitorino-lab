-- JV FX · Vitorino LAB — Etapa 5: Análise de Mercado + Matriz Multi-Timeframe

create table if not exists public.market_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  setup_id text not null,
  symbol text not null references public.assets(symbol),
  market_type text not null check (market_type in ('FOREX','COMMODITY','INDEX','CRYPTO')),
  higher_timeframe text not null,
  execution_timeframe text not null,
  consensus_bias text not null,
  consensus_direction text check (consensus_direction in ('LONG','SHORT') or consensus_direction is null),
  alignment_pct numeric not null default 0,
  liquidity_map jsonb not null default '{}'::jsonb,
  volume_context jsonb not null default '{}'::jsonb,
  moving_average_context jsonb not null default '{}'::jsonb,
  price_action_context jsonb not null default '{}'::jsonb,
  thesis text not null default '',
  invalidation text not null default '',
  notes text not null default '',
  source text not null default 'MANUAL' check (source in ('DEMO','MANUAL','BROKER','REALTIME','DELAYED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, setup_id)
);

create table if not exists public.market_analysis_timeframes (
  id bigint generated always as identity primary key,
  analysis_id uuid not null references public.market_analyses(id) on delete cascade,
  timeframe text not null,
  bias text not null,
  structure text not null,
  price_location text not null,
  liquidity_context text not null,
  note text not null default '',
  unique(analysis_id, timeframe)
);

create index if not exists market_analyses_user_created_idx on public.market_analyses(user_id, created_at desc);
create index if not exists market_analyses_user_symbol_idx on public.market_analyses(user_id, symbol, created_at desc);
create index if not exists market_analysis_timeframes_analysis_idx on public.market_analysis_timeframes(analysis_id);

alter table public.market_analyses enable row level security;
alter table public.market_analysis_timeframes enable row level security;

create policy "market_analyses_own_all" on public.market_analyses
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "market_analysis_timeframes_own_all" on public.market_analysis_timeframes
for all to authenticated
using (
  exists (
    select 1 from public.market_analyses ma
    where ma.id = analysis_id and ma.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.market_analyses ma
    where ma.id = analysis_id and ma.user_id = auth.uid()
  )
);
