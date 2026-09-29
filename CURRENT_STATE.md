# Current State

Última atualização: 2026-09-28

## Funcionando

- estrutura inicial do repositório criada;
- aplicação Next.js preparada para desenvolvimento local;
- cache em memória disponível para desenvolvimento;
- endpoint `/api/results` expõe do cache as seis combinações agregadas do MVP com allowlist estrita;
- documentação compartilhada para Codex e Cloud Code criada;
- wireframe de referência incluído na documentação;
- schemas oficiais EA11, EA12, EA14, EA15 e EA20 mapeados em `docs/TSE_SCHEMAS.md`;
- URLs, campos condicionais e regras semânticas necessárias às próximas fixtures e validações documentadas;
- sete fixtures TSE reduzidas disponíveis em `tests/fixtures/tse`, cobrindo configuração, acompanhamento, majoritário, proporcional e município;
- parser e schemas Zod para EA11, EA12, EA14, EA15 e EA20 implementados, incluindo validações aritméticas e de abrangência;
- normalizador EA20 converte os cinco cargos do MVP para o modelo interno tipado do PR+;
- cliente server-side constrói e busca EA11, EA12, EA14, EA15 e EA20 com allowlist, timeout, limite de bytes e conferência requisição/payload;
- snapshots eleitorais válidos são mantidos em last-known-good versionado, sem expiração automática;
- modo JWS obrigatório verifica EdDSA/Ed25519, `kid` e assinatura com as chaves públicas oficiais de cada ambiente.
- timeout do fetch TSE usa timer referenciado e dispara mesmo quando a requisição trava sem I/O pendente.
- adaptador Upstash Redis disponível com configuração validada e cache em memória isolado e restrito ao desenvolvimento.
- coletor server-side descobre eleições pelo EA11 e promove seis resultados agregados, acionado apenas por rota interna autenticada.
- catálogo EA12 versionado armazena as 27 UFs e seus municípios e é exposto por `/api/locations` sem fetch público.
- identidade PR+ aplicada: logos oficiais em `public/brand/`, paleta em tokens CSS e componente `BrandLogo`.
- hero exibe status real da apuração (ao vivo, encerrada, aguardando), horário de Brasília e % de seções, lido do cache.
- abas Paraná / Presidente / Brasil / Municípios com ranking presidencial, cards de Governador, Senado e Deputados e participação nacional, atualizados a cada 30s via `router.refresh()`.

## Em desenvolvimento

- interface completa conforme wireframe e identidade PR+.
- provisionamento do Upstash Redis e da hospedagem de produção.

## Dependências externas ainda não necessárias

- Vercel;
- Upstash Redis;
- DNS de produção;
- origem final do embed da transmissão.

## Próxima prioridade

Transmissão YouTube e Modo TV (WEB-008), busca de municípios (WEB-006) com resultados por município (TSE-010) e mapa (WEB-007).

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

## Handoff TSE-006

- feito: envelope last-known-good versionado, chave por cargo/abrangência e schema runtime completo do modelo interno;
- promoção: aceita apenas resultados normalizados válidos, não regride horário/fase e não regrava o mesmo `sourceId` do TSE;
- retenção: snapshots não usam TTL; erros de validação ou escrita não removem o valor anterior;
- API: continua cache-only, informa `X-Result-Stored-At` e retorna `503` em produção quando não há snapshot, sem fallback silencioso para mock;
- validação: 33 testes, typecheck e build passam;
- risco: a comparação de frescor usa leitura seguida de escrita e pressupõe o coletor único definido na arquitetura; múltiplos coletores exigiriam compare-and-set no Redis;
- falta: validar assinaturas JWS quando disponibilizadas e criar o agendamento/coletor que promove resultados.

## Handoff TSE-007

- feito: consumo opcional de `.json` e modo `.jws` obrigatório sem fallback, integrado ao mesmo timeout e limite de payload;
- criptografia: JWS compacto, algoritmo EdDSA/Ed25519, `kid` estrito e JWKs de desenvolvimento/oficial publicadas pelo TSE;
- ordem: assinatura é verificada antes do parse Zod, da normalização e de qualquer promoção ao last-known-good;
- configuração: `tseClientConfigFromEnv` usa `TSE_JWS_MODE=required` por padrão para acesso remoto;
- validação: 37 testes, typecheck e build passam; EA11 e EA20 reais do simulado foram verificados com sucesso em modo JWS;
- limite: esta é a verificação JWK simplificada indicada pelo manual; cadeia X.509 e consulta de LCR não foram implementadas;
- risco: conferir eventual rotação das chaves no manual oficial antes da eleição;
- falta: integrar Upstash e criar o agendamento/coletor server-side que chama fetch, normalização e promoção.

## Handoff CACHE-001

- feito: resolução explícita do driver, adaptador `CacheStore` para Upstash REST e instanciação com URL/token validados;
- produção: exige `CACHE_DRIVER=upstash` e rejeita cache em memória, driver desconhecido, credenciais ausentes e endpoint fora de `*.upstash.io`;
- segurança: erros de configuração não incluem o token;
- validação: testes cobrem configuração e mapeamento de `get`/`set`, com e sem TTL;
- falta: completar os testes de expiração/isolamento do fallback em memória e conectar o coletor.

## Handoff CACHE-002

- feito: fallback em memória com instâncias isoladas, cópia estruturada na escrita/leitura e expiração determinística;
- consistência: cache local e Upstash rejeitam TTL ausente de integridade, zero, negativo ou fracionário;
- segurança: mutações no objeto original ou retornado não alteram o snapshot armazenado;
- validação: 45 testes e typecheck passam;
- falta: implementar o coletor server-side que usa o cache selecionado pelo ambiente.

## Handoff TSE-008

- feito: descoberta de eleição federal/estadual pelo EA11, suporte a primeiro/segundo turno e plano de coleta por cargo/abrangência;
- primeiro turno: Presidente BR/PR, Governador PR, Senador PR, Deputado Federal PR e Deputado Estadual PR;
- resiliência: cada EA20 é processado independentemente e falha isolada não impede a promoção dos demais;
- acionamento: `GET`/`POST /api/internal/collect` exige Bearer `COLLECTOR_SECRET` com pelo menos 32 caracteres e nunca é chamado pela API pública;
- validação: 51 testes, typecheck e build passam; a prova online promoveu os seis resultados usando sete arquivos JWS reais do simulado;
- falta: ampliar `/api/results` para selecionar identidades permitidas no cache e depois adicionar o catálogo de localidades.

## Handoff API-001

- feito: `/api/results` seleciona Presidente BR/PR, Governador PR, Senador PR, Deputado Federal PR e Deputado Estadual PR exclusivamente no cache;
- compatibilidade: a rota sem parâmetros continua retornando Presidente BR e mantém o mock apenas nessa consulta durante o desenvolvimento;
- segurança: parâmetros desconhecidos, repetidos, incompletos ou combinações fora da matriz pública retornam `400`; ausência de snapshot retorna `503` sem cache;
- validação: 62 testes, typecheck e build passam; o parser cobre todas as combinações permitidas e rejeições antes da leitura do cache;
- falta: coletar, armazenar e expor o catálogo de localidades do EA12 (API-002).

## Handoff API-002

- feito: o coletor busca um EA12 estadual por ciclo, normaliza UFs/municípios e promove um catálogo last-known-good versionado sem TTL;
- API: `/api/locations` retorna o índice leve de estados e `?state=<uf>` retorna um estado com seus municípios, códigos TSE/IBGE, zonas e capital;
- resiliência: falha do catálogo é isolada no relatório e não impede a promoção dos resultados eleitorais; a rota pública nunca consulta o TSE;
- validação: 68 testes, typecheck e build passam; a prova assinada no simulado normalizou 27 UFs, 5.571 municípios e os 399 municípios do Paraná;
- falta: aplicar a identidade visual do PR+ e conectar a interface às APIs internas.

## Handoff TSE-009

- feito: `fetchPayload` troca `AbortSignal.timeout()` por `AbortController` + `setTimeout` referenciado, limpo em `finally` após fetch, leitura, verificação JWS e parse;
- motivo: o timer de `AbortSignal.timeout()` não mantém o event loop do Node ativo; uma requisição parada sem socket aberto nunca expirava e 5 testes de `tse-client` eram cancelados (`Promise resolution is still pending`) no Node 22.23;
- arquivos alterados: `src/lib/tse/client.ts`, `CURRENT_STATE.md` e `TASKS.md`;
- validação: 68 testes (0 cancelados), typecheck e build passam; build executado em cópia fora da pasta montada, pois o ambiente do agente não pode apagar `.next/`;
- falta: nenhuma tarefa TSE pendente; próxima prioridade segue WEB-001.

## Handoff WEB-001

- feito: logos oficiais recortadas das artes em `assets/01-04.png` (azul, bege, verde, laranja) para `public/brand/prmais-*.png` (711×192, fundo transparente);
- paleta: tokens `--prmais-azul #013FA2`, `--prmais-bege #DDDFD2`, `--prmais-verde #0BDB15`, `--prmais-laranja #FF6C00` em `src/app/globals.css`, mais derivados funcionais (tinta, fundo, azul-escuro);
- aplicação: header branco com logo azul, hero azul com status ao vivo em verde, abas em pílula, cards com filete azul, líder do ranking em laranja, rodapé azul com logo bege; `themeColor` azul; foco visível em laranja; `prefers-reduced-motion` respeitado;
- estrutura: blocos e ordem da página mantidos; nenhum dado novo nem chamada a API adicionados; textos corrigidos com acentuação;
- contraste: verde e laranja são usados só sobre azul ou como fundo com texto escuro, nunca como texto sobre branco;
- arquivos alterados: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/BrandLogo.tsx`, `public/brand/*`, `docs/DECISIONS.md`, `CURRENT_STATE.md` e `TASKS.md`;
- validação: 68 testes, typecheck e build passam; página conferida por screenshot em 1280px e 390px;
- pendente: tipografia oficial do PR+ não foi fornecida e não pôde ser obtida do portal; os tokens `--font-display`/`--font-body` usam pilha de sistema (WEB-010);
- pendente: `docs/reference/wireframe-prmais-eleicoes.png` citado em `docs/WIREFRAME.md` não existe no repositório (WEB-011);
- nota: a pasta `assets/` com as artes originais não está versionada; decidir se entra no Git.

## Handoff — definições do wireframe

- feito: wireframe aprovado salvo em `docs/reference/wireframe-prmais-eleicoes.png`; lacunas entre wireframe e portal decididas com o usuário e registradas em `docs/DECISIONS.md`;
- novas tarefas: TSE-010 (resultados por município), TSE-011 (votos por partido), TSE-012 (fotos TSE), API-003 (atualizações automáticas) e WEB-012 (header/rodapé do portal);
- risco: fotos do TSE exigem nova origem allowlisted no coletor e armazenamento; avaliar tamanho no Upstash antes de implementar;
- próximo: WEB-002 e WEB-003, que já podem consumir `/api/results`.

## Handoff WEB-002

- feito: hero conforme wireframe (título, selo de status e bloco "Atualizado às HH:MM" + "% das seções apuradas");
- dados: página renderizada no servidor a partir do cache (`revalidate = 15`) e componente cliente `LiveHero` que consulta `/api/results` a cada 30s, só com a aba visível e timeout de 10s;
- resiliência: resposta 503, erro de rede ou payload inválido mantêm o último estado válido na tela; cache inacessível no render mostra "Aguardando dados" sem derrubar a página;
- estados: "Apuração ao vivo" (laranja), "Apuração encerrada", "Aguardando início" e "Aguardando dados"; avisos para dados de simulação do TSE e dados demonstrativos;
- refatoração: `loadPublicResult` concentra a regra cache → mock (só dev e só na consulta padrão) → indisponível, usada pela API e pela página; comportamento da API inalterado;
- arquivos: `src/lib/tse/public-result-loader.ts`, `src/lib/ui/hero-status.ts`, `src/components/LiveHero.tsx`, `src/app/page.tsx`, `src/app/api/results/route.ts`, `src/app/globals.css`, `tests/web-hero.test.ts`;
- validação: 76 testes, typecheck e build passam; hero conferido por screenshot em desktop e mobile, nos estados sem dados e ao vivo;
- nota: o polling usa a mesma rota pública com `max-age=5`; em produção, avaliar o intervalo junto com o rate limit (OPS-005).

## Handoff TSE-011

- feito: `ElectionResult.groups` com votos por federação/partido isolado nos cargos proporcionais (sigla, nome, partidos, votos nominais + legenda, % sobre válidos e vagas `vag`);
- origem: totais `tvtn`/`tvtl` da agremiação no EA20; no fixture a soma confere com `v.vv`; cargos majoritários retornam `groups: []`;
- compatibilidade: o schema do snapshot usa `groups` com padrão `[]`, então snapshots gravados antes continuam válidos; `/api/results` passa a expor o campo sem mudar parâmetros;
- arquivos: `src/lib/tse/types.ts`, `normalizer.ts`, `result-schema.ts`, `mock.ts` e testes de normalizador/last-known-good;
- validação: 79 testes e typecheck passam;
- risco: confirmar no simulado oficial que `tvtn` já exclui votos anulados de partidos com `dvt=Anulado`.

## Handoff WEB-012

- feito: header com logo + slogan "O Paraná em tempo real", busca que envia para `https://prmais.com/?s=` e faixa de menu com as seções reais do portal; no mobile, menu e busca ficam num `<details>` sem JavaScript;
- rodapé: logo bege, slogan, links das redes do portal (Facebook, Instagram, X, WhatsApp, TikTok) com `rel="noopener noreferrer"` e "Fonte: TSE";
- configuração: links centralizados em `src/lib/site.ts`;
- arquivos: `src/lib/site.ts`, `src/components/SiteHeader.tsx`, `src/components/SiteFooter.tsx`, `src/app/page.tsx`, `src/app/globals.css`;
- validação: typecheck passa; conferido por screenshot em 1280px e 390px.

## Handoff WEB-003 / WEB-004 / WEB-005

- abas: componente cliente `ResultTabs` (ARIA tablist) alterna painéis renderizados no servidor e guarda a aba no hash (`#parana`, `#presidente`, `#brasil`, `#municipios`); sem JS, o primeiro painel aparece;
- conteúdo: Paraná = Presidente nacional (top 5) + bloco estadual (4 cargos, top 3) + mapa; Presidente = rankings completos Brasil e Paraná; Brasil = Presidente nacional + participação (comparecimento, abstenção, válidos, brancos, nulos); Municípios = mapa (placeholder até WEB-007);
- ranking: posição, avatar com iniciais (fotos em TSE-012), nome de urna, partido, barra, %, votos e etiqueta de situação (Eleito, 2º turno, Eleito por QP…); excedentes em "Ver todos" via `<details>`;
- deputados: usam `groups` (TSE-011) com sigla da federação/partido, % e vagas;
- dados: `loadHomeResults` lê as seis identidades do cache em paralelo, isolando falhas por cargo ("Aguardando dados do TSE");
- atualização: `AutoRefresh` chama `router.refresh()` a cada 30s com a aba visível, substituindo o polling do hero (removido `LiveHero`/`parseHeroResult`); a página continua ISR de 15s;
- arquivos: `src/app/page.tsx`, `src/components/{Hero,AutoRefresh,ResultTabs}.tsx`, `src/components/results/*`, `src/lib/tse/home-results.ts`, `src/lib/ui/format.ts`, `src/app/globals.css`, `tests/web-results.test.ts`;
- validação: 80 testes, typecheck e build passam; página conferida com fixtures em desktop e mobile, incluindo troca de abas e hash;
- limite: sem acesso ao TSE a partir do ambiente do agente; a conferência visual usou fixtures só numa cópia temporária, fora do repositório.
