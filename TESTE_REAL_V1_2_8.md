# Teste real JV FX v1.2.8

## 1. Banco
Execute **uma vez** `SUPABASE_1_2_8.sql` no SQL Editor do Supabase.

Esse SQL:
- torna `Exness Real` a conta principal;
- detecta vínculo antigo de conta real com servidor `Trial/Demo` e move vínculo/trades para `Conta Demonstração`;
- impede um login MT5 de ficar vinculado em duas contas;
- preserva os trades importados da Demo;
- deixa a conta Real pronta para receber o login real atual.

## 2. Validação do projeto
Na raiz:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\TESTAR_V1_2_8.ps1
```

O script executa `npm install` quando necessário, `verify:env`, `typecheck` e `build`.

## 3. Bridge
Com o MT5 aberto:

```powershell
cd bridge
.\run.ps1
```

Em outro PowerShell:

```powershell
.\test-bridge.ps1 -Days 30
```

## 4. Conta Real principal
Com a conta real aberta no MT5:
- abra `/dashboard/integrations`;
- `Exness Real` deve exibir **Principal**;
- clique **Associar MT5 atual** se ainda estiver sem vínculo;
- ou, no Dashboard, selecione `Exness Real` e clique `Sincronizar agora` — a sincronização manual também atualiza o vínculo para o MT5 escolhido.

## 5. Outras contas
Em `/dashboard/integrations`:
- digite um nome;
- escolha o tipo;
- clique **Adicionar conta**;
- conecte essa conta no MT5;
- clique **Associar MT5 atual** no cartão correspondente.

Um login MT5 só pode pertencer a uma conta JV FX por vez.
