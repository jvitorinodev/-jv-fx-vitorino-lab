-- JV FX · Vitorino LAB — Etapa 6.1: Fibonacci, RSI e EMAs principais
-- Adiciona novas confluências sem alterar dados existentes do usuário.

insert into public.confluences (key, category, label, default_weight) values
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
  ('ema_9_context','MOVING_AVERAGES','EMA 9',0.5),
  ('ema_20_context','MOVING_AVERAGES','EMA 20',0.5),
  ('ema_50_context','MOVING_AVERAGES','EMA 50',0.5),
  ('ema_200_context','MOVING_AVERAGES','EMA 200',1),
  ('ema_9_20_cross','MOVING_AVERAGES','EMA 9 / 20 · Alinhamento',0.5),
  ('ema_alignment','MOVING_AVERAGES','Alinhamento EMA 9 / 20 / 50 / 200',1),
  ('ema_rejection','MOVING_AVERAGES','Rejeição em EMA 9 / 20 / 50 / 200',1)
on conflict (key) do update set
  category = excluded.category,
  label = excluded.label,
  default_weight = excluded.default_weight,
  active = true;
