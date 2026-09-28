# Publicar o JV FX no GitHub com segurança

## Antes de tudo
Nunca publique `.env.local`, `bridge/.env`, senhas, tokens, chaves do Supabase ou segredos do Bridge MT5.
Os arquivos `.env.example` e `bridge/.env.example` existem justamente para documentar os nomes das variáveis sem expor valores privados.

## Opção recomendada: GitHub Desktop
1. Extraia a versão `GITHUB-SAFE` do projeto.
2. Abra o GitHub Desktop.
3. Use **File > Add local repository** e selecione a pasta do projeto.
4. Se ainda não for um repositório, escolha **Create a repository**.
5. Nome sugerido: `jv-fx-vitorino-lab`.
6. Faça o primeiro commit com a mensagem `Initial stable version`.
7. Clique em **Publish repository**.
8. Comece como **Private**. Torne público somente depois de revisar os arquivos e decidir o que deseja expor.

## Pelo terminal
Na raiz da versão GITHUB-SAFE:

```powershell
git init
git add .
git status
git commit -m "Initial stable version"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/jv-fx-vitorino-lab.git
git push -u origin main
```

Antes do `git commit`, confira `git status`. `.env.local` e `bridge/.env` não devem aparecer.

## Estrutura de branches sugerida
- `main`: somente versões estáveis.
- `develop`: integração das próximas funcionalidades.
- `feature/nome-da-funcao`: uma função nova por branch.

Exemplo:
```powershell
git checkout -b develop
git checkout -b feature/risk-engine-v2
```

## Commits sugeridos
- `feat: add interactive daily pnl`
- `feat: improve exness position calculator`
- `fix: preserve real and demo account isolation`
- `ui: refine performance metrics cards`
- `docs: update mt5 bridge setup`

## Não publique
- credenciais do Supabase
- senhas da Exness/MT5
- segredo HTTP do Bridge
- arquivos `.env`
- banco local, logs ou dumps com dados pessoais
- prints que exponham login/saldo caso você não queira deixá-los públicos
