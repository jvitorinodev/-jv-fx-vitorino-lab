# Atualização para v1.2.1

## 1. Faça backup

Guarde sua pasta atual e o `.env.local` antes de substituir a versão.

## 2. Instale a nova versão

```powershell
npm install
npm run typecheck
npm run build
```

## 3. Supabase

Aplique:

```text
supabase/migrations/0014_broker_sync.sql
```

A migration adiciona vínculo da conta MT5 e o estado da sincronização.

## 4. Bridge

Atualize também a pasta `bridge/`, pois a v1.2.1 acrescenta paginação ao endpoint de histórico.

Valide:

```powershell
python -m py_compile bridge/app/*.py
```

## 5. Variáveis

Para MT5 real:

```env
MARKET_DATA_PROVIDER=mt5
MT5_BRIDGE_HTTP_URL=http://127.0.0.1:8765
MT5_BRIDGE_SHARED_SECRET=...
```

O `JVFX_BRIDGE_SHARED_SECRET` do Bridge deve ser igual.

## 6. Primeiro vínculo

Na Visão geral:

1. escolha a conta do JV FX;
2. mantenha o MT5 logado na conta Exness correta;
3. clique **Sincronizar agora**;
4. confirme login, saldo/equity e quantidade importada;
5. depois desse primeiro vínculo, o JV FX recusa outro login MT5 nessa mesma conta para evitar mistura de históricos.
