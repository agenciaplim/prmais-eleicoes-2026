# START HERE

## 1. Crie o repositorio Git local

```bash
git init
git add .
git commit -m "chore: initialize PR+ Eleicoes 2026"
```

## 2. Configure ambiente local

```bash
cp .env.example .env.local
```

Nao precisa criar Upstash agora. O padrao e `CACHE_DRIVER=memory`.

## 3. Instale e rode

```bash
pnpm install
pnpm dev
```

## 4. Abra o Codex ou Cloud Code neste diretorio

Instrucao inicial sugerida:

> Leia AGENTS.md e os documentos obrigatorios antes de modificar qualquer arquivo. Pegue apenas uma tarefa TODO de TASKS.md, marque-a como IN_PROGRESS e siga as decisoes do projeto.

## 5. Quando quiser publicar

Somente entao:

- criar projeto na Vercel;
- criar Redis no Upstash;
- preencher variaveis de ambiente;
- configurar dominio;
- fazer testes de producao.
