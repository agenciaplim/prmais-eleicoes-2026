# Decisions

## 2026-09-28 — Aplicação única

**Decisão:** utilizar uma única aplicação Next.js.

**Motivo:** reduzir tempo de desenvolvimento e operação.

---

## 2026-09-28 — Sem PostgreSQL no MVP

**Decisão:** usar cache/estado atual em Redis, sem banco relacional inicialmente.

**Motivo:** o produto é de curta duração e não exige persistência relacional para sua função principal.

---

## 2026-09-28 — Vercel + Upstash

**Decisão:** usar Vercel para a aplicação e Upstash Redis para cache em produção.

**Motivo:** implantação rápida, boa adequação a carga variável e pouca operação de infraestrutura.

---

## 2026-09-28 — Desenvolvimento local sem infraestrutura

**Decisão:** `CACHE_DRIVER=memory` por padrão local.

**Motivo:** Codex, Cloud Code e desenvolvedores podem iniciar o projeto sem provisionar serviços externos.

---

## 2026-09-28 — Wireframe como contrato visual

**Decisão:** manter a estrutura de blocos do wireframe aprovado.

**Motivo:** evitar reinterpretação da interface por agentes diferentes.

A identidade visual utilizada será a do PR+.

---

## 2026-09-28 — Municípios e mapa na primeira versão

**Decisão:** incluir busca dos 399 municípios e mapa do Paraná desde a primeira versão.

---

## 2026-09-28 — Transmissão configurável

**Decisão:** não acoplar o componente de live a um provedor específico.

**Contexto:** Instagram é a primeira hipótese, ainda sujeita à decisão operacional final.

---

## 2026-09-28 — Horários TSE em ISO 8601

**Decisão:** tratar os horários publicados pelo TSE no ciclo de 2026 como horário de Brasília e expô-los no modelo interno em ISO 8601 com offset `-03:00`.

**Motivo:** remover a dependência do locale e do fuso do servidor sem perder o horário original da totalização.

---

## 2026-09-28 — Last-known-good sem expiração

**Decisão:** armazenar resultados normalizados em envelope versionado, sem TTL, e promover somente snapshots válidos que não representem regressão de fase ou totalização.

**Motivo:** falhas temporárias do TSE, do coletor ou do cache não podem retirar do ar o último resultado eleitoral confiável.

---

## 2026-09-28 — Verificação JWS por JWK

**Decisão:** usar `jose` para verificar os arquivos JWS compactos com EdDSA/Ed25519 e as JWKs públicas fixadas no manual do TSE, sem fallback para JSON quando o modo for obrigatório.

**Motivo:** é o fluxo recomendado pelo TSE para verificação em código e garante integridade/autenticidade antes do parser e do cache.

**Limite:** cadeia X.509 e consulta de LCR ficam fora do MVP; devem ser adicionadas se houver requisito formal de auditoria ou conformidade.

---

## 2026-09-28 — Cache em memória compatível com Redis

**Decisão:** o fallback local copia valores na escrita e leitura, valida TTL e mantém estado isolado por instância.

**Motivo:** evitar diferenças de comportamento que permitam mutar por referência um snapshot que, em produção, atravessaria uma fronteira de serialização no Redis.

---

## 2026-09-28 — Catálogo de localidades pelo EA12 estadual

**Decisão:** normalizar o EA12 da eleição estadual em um catálogo versionado de UFs e municípios, excluindo a abrangência `zz` de localidades no exterior.

**Motivo:** o arquivo estadual observado no simulado contém as 27 UFs e 5.571 municípios brasileiros; ele atende a busca dos 399 municípios do Paraná sem misturar localidades estrangeiras ao índice de estados.

**API:** `/api/locations` publica apenas o índice leve de UFs; `/api/locations?state=<uf>` publica os municípios de uma UF por vez.

---

## 2026-09-28 — Tokens de identidade PR+

**Decisão:** concentrar a identidade em variáveis CSS (`--prmais-*`, `--font-*`) em `globals.css` e servir as logos como PNG recortado em `public/brand/` via `next/image`.

**Motivo:** a paleta vem diretamente das quatro variantes oficiais da logo; trocar a tipografia ou ajustar cores exige alterar apenas os tokens.

**Limite:** verde (`#0BDB15`) e laranja (`#FF6C00`) não têm contraste suficiente como texto sobre branco e só devem ser usados sobre azul ou como fundo de elementos com texto escuro.
