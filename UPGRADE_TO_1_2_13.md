# Upgrade para JV FX v1.2.13

1. Mantenha a v1.2.12 como backup.
2. Extraia a v1.2.13 em uma pasta separada.
3. Não execute SQL novo: esta atualização não altera o schema do Supabase.
4. Com o MT5 fechado ou aberto, rode `./TESTAR_V1_2_13.ps1`.
5. Se os 8 testes passarem, execute `./INICIAR_TUDO.ps1`.
6. Confira:
   - contraste do modo escuro;
   - menu Calculadora de lote;
   - perfis Conservador/Moderado/Arriscado/Especulador;
   - modos Preço/%/US$ para Stop e Take;
   - margem necessária, margem livre e lote viável com MT5 conectado;
   - cards Últimos resultados com fundo claro e lucro/perda coloridos.
