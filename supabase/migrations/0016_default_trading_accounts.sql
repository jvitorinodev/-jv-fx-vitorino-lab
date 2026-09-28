-- JV FX · Vitorino LAB v1.2.5
-- Garante duas contas-base por usuário: Exness Real e Conta Demonstração.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''), '@', 1)))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role_id)
  select new.id, id from public.roles where key = 'FREE'
  on conflict do nothing;

  if not exists (
    select 1 from public.trading_accounts
    where user_id = new.id and account_type <> 'DEMO' and active = true
  ) then
    insert into public.trading_accounts (
      user_id, name, account_type, currency,
      initial_balance, current_balance, current_equity, active
    ) values (
      new.id, 'Exness Real', 'PERSONAL', 'USD',
      0, 0, 0, true
    );
  end if;

  if not exists (
    select 1 from public.trading_accounts
    where user_id = new.id and account_type = 'DEMO' and active = true
  ) then
    insert into public.trading_accounts (
      user_id, name, account_type, currency,
      initial_balance, current_balance, current_equity, active
    ) values (
      new.id, 'Conta Demonstração', 'DEMO', 'USD',
      25000, 25000, 25000, true
    );
  end if;

  return new;
end;
$$;


-- Backfill para usuários já existentes.
insert into public.trading_accounts (
  user_id, name, account_type, currency,
  initial_balance, current_balance, current_equity, active
)
select
  u.id, 'Exness Real', 'PERSONAL', 'USD',
  0, 0, 0, true
from auth.users u
where not exists (
  select 1 from public.trading_accounts a
  where a.user_id = u.id and a.account_type <> 'DEMO' and a.active = true
);

insert into public.trading_accounts (
  user_id, name, account_type, currency,
  initial_balance, current_balance, current_equity, active
)
select
  u.id, 'Conta Demonstração', 'DEMO', 'USD',
  25000, 25000, 25000, true
from auth.users u
where not exists (
  select 1 from public.trading_accounts a
  where a.user_id = u.id and a.account_type = 'DEMO' and a.active = true
);
