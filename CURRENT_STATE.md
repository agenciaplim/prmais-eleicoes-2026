# Current State

Última atualização: 2026-09-28

## Funcionando

- estrutura inicial do repositório criada;
- aplicação Next.js preparada para desenvolvimento local;
- cache em memória disponível para desenvolvimento;
- endpoint inicial `/api/results` criado;
- documentação compartilhada para Codex e Cloud Code criada;
- wireframe de referência incluído na documentação;
- schemas oficiais EA11, EA12, EA14, EA15 e EA20 mapeados em `docs/TSE_SCHEMAS.md`;
- URLs, campos condicionais e regras semânticas necessárias às próximas fixtures e validações documentadas;
- sete fixtures TSE reduzidas disponíveis em `tests/fixtures/tse`, cobrindo configuração, acompanhamento, majoritário, proporcional e município.

## Em desenvolvimento

- integração real com arquivos do TSE;
- validação dos schemas oficiais;
- conexão com Upstash Redis;
- interface completa conforme wireframe e identidade PR+.

## Dependências externas ainda não necessárias

- Vercel;
- Upstash Redis;
- DNS de produção;
- origem final do embed da transmissão.

## Próxima prioridade

Implementar o fluxo:

`TSE -> validação -> normalização -> cache -> API -> interface`

continuando pelo parser e validação Zod (TSE-003) antes da integração com o ambiente oficial.

## Handoff TSE-001

- feito: mapeamento dos cinco schemas necessários, padrões de URL, códigos de cargo, tipos observados e validações semânticas;
- arquivos alterados: `docs/TSE_SCHEMAS.md`, `CURRENT_STATE.md` e `TASKS.md`;
- falta: criar fixtures reduzidas e então implementar schemas Zod e normalização;
- risco: os PDFs descrevem números como inteiros/decimais, mas o simulado os serializa como strings;
- risco: o EA12 documenta `cdi` com 5 dígitos, enquanto o payload de 2026 usa o código IBGE de 7 dígitos;
- risco: o MVP precisa descobrir e consumir eleições federal e estadual, mas a configuração atual expõe um único `TSE_ELECTION_ID`.

## Handoff TSE-002

- feito: fixtures sintéticas para EA11, EA12, EA14, EA15 e três variantes de EA20;
- cobertura: majoritário, proporcional, município, federação, voto anulado/sub judice, substituição e campos condicionais omitidos;
- validação: todos os JSONs são válidos e as identidades aritméticas de seções, eleitorado e votos passam;
- arquivos alterados: `tests/fixtures/tse/*`, `CURRENT_STATE.md` e `TASKS.md`;
- falta: transformar as estruturas documentadas em schemas Zod e testes automatizados.
