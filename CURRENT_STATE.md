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
- sete fixtures TSE reduzidas disponíveis em `tests/fixtures/tse`, cobrindo configuração, acompanhamento, majoritário, proporcional e município;
- parser e schemas Zod para EA11, EA12, EA14, EA15 e EA20 implementados, incluindo validações aritméticas e de abrangência;
- normalizador EA20 converte os cinco cargos do MVP para o modelo interno tipado do PR+;
- cliente server-side constrói e busca EA11, EA12, EA14, EA15 e EA20 com allowlist, timeout, limite de bytes e conferência requisição/payload.

## Em desenvolvimento

- integração da coleta TSE com cache e API;
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

continuando pelo armazenamento last-known-good (TSE-006).

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

## Handoff TSE-003

- feito: schemas Zod e parser tipado para EA11, EA12, EA14, EA15 e EA20, com erros sanitizados e campos adicionais descartados;
- validações semânticas: identidades de seções, eleitorado e votos, coerência da abrangência e condicionais de cargo/município;
- validação: 11 testes automatizados, typecheck e build passam; nove payloads completos do simulado oficial passaram pelos schemas;
- divergências cobertas: `cdi` vazio no exterior, `nfed` vazio, contadores municipais opcionais no EA14 Brasil e siglas longas de teste no EA20;
- falta: normalizar o EA20 validado para o modelo interno PR+.

## Handoff TSE-004

- feito: modelo interno PR+ ampliado e normalizador EA20 para Presidente, Governador, Senador, Deputado Federal e Deputado Estadual;
- dados normalizados: abrangência, cargo, fase, horários, progresso, seções, eleitorado, votos, candidatos, chapas, substituições e situação eleitoral;
- compatibilidade: os campos originais usados pela API (`scope`, `office`, `updatedAt`, `progress` e `candidates`) foram preservados;
- validação: 17 testes e typecheck passam; os cinco cargos também foram normalizados a partir dos payloads completos do simulado;
- decisão: horários TSE são expostos em ISO 8601 com offset de Brasília (`-03:00`) no ciclo de 2026;
- falta: buscar os arquivos server-side e validar a coerência entre a requisição e o payload retornado.

## Handoff TSE-005

- feito: cliente server-side tipado para EA11, EA12, EA14, EA15 e EA20, com caminhos específicos e sem suporte a URL fornecida por usuário;
- segurança: allowlist dos hosts oficial/simulado, HTTPS obrigatório, redirects bloqueados, timeout durante headers e streaming, content type e limite de 5 MiB por padrão;
- coerência: fase, eleição, UF, abrangência e cargo são comparados com a requisição antes do retorno;
- configuração: acesso remoto exige `TSE_ENV=remote`; timeout e limite de payload podem ser reduzidos por ambiente dentro de limites defensivos;
- validação: 27 testes e typecheck passam; os cinco tipos de arquivo foram buscados e validados no simulado oficial, incluindo os 399 municípios do Paraná;
- falta: promover somente snapshots válidos ao last-known-good e conectar a coleta à API sem fetch por requisição pública.
