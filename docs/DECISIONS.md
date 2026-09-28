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
