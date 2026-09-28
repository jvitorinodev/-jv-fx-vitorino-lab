# JV FX v1.2.10 — Bridge resiliente + proteção Demo/Real

Esta atualização corrige os erros vistos quando o dashboard abre antes de o Bridge MT5 estar realmente pronto.

## O que foi corrigido

- `INICIAR_TUDO.ps1` agora sincroniza `bridge/.env` e `.env.local` **antes** de iniciar o Next.js.
- O iniciador espera o Bridge responder em `/health` antes de subir a interface.
- Processo antigo na porta 8765 é validado; um Bridge JV FX obsoleto pode ser reiniciado sem deixar configuração antiga presa.
- O Bridge usa uma pasta de dependências local estável (`bridge/.packages`).
- `verify-db` e `verify-beta` não usam mais encerramento forçado do Node após `fetch`, evitando `UV_HANDLE_CLOSING` no Windows.
- A tela de histórico não mostra mais “Demonstração” quando o modo é MT5 e o Bridge está fora do ar; mostra `MT5 indisponível`.
- Associação e sincronização protegem contra mistura de conta Demo/Trial com cartão Real e vice-versa.
- O seletor de sincronização prefere automaticamente a conta já vinculada ao login MT5 atual.
- O Journal automático aplica backoff quando o Bridge fica temporariamente indisponível, em vez de insistir agressivamente a cada ciclo.
- Foi adicionado `DIAGNOSTICAR_MT5.ps1` para conferir porta, segredo, `/health`, `/account`, login e servidor sem exibir o segredo.

## Banco de dados

Nenhuma migration nova é necessária se `SUPABASE_1_2_9.sql` já foi executado com sucesso.

## Validação

```powershell
.\TESTAR_V1_2_10.ps1
```

## Inicialização recomendada

Com o MetaTrader 5 instalado e preferencialmente aberto/logado:

```powershell
.\INICIAR_TUDO.ps1
```

Na primeira execução o Bridge pode instalar dependências. O iniciador aguarda até 180 segundos antes de considerar falha.

## Diagnóstico rápido

```powershell
.\DIAGNOSTICAR_MT5.ps1
```

Se o servidor detectado contiver `Trial`/`Demo`, associe ao cartão **Conta Demonstração**. Se for `Real`/`Live`, associe ao cartão **Exness Real**.
