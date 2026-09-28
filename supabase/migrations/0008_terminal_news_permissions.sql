-- JV FX · Vitorino LAB — Terminal de Mercado e Notícias
-- Permissões granulares para os módulos de gráfico e calendário macro.

insert into public.permissions (key, description) values
  ('terminal.view','Visualizar Terminal de Mercado e gráfico interativo'),
  ('news.view','Visualizar Notícias e Calendário Econômico')
on conflict (key) do update set description = excluded.description;

-- Os módulos fazem parte da experiência-base. FREE/TRADER/ADMIN recebem acesso.
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join public.permissions p
where r.key in ('FREE','TRADER','ADMIN')
  and p.key in ('terminal.view','news.view')
on conflict do nothing;

-- Confluências macro de processo. Elas não exprimem viés direcional.
insert into public.confluences (key, category, label, default_weight) values
  ('macro_forex_factory_checked','MACRO','Forex Factory conferido',0.5),
  ('macro_investing_checked','MACRO','Investing.com conferido',0.5),
  ('macro_sources_confirmed','MACRO','Forex Factory + Investing.com conferidos',1)
on conflict (key) do update set category=excluded.category, label=excluded.label, default_weight=excluded.default_weight;
