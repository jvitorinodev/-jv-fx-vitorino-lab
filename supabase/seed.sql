insert into public.roles (key, label) values
  ('FREE','Gratuito'), ('TRADER','Trader'), ('ADMIN','Administrador')
on conflict (key) do update set label = excluded.label;

insert into public.permissions (key, description) values
  ('dashboard.view','Visualizar Mesa de Operações'),
  ('markets.view','Visualizar mercados e listas de observação'),
  ('terminal.view','Visualizar Terminal de Mercado e gráfico interativo'),
  ('news.view','Visualizar Notícias e Calendário Econômico'),
  ('market_analysis.view','Usar Análise de Mercado'),
  ('price_zones.view','Visualizar e gerenciar zonas de preço'),
  ('confluence.view','Usar Motor de Confluências'),
  ('trade_planner.view','Usar Planejador de Operações'),
  ('position_size.view','Usar dimensionamento de posição'),
  ('risk_center.view','Usar Central de Risco'),
  ('journal.view','Usar Diário e Calendário de Operações'),
  ('reports.view','Visualizar relatórios'),
  ('performance.view','Usar Laboratório de Desempenho'),
  ('admin.access','Abrir Central Administrativa'),
  ('admin.users','Gerenciar usuários'),
  ('admin.audit','Visualizar logs de auditoria')
on conflict (key) do update set description = excluded.description;

-- GRATUITO
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p
where r.key='FREE' and p.key in ('dashboard.view','markets.view','terminal.view','news.view','position_size.view','risk_center.view','journal.view','reports.view')
on conflict do nothing;

-- TRADER
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p
where r.key='TRADER' and p.key in (
  'dashboard.view','markets.view','terminal.view','news.view','market_analysis.view','price_zones.view','confluence.view','trade_planner.view',
  'position_size.view','risk_center.view','journal.view','reports.view','performance.view'
)
on conflict do nothing;

-- ADMIN recebe todas as permissões.
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p where r.key='ADMIN'
on conflict do nothing;

insert into public.assets (symbol, display_name, market_type, base_currency, quote_currency) values
  ('EURUSD','Euro / Dólar Americano','FOREX','EUR','USD'),
  ('GBPUSD','Libra Esterlina / Dólar Americano','FOREX','GBP','USD'),
  ('USDJPY','Dólar Americano / Iene Japonês','FOREX','USD','JPY'),
  ('XAUUSD','Ouro / Dólar Americano','COMMODITY','XAU','USD'),
  ('XAGUSD','Prata / Dólar Americano','COMMODITY','XAG','USD'),
  ('NAS100','Nasdaq 100','INDEX',null,'USD'),
  ('US30','Dow Jones 30','INDEX',null,'USD'),
  ('SPX500','S&P 500','INDEX',null,'USD'),
  ('BTCUSD','Bitcoin / Dólar Americano','CRYPTO','BTC','USD'),
  ('ETHUSD','Ethereum / Dólar Americano','CRYPTO','ETH','USD')
on conflict (symbol) do update set display_name=excluded.display_name, market_type=excluded.market_type;

insert into public.confluences (key, category, label, default_weight) values
  ('htf_alignment','HTF_CONTEXT','Alinhamento do Timeframe Superior',2),
  ('liquidity_sweep','LIQUIDITY','Varredura de Liquidez',2),
  ('fvg','ICT','FVG · Lacuna de Valor Justo',1),
  ('order_block','ICT','Bloco de Ordens',1),
  ('mss','STRUCTURE','Mudança de Estrutura de Mercado',2),
  ('bos','STRUCTURE','Rompimento de Estrutura',1),
  ('volume_confirmation','VOLUME','Confirmação por Volume',1),
  ('ema_alignment','MOVING_AVERAGES','Alinhamento EMA 9 / 20 / 50 / 200',1),
  ('ema_9_context','MOVING_AVERAGES','EMA 9',0.5),
  ('ema_20_context','MOVING_AVERAGES','EMA 20',0.5),
  ('ema_50_context','MOVING_AVERAGES','EMA 50',0.5),
  ('ema_200_context','MOVING_AVERAGES','EMA 200',1),
  ('ema_9_20_cross','MOVING_AVERAGES','EMA 9 / 20 · Alinhamento',0.5),
  ('fib_236','FIBONACCI','Fibonacci 23,6%',0.5),
  ('fib_382','FIBONACCI','Fibonacci 38,2%',0.5),
  ('fib_50','FIBONACCI','Fibonacci 50%',1),
  ('fib_618','FIBONACCI','Fibonacci 61,8%',1.5),
  ('fib_705','FIBONACCI','Fibonacci 70,5%',1.5),
  ('fib_72','FIBONACCI','Fibonacci 72%',1.5),
  ('fib_618_72_zone','FIBONACCI','Zona Fibonacci 61,8%–72%',2),
  ('rsi_regular_bullish','MOMENTUM','RSI · Divergência Altista Regular',2),
  ('rsi_regular_bearish','MOMENTUM','RSI · Divergência Baixista Regular',2),
  ('rsi_hidden_bullish','MOMENTUM','RSI · Divergência Altista Oculta',1.5),
  ('rsi_hidden_bearish','MOMENTUM','RSI · Divergência Baixista Oculta',1.5),
  ('price_action_confirmation','PRICE_ACTION','Confirmação por Ação do Preço',2),
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
  ('ema_rejection','MOVING_AVERAGES','Rejeição em EMA 9 / 20 / 50 / 200',1),
  ('session_killzone','SESSION','Sessão / Kill Zone',1)
on conflict (key) do update set category=excluded.category, label=excluded.label, default_weight=excluded.default_weight;

-- Perfil de referência Exness Standard MT5.
-- Os valores dos instrumentos são uma referência e devem ser confirmados na especificação ao vivo do símbolo na Exness/MT5 antes da execução.
insert into public.broker_profiles (user_id, name, account_currency, is_demo, broker_code, account_type, platform, is_template)
select null, 'Exness Standard MT5', 'USD', false, 'EXNESS', 'STANDARD', 'MT5', true
where not exists (
  select 1 from public.broker_profiles where user_id is null and broker_code = 'EXNESS' and account_type = 'STANDARD' and platform = 'MT5' and is_template = true
);

with bp as (
  select id from public.broker_profiles
  where user_id is null and broker_code = 'EXNESS' and account_type = 'STANDARD' and platform = 'MT5' and is_template = true
  order by created_at asc limit 1
), specs(symbol, broker_symbol, contract_size, min_lot, max_lot, lot_step, pip_size, profit_currency, max_lot_day, max_lot_night, source_url, source_note) as (
  values
    ('EURUSD','EURUSD',100000::numeric,0.01,200,0.01,0.0001,'USD',200,200,'https://get.exness.help/hc/en-us/articles/17854278192284-Forex','Especificação de referência para Forex principal'),
    ('GBPUSD','GBPUSD',100000::numeric,0.01,200,0.01,0.0001,'USD',200,200,'https://get.exness.help/hc/en-us/articles/17854278192284-Forex','Especificação de referência para Forex principal'),
    ('USDJPY','USDJPY',100000::numeric,0.01,200,0.01,0.01,'JPY',300,200,'https://get.exness.help/hc/en-us/articles/17854278192284-Forex','O máximo diurno/noturno difere no MT5'),
    ('XAUUSD','XAUUSD',100::numeric,0.01,200,0.01,0.01,'USD',200,200,'https://get.exness.help/hc/en-us/articles/17854173039388-Commodities','Ouro: 100 onças troy por lote'),
    ('XAGUSD','XAGUSD',5000::numeric,0.01,20,0.01,0.01,'USD',200,20,'https://get.exness.help/hc/en-us/articles/17854173039388-Commodities','O lote máximo conservador usa o limite noturno'),
    ('NAS100','USTEC',1::numeric,0.05,200,0.01,0.1,'USD',500,200,'https://get.exness.help/hc/en-us/articles/17854383867548-Indices','O alias NAS100 na JV FX corresponde ao USTEC da Exness'),
    ('US30','US30',1::numeric,0.05,100,0.01,1,'USD',500,100,'https://get.exness.help/hc/en-us/articles/17854383867548-Indices','O lote máximo conservador usa o limite noturno'),
    ('SPX500','US500',1::numeric,0.14,300,0.01,0.1,'USD',1000,300,'https://get.exness.help/hc/en-us/articles/17854383867548-Indices','O alias SPX500 na JV FX corresponde ao US500 da Exness'),
    ('BTCUSD','BTCUSD',1::numeric,0.01,200,0.01,0.1,'USD',200,200,'https://get.exness.help/hc/en-us/articles/17854191888540-Cryptocurrencies','Tamanho de contrato de 1 BTC'),
    ('ETHUSD','ETHUSD',1::numeric,0.1,2000,0.01,0.1,'USD',2000,2000,'https://get.exness.help/hc/en-us/articles/17854191888540-Cryptocurrencies','O mínimo efetivo documentado é 0,1 lote')
)
insert into public.broker_instruments (
  broker_profile_id, asset_id, broker_symbol, contract_size, min_lot, max_lot, lot_step, pip_size,
  commission_per_lot, leverage, verified_at, profit_currency, max_lot_day, max_lot_night, source_url, source_note
)
select
  bp.id, a.id, s.broker_symbol, s.contract_size, s.min_lot, s.max_lot, s.lot_step, s.pip_size,
  0, null, '2026-09-21T00:00:00Z'::timestamptz, s.profit_currency, s.max_lot_day, s.max_lot_night, s.source_url, s.source_note
from specs s
join public.assets a on a.symbol = s.symbol
cross join bp
on conflict (broker_profile_id, broker_symbol) do update set
  contract_size = excluded.contract_size,
  min_lot = excluded.min_lot,
  max_lot = excluded.max_lot,
  lot_step = excluded.lot_step,
  pip_size = excluded.pip_size,
  commission_per_lot = excluded.commission_per_lot,
  verified_at = excluded.verified_at,
  profit_currency = excluded.profit_currency,
  max_lot_day = excluded.max_lot_day,
  max_lot_night = excluded.max_lot_night,
  source_url = excluded.source_url,
  source_note = excluded.source_note;

-- Confluências macro de processo (sem direção implícita).
insert into public.confluences (key, category, label, default_weight) values
  ('macro_forex_factory_checked','MACRO','Forex Factory conferido',0.5),
  ('macro_investing_checked','MACRO','Investing.com conferido',0.5),
  ('macro_sources_confirmed','MACRO','Forex Factory + Investing.com conferidos',1)
on conflict (key) do update set category=excluded.category, label=excluded.label, default_weight=excluded.default_weight;
