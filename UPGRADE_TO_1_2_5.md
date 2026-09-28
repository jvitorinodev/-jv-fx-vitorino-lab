# Upgrade para JV FX · Vitorino LAB v1.2.5

## Objetivo

A v1.2.5 fecha a experiência de contas antes da conexão real do MT5:

- seletor global de contas no topo;
- opção **Todas as contas ativas**;
- identificação visual **REAL / DEMO**;
- conta **Exness Real** padrão;
- conta **Conta Demonstração** padrão;
- listagem de todas as contas ativas na Central de Integrações;
- menu de usuário no canto superior direito com **Sair da conta**;
- seleção de conta preservada em cookie seguro do JV FX.

## 1. Supabase

No SQL Editor execute o arquivo:

```text
SUPABASE_1_2_5.sql
```

Ele atualiza o bootstrap de novos usuários e cria, somente quando estiverem ausentes:

- `Exness Real` — `PERSONAL`;
- `Conta Demonstração` — `DEMO`, saldo inicial USD 25.000.

Usuários existentes também recebem as contas ausentes.

## 2. Aplicação

O `.env.local` desta versão já está configurado para o ambiente beta atual.

Execute:

```powershell
npm install
npm run verify:env
npm run typecheck
npm run build
npm run dev
```

## 3. Teste visual

Acesse:

```text
http://localhost:3000/dashboard
```

No topo deve aparecer:

```text
Todas as contas ativas
REAL · Exness Real
DEMO · Conta Demonstração
```

Abra o menu do usuário no canto superior direito. Deve aparecer o nome, e-mail, papel, status e o botão **Sair da conta**.

Depois confira:

```text
http://localhost:3000/dashboard/integrations
```

A seção **Todas as contas ativas** deve listar contas reais e de demonstração separadamente.

## 4. Próximo passo

Depois de validar esta versão, alteraremos o ambiente para `MARKET_DATA_PROVIDER=mt5`, configuraremos o segredo do Bridge e conectaremos o MetaTrader 5 da Exness em modo somente leitura/sincronização.
