# JV FX · MT5 Bridge

Bridge local entre o **JV FX** e o **MetaTrader 5 Desktop** no Windows.

## Fluxo recomendado

1. Abra o MetaTrader 5 Desktop e entre na conta Exness desejada.
2. Abra um PowerShell nesta pasta `bridge`.
3. Execute:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\run.ps1
```

O script agora faz automaticamente:

- cria `.venv`;
- valida Windows + Python 64-bit;
- cria/sincroniza `bridge/.env` e o `.env.local` da raiz;
- gera um segredo local forte quando necessário;
- instala as dependências;
- valida MetaTrader5/FastAPI/Uvicorn;
- inicia `http://127.0.0.1:8765`.

Não é necessário colocar a senha da Exness no `.env` quando o MT5 Desktop já está aberto e autenticado.

## Teste do Bridge

Deixe o `run.ps1` rodando. Em outro PowerShell, nesta mesma pasta:

```powershell
.\test-bridge.ps1
```

O teste consulta:

- `/health`
- `/account`

Se a conta estiver conectada, `/account` deverá retornar login, servidor, moeda, saldo, equity, margem e alavancagem.

## Segurança

O Bridge escuta apenas em `127.0.0.1` por padrão e usa um segredo local compartilhado entre `bridge/.env` e `.env.local`.

## Inicializacao recomendada no Windows (Hotfix 3)

O Bridge usa dependencias locais versionadas em `bridge/.packages-v1_2_7` e nao depende de `.venv`. O `run.ps1` reutiliza dependencias validas e evita reinstalar pacotes enquanto o servidor estiver ativo.

```powershell
.\run.ps1
```

Alternativa sem politica de execucao PowerShell:

```powershell
.\run.cmd
```

Depois, em outro PowerShell:

```powershell
.\test-bridge.ps1
```
