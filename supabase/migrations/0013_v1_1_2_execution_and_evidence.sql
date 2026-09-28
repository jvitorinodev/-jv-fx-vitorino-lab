-- JV FX · Vitorino LAB v1.1.2
-- Execution intelligence + automatic evidence snapshots linked to Setup ID.

alter table public.risk_settings alter column max_risk_per_trade_pct set default 100;
update public.risk_settings
set max_risk_per_trade_pct = 100,
    updated_at = now()
where max_risk_per_trade_pct = 10;

create table if not exists public.automatic_evidence_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  setup_id text not null,
  symbol text not null,
  source text not null default 'MANUAL' check (source in ('DEMO','MANUAL','BROKER','REALTIME','DELAYED')),
  evaluated_at timestamptz not null,
  primary_timeframe text not null,
  primary_context text not null check (primary_context in ('BULLISH','BEARISH','NEUTRAL')),
  evidence_score numeric not null default 0,
  evidence_max numeric not null default 10,
  primary_snapshot jsonb not null default '{}'::jsonb,
  mtf_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, setup_id)
);

create table if not exists public.automatic_evidence_timeframes (
  id bigint generated always as identity primary key,
  snapshot_id uuid not null references public.automatic_evidence_snapshots(id) on delete cascade,
  timeframe text not null,
  context text not null check (context in ('BULLISH','BEARISH','NEUTRAL')),
  evidence_score numeric not null default 0,
  evidence_count integer not null default 0,
  structure_evidence jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  evaluated_at timestamptz not null,
  unique(snapshot_id, timeframe)
);

create index if not exists automatic_evidence_user_setup_idx on public.automatic_evidence_snapshots(user_id, setup_id);
create index if not exists automatic_evidence_user_symbol_idx on public.automatic_evidence_snapshots(user_id, symbol, evaluated_at desc);
create index if not exists automatic_evidence_timeframes_snapshot_idx on public.automatic_evidence_timeframes(snapshot_id, timeframe);

alter table public.automatic_evidence_snapshots enable row level security;
alter table public.automatic_evidence_timeframes enable row level security;

drop policy if exists "automatic_evidence_snapshots_own_all" on public.automatic_evidence_snapshots;
create policy "automatic_evidence_snapshots_own_all" on public.automatic_evidence_snapshots
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "automatic_evidence_timeframes_own_all" on public.automatic_evidence_timeframes;
create policy "automatic_evidence_timeframes_own_all" on public.automatic_evidence_timeframes
for all to authenticated
using (
  exists (
    select 1 from public.automatic_evidence_snapshots s
    where s.id = snapshot_id and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.automatic_evidence_snapshots s
    where s.id = snapshot_id and s.user_id = auth.uid()
  )
);
