-- JV FX · Vitorino LAB v1.1.1 — importação idempotente do histórico MT5

alter table public.trades
  alter column stop_price drop not null,
  alter column risk_percent drop not null,
  alter column risk_amount drop not null;

alter table public.trades
  add column if not exists broker_provider text,
  add column if not exists broker_account_login text,
  add column if not exists broker_position_id text,
  add column if not exists broker_entry_deal_id text,
  add column if not exists broker_exit_deal_id text,
  add column if not exists imported_at timestamptz,
  add column if not exists import_metadata jsonb not null default '{}'::jsonb;

create unique index if not exists trades_broker_position_unique_idx
  on public.trades(user_id, broker_provider, broker_account_login, broker_position_id)
  where broker_provider is not null and broker_position_id is not null;

create index if not exists trades_broker_position_lookup_idx
  on public.trades(user_id, broker_position_id)
  where broker_position_id is not null;

comment on column public.trades.broker_position_id is
  'Identificador da posição no provedor externo. Usado para importação idempotente.';

comment on column public.trades.import_metadata is
  'Metadados técnicos de importação. Não deve conter credenciais.';
