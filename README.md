# PR+ Eleições 2026

Starter do portal de apuração eleitoral do PR+, pensado para desenvolvimento rápido com Codex e Cloud Code, mantendo uma base mínima de segurança e histórico técnico.

## Começar localmente

Pré-requisitos:

- Node.js LTS
- pnpm
- Git

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Abra `http://localhost:3000`.

O projeto inicia com `CACHE_DRIVER=memory`, portanto **não é necessário criar Redis, Vercel ou AWS para começar**.

O acesso remoto ao TSE permanece desligado no ambiente local. Para habilitá-lo explicitamente, use `TSE_ENV=remote` e configure um dos pares de base/ambiente documentados em `docs/TSE_SCHEMAS.md`; o código não aceita origens fora da allowlist oficial.

Quando o Upstash estiver configurado, altere:

```env
CACHE_DRIVER=upstash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Em produção, `CACHE_DRIVER=upstash` e ambas as credenciais são obrigatórios. O cache em memória é recusado para evitar perda silenciosa do last-known-good entre instâncias ou reinicializações.

## Antes de trabalhar

Codex e Cloud Code devem ler nesta ordem:

1. `docs/PROJECT.md`
2. `AGENTS.md`
3. `CURRENT_STATE.md`
4. `TASKS.md`
5. `docs/SECURITY.md`
6. `docs/DECISIONS.md`

## Estrutura

```text
src/app/              Next.js App Router
src/components/       componentes de interface
src/lib/tse/          integração e normalização TSE
src/lib/cache/        cache local/Upstash
src/lib/security/     validações e proteções
docs/                 decisões e documentação compartilhada
tests/fixtures/tse/   payloads simulados para testes
```

## Regra central

O navegador nunca consulta o TSE diretamente. O servidor coleta, valida e normaliza os dados; o frontend lê somente o modelo interno do PR+.

## Domínio de referência

`eleicoes.prmais`

O domínio deve ser tratado como configuração até a definição operacional de DNS/hospedagem.
