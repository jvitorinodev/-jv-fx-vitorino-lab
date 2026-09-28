-- JV FX · Vitorino LAB — Etapa 6: Zonas de Preço + Motor de Confluências

insert into public.confluences (key, category, label, default_weight) values
  ('premium_discount','HTF_CONTEXT','Premium / Discount',1),
  ('choch','STRUCTURE','CHoCH',1),
  ('equal_highs_lows','LIQUIDITY','Equal Highs / Lows',1),
  ('pdh_pdl','LIQUIDITY','PDH / PDL',1),
  ('pwh_pwl','LIQUIDITY','PWH / PWL',1),
  ('asian_liquidity','LIQUIDITY','Liquidez Asiática',1),
  ('ifvg','ICT','IFVG · FVG Invertido',1),
  ('bpr','ICT','BPR · Faixa de Preço Balanceada',1),
  ('breaker_block','ICT','Breaker Block',1),
  ('mitigation_block','ICT','Mitigation Block',1),
  ('ote','ICT','OTE',1),
  ('displacement','ICT','Deslocamento',1),
  ('vwap_context','VOLUME','Contexto VWAP',1),
  ('ema_rejection','MOVING_AVERAGES','Rejeição em EMA',1),
  ('session_killzone','SESSION','Sessão / Kill Zone',1),
  ('volume_confirmation','VOLUME','Confirmação por Volume',1),
  ('price_action_confirmation','PRICE_ACTION','Confirmação por Ação do Preço',2)
on conflict (key) do update set
  category = excluded.category,
  label = excluded.label,
  default_weight = excluded.default_weight,
  active = true;

create table if not exists public.price_zones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_id uuid references public.market_analyses(id) on delete set null,
  setup_id text not null,
  symbol text not null references public.assets(symbol),
  market_type text not null check (market_type in ('FOREX','COMMODITY','INDEX','CRYPTO')),
  direction text not null check (direction in ('LONG','SHORT')),
  timeframe text not null,
  zone_type text not null check (zone_type in ('FVG','IFVG','BPR','ORDER_BLOCK','BREAKER_BLOCK','MITIGATION_BLOCK','OTE','SUPPORT','RESISTANCE','CUSTOM')),
  lower_price numeric not null,
  upper_price numeric not null,
  invalidation_price numeric,
  price_location text not null default 'NONE' check (price_location in ('PREMIUM','DISCOUNT','EQUILIBRIUM','NONE')),
  status text not null default 'WAITING' check (status in ('WAITING','APPROACHING','INSIDE_ZONE','REACTION','INVALIDATED','COMPLETED','ARCHIVED')),
  confluence_score numeric not null default 0,
  selected_confluences integer not null default 0,
  alert_enabled boolean not null default false,
  notes text not null default '',
  source text not null default 'MANUAL' check (source in ('DEMO','MANUAL','BROKER','REALTIME','DELAYED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lower_price > 0),
  check (upper_price > lower_price),
  check (invalidation_price is null or invalidation_price > 0),
  check (confluence_score >= 0),
  check (selected_confluences >= 0)
);

create table if not exists public.price_zone_confluences (
  id bigint generated always as identity primary key,
  zone_id uuid not null references public.price_zones(id) on delete cascade,
  confluence_key text not null references public.confluences(key),
  category text not null,
  label text not null,
  weight numeric not null default 1 check (weight >= 0 and weight <= 5),
  timeframe text,
  note text not null default '',
  unique(zone_id, confluence_key)
);

create table if not exists public.user_confluence_weights (
  user_id uuid not null references auth.users(id) on delete cascade,
  confluence_key text not null references public.confluences(key) on delete cascade,
  weight numeric not null check (weight >= 0 and weight <= 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, confluence_key)
);

create index if not exists price_zones_user_created_idx on public.price_zones(user_id, created_at desc);
create index if not exists price_zones_user_symbol_idx on public.price_zones(user_id, symbol, status);
create index if not exists price_zones_user_setup_idx on public.price_zones(user_id, setup_id);
create index if not exists price_zone_confluences_zone_idx on public.price_zone_confluences(zone_id);

alter table public.price_zones enable row level security;
alter table public.price_zone_confluences enable row level security;
alter table public.user_confluence_weights enable row level security;

drop policy if exists "price_zones_own_all" on public.price_zones;
create policy "price_zones_own_all" on public.price_zones
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "price_zone_confluences_own_all" on public.price_zone_confluences;
create policy "price_zone_confluences_own_all" on public.price_zone_confluences
for all to authenticated
using (
  exists (
    select 1 from public.price_zones pz
    where pz.id = zone_id and pz.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.price_zones pz
    where pz.id = zone_id and pz.user_id = auth.uid()
  )
);

drop policy if exists "user_confluence_weights_own_all" on public.user_confluence_weights;
create policy "user_confluence_weights_own_all" on public.user_confluence_weights
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
