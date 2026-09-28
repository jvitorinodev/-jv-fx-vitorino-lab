# CHANGELOG 1.2.13

## Interface / contraste
- Tema escuro reforçado para impedir textos escuros sobre superfícies escuras.
- Elementos sem classe explícita de cor agora herdam texto claro no modo escuro.
- Cores de status azul, vermelho, âmbar e violeta receberam contraste adequado no modo escuro.
- O bloco **Últimos resultados** permanece claro/branco mesmo no tema escuro.
- Nos cards de últimos resultados, título/data ficam escuros para leitura no fundo claro, observação fica cinza, lucro verde e perda vermelha.

## Calculadora de lote
- Mantida como módulo próprio no menu lateral.
- Perfis de risco personalizados do JV FX:
  - Conservador: 1% a 3%
  - Moderado: 3% a 5%
  - Arriscado: 6% a 10%
  - Especulador: 10% a 100%
- Adicionada seleção explícita de direção: Compra ou Venda.
- Stop Loss e Take Profit podem ser informados de três formas:
  - preço exato;
  - porcentagem da entrada;
  - distância em US$ do preço de entrada.
- O sistema converte automaticamente % e US$ em preços de Stop/Take.
- O resultado mostra Stop e Take calculados, R:R, risco real, lucro projetado e valor por pip.

## Margem Exness / MT5
- O Bridge agora envia também a margem livre da conta no cálculo de execução.
- A calculadora compara margem necessária x margem livre.
- Quando a margem é insuficiente, o painel sinaliza o problema e estima o lote máximo viável pela margem.
- A alteração é aditiva e não muda o fluxo de associação Real/Demo, Supabase ou sincronização do Journal.
