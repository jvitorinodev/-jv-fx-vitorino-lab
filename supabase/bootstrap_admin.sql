-- JV FX · Vitorino LAB — bootstrap manual do PRIMEIRO administrador
-- 1) Cadastre este usuário normalmente no JV FX (ou em Authentication > Users).
-- 2) Troque o e-mail abaixo.
-- 3) Execute UMA VEZ no SQL Editor do Supabase.
-- 4) Depois valide o acesso e arquive este script; ele não cria endpoints nem funções públicas.

do $$
declare
  admin_email text := 'SEU_EMAIL_AQUI';
  target_user_id uuid;
  admin_role_id uuid;
begin
  if admin_email = 'SEU_EMAIL_AQUI' then
    raise exception 'Troque SEU_EMAIL_AQUI pelo e-mail do administrador antes de executar.';
  end if;

  select id into target_user_id
  from auth.users
  where lower(email) = lower(admin_email)
  limit 1;

  if target_user_id is null then
    raise exception 'Usuário % não encontrado em auth.users. Cadastre-o primeiro.', admin_email;
  end if;

  select id into admin_role_id
  from public.roles
  where key = 'ADMIN'
  limit 1;

  if admin_role_id is null then
    raise exception 'Role ADMIN não encontrada. Execute as migrations e seed antes.';
  end if;

  update public.profiles
  set account_status = 'ACTIVE', updated_at = now()
  where id = target_user_id;

  delete from public.user_roles where user_id = target_user_id;
  insert into public.user_roles (user_id, role_id)
  values (target_user_id, admin_role_id)
  on conflict do nothing;

  insert into public.admin_logs (actor_user_id, action, target_type, target_id, metadata)
  values (target_user_id, 'FIRST_ADMIN_BOOTSTRAPPED', 'USER', target_user_id::text,
    jsonb_build_object('email', admin_email, 'source', 'manual_bootstrap'));

  raise notice 'Administrador % ativado com sucesso.', admin_email;
end $$;
