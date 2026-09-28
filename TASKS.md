# Tasks

Legenda:

- `[ ]` TODO
- `[>]` IN_PROGRESS
- `[x]` DONE

## Fundação

- [x] BASE-001 Criar estrutura inicial do projeto
- [x] BASE-002 Criar documentação compartilhada de agentes
- [x] BASE-003 Criar modo de cache local sem infraestrutura externa

## TSE

- [x] TSE-001 Mapear schemas oficiais necessários (EA11, EA12, EA14, EA15, EA20) — Codex (`codex/tse-schemas`)
- [x] TSE-002 Criar fixtures locais representativas — Codex (`codex/tse-schemas`)
- [ ] TSE-003 Implementar parser e validação Zod
- [ ] TSE-004 Implementar normalizador para modelo PR+
- [ ] TSE-005 Implementar fetch server-side com timeout e limite de payload
- [ ] TSE-006 Implementar last-known-good
- [ ] TSE-007 Adicionar validação JWS quando aplicável

## Cache

- [ ] CACHE-001 Integrar Upstash Redis
- [ ] CACHE-002 Manter fallback local em desenvolvimento

## Interface

- [ ] WEB-001 Aplicar identidade visual real do PR+
- [ ] WEB-002 Implementar hero “Eleições 2026 / Apuração ao vivo”
- [ ] WEB-003 Implementar abas Paraná / Presidente / Brasil / Municípios
- [ ] WEB-004 Implementar ranking presidencial
- [ ] WEB-005 Implementar Governador / Senado / Deputados
- [ ] WEB-006 Implementar busca dos 399 municípios
- [ ] WEB-007 Implementar mapa do Paraná
- [ ] WEB-008 Implementar bloco de transmissão ao vivo configurável
- [ ] WEB-009 Implementar versão mobile conforme wireframe

## Operação

- [ ] OPS-001 Criar projeto na Vercel
- [ ] OPS-002 Criar Upstash Redis
- [ ] OPS-003 Configurar variáveis de produção
- [ ] OPS-004 Configurar domínio `eleicoes.prmais`
- [ ] OPS-005 Adicionar rate limiting/WAF conforme ambiente final
- [ ] OPS-006 Teste de carga básico
- [ ] OPS-007 Ensaio da apuração antes do dia da eleição
