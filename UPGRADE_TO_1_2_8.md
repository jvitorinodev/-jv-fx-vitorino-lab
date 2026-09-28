# JV FX v1.2.8 — Conta principal + associação MT5

1. Execute `SUPABASE_1_2_8.sql` uma vez no SQL Editor do Supabase.
2. A conta `Exness Real` passa a ser a principal por padrão.
3. Se a `Exness Real` estava ligada por engano a um servidor `Trial/Demo`, o SQL move o vínculo e os trades importados para `Conta Demonstração`.
4. Em **Integrações**, cada conta agora possui:
   - Tornar principal
   - Associar MT5 atual
   - Desvincular
5. Também é possível criar novas contas e associá-las ao MT5 sem editar SQL.
6. A sincronização manual agora pode atualizar explicitamente o vínculo da conta escolhida para o login MT5 atualmente conectado.
