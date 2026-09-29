# Deploy e operação

Roteiro para OPS-001 a OPS-007. Nada aqui é executado automaticamente; o deploy de produção só acontece com instrução explícita.

## Antes de tudo: pasta fora do iCloud

Não manter o repositório em pasta sincronizada pelo iCloud (`~/Documents`, `~/Desktop`). O iCloud remove arquivos de `node_modules` do disco e cria cópias `* 2`, quebrando build e typecheck. Mova para, por exemplo, `~/Projetos/prmais-eleicoes-starter` e rode `pnpm install`.

## 1. Verificar no simulado (Mac, com acesso ao TSE)

```bash
pnpm check:simulado
```

Usa cache em memória, não grava nada. Conferir no relatório:

- os seis resultados agregados com `promoted`;
- `Municípios`: `updated` próximo de 399 por cargo (se não couber no tempo, o cursor continua na execução seguinte);
- `Deputado Federal`: soma das agremiações igual aos votos válidos;
- `Foto do 1º colocado`: tamanho em bytes. Se aparecer "NÃO encontrada", o caminho das fotos (`<ciclo>/<eleição>/fotos/<br|uf>/<sqcand>.jpeg`) mudou em 2026 e precisa ser ajustado em `buildPhotoUrl`.

## 2. Upstash (OPS-002)

Criar um banco Redis na região mais próxima da Vercel (ex.: `sa-east-1`). Copiar `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.

## 3. Vercel (OPS-001, OPS-003)

Importar o repositório do GitHub. Variáveis de produção:

| Variável | Valor |
| --- | --- |
| `CACHE_DRIVER` | `upstash` |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | do passo 2 |
| `TSE_ENV` | `remote` |
| `TSE_BASE_URL` | `https://resultados.tse.jus.br` (ensaio: `https://resultados-sim.tse.jus.br/simulado`) |
| `TSE_RESULTS_ENV` | `oficial` (ensaio: `simulado2026`) |
| `TSE_UF` / `TSE_ROUND` | `PR` / `1` |
| `TSE_JWS_MODE` | `required` |
| `TSE_MUNICIPAL_BUDGET_MS` | `20000` |
| `COLLECTOR_SECRET` | segredo aleatório com 32+ caracteres (`openssl rand -hex 32`) |
| `CRON_SECRET` | **o mesmo valor** de `COLLECTOR_SECRET` (a Vercel envia `Authorization: Bearer $CRON_SECRET` no cron) |
| `LIVE_PROVIDER` / `LIVE_EMBED_URL` | `youtube` / link da live |
| `NEXT_PUBLIC_SITE_URL` | `https://eleicoes.prmais...` |

## 4. Coletor

`vercel.json` agenda `/api/internal/collect` a cada minuto (exige plano Pro; no Hobby o cron é diário). A rota tem `maxDuration = 60` s: agregados + fotos + dois lotes municipais de `TSE_MUNICIPAL_BUDGET_MS`.

Disparo manual:

```bash
curl -X POST -H "Authorization: Bearer $COLLECTOR_SECRET" https://<domínio>/api/internal/collect
```

O coletor pressupõe uma execução por vez. Se o cron atrasar e as execuções se sobrepuserem, a pior consequência é regravar o mesmo snapshot; nunca há regressão, porque a promoção compara fase e horário.

## 5. Domínio (OPS-004)

Adicionar o domínio no projeto da Vercel e criar o CNAME indicado. HSTS já é enviado pelo app em produção.

## 6. Proteção (OPS-005)

Já no código: CSP, HSTS, `nosniff`, `frame-ancestors`, APIs com allowlist de parâmetros e 503 quando o cache falha.

Na Vercel: ativar o Firewall com regra de rate limit para `/api/*` (sugestão inicial: 300 requisições/min por IP) e bloquear `/api/internal/*` para qualquer origem que não seja o cron, se o plano permitir.

## 7. Carga (OPS-006)

Contra a URL de preview ou produção:

```bash
pnpm load-test https://<domínio> 60 200
```

Esperado: 0 erros de rede, nenhum 5xx; páginas e APIs servidas pela CDN (`x-vercel-cache: HIT`).

## 8. Ensaio (OPS-007)

Apontar para o simulado, deixar o cron rodar por pelo menos 30 minutos e conferir: hero e abas atualizando, mapa preenchendo os 399 municípios, fotos, "Últimas atualizações" e a transmissão.
