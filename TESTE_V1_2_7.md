# Teste rápido — JV FX v1.2.7

## 1. Bridge MT5

Com o MetaTrader 5 aberto e logado:

```powershell
cd bridge
.\run.ps1
```

Deixe essa janela aberta.

Em outro PowerShell:

```powershell
cd bridge
.\test-bridge.ps1 -Days 7
.\test-bridge.ps1 -Days 14
.\test-bridge.ps1 -Days 30
```

## 2. Aplicação

Na raiz do projeto:

```powershell
npm install
npm run verify:env
npm run typecheck
npm run build
npm run dev
```

## 3. Primeiro vínculo da conta

Na Visão geral:

1. selecione a conta do JV FX correspondente ao login atualmente aberto no MT5;
2. escolha 1 mês (ou outra janela);
3. clique em **Sincronizar agora** uma vez.

O vínculo do login MT5 com a conta do JV FX é salvo antes da leitura completa do histórico.

## 4. Journal automático

Depois do primeiro vínculo, o topo mostra o estado do Journal MT5 automático. Enquanto a aba estiver visível, o JV FX verifica novas operações fechadas aproximadamente a cada 15 segundos e atualiza as telas por refresh do servidor.

## 5. Janelas disponíveis

- 1 semana
- 14 dias
- 1 mês
- 3 meses
- 6 meses
- 1 ano
- 3 anos
- Tudo (até 10 anos)
