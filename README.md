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

O coletor é acionado separadamente da API pública. Com `COLLECTOR_SECRET` configurado, uma execução manual pode ser feita com:

```bash
curl -X POST -H "Authorization: Bearer $COLLECTOR_SECRET" http://localhost:3000/api/internal/collect
```

A resposta informa quais resultados e catálogo foram promovidos, permaneceram inalterados ou falharam, sem incluir payloads externos ou segredos.

Os resultados públicos são lidos somente do cache. Sem parâmetros, a API retorna Presidente no Brasil. As combinações disponíveis são:

```text
/api/results
/api/results?office=president&scope=br
/api/results?office=president&scope=pr
/api/results?office=governor&scope=pr
/api/results?office=senator&scope=pr
/api/results?office=federal-deputy&scope=pr
/api/results?office=state-deputy&scope=pr
```

Em desenvolvimento, apenas a consulta padrão usa dados mock quando o coletor ainda não produziu um snapshot. As demais consultas retornam `503` até que seus dados estejam no cache.

O catálogo de localidades também é cache-only. A consulta sem parâmetros retorna o índice de estados; uma UF selecionada retorna seus municípios, códigos TSE/IBGE, zonas e indicação de capital:

```text
/api/locations
/api/locations?state=pr
```

O parâmetro `state` aceita uma única sigla minúscula. UFs ausentes no catálogo retornam `404`, e o catálogo ainda não coletado retorna `503`.

Resultados por município (Presidente e Governador no Paraná), também cache-only:

```text
/api/municipalities?office=president              lista leve: líder e % apurado de cada município
/api/municipalities?office=governor&code=75353    um município (código TSE de 5 dígitos), top 5
```

Fotos oficiais dos candidatos majoritários, coletadas pelo servidor e servidas pela nossa origem:

```text
/api/photos/<sqcand>
```

O coletor busca os municípios em lotes: cada execução usa até `TSE_MUNICIPAL_BUDGET_MS` por cargo e continua de onde parou na execução seguinte.

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
