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

- provisionamento do Upstash Redis e da hospedagem de produção.

## Dependências externas ainda não necessárias

- Vercel;
- Upstash Redis;
- DNS de produção;
- origem final do embed da transmissão.

## Próxima prioridade

Integrar as branches `cloud/*` e fazer uma coleta real no simulado a partir do Mac (confirmar fotos, municípios e agremiações); depois operação (OPS-001 a OPS-007).

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

## Handoff WEB-008

- feito: bloco "Cobertura ao vivo" (sidebar, com indicador "Ao vivo" e link "Assistir no YouTube") e bloco "Modo TV / OBS" com o mesmo embed em 16:9, conforme decisão;
- configuração: `LIVE_PROVIDER=youtube` + `LIVE_EMBED_URL` aceitando watch, youtu.be, /live/, /embed/ e `embed/live_stream?channel=UC…`;
- segurança: a URL informada nunca é usada diretamente; o id do vídeo/canal é validado por regex e o iframe é reconstruído em `youtube-nocookie.com`, com `loading="lazy"` e `referrerPolicy`; outro provedor, host, protocolo ou id inválido desliga o embed e mostra "Transmissão em breve";
- arquivos: `src/lib/live.ts`, `src/components/LiveBlocks.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.env.example`, `docs/PROJECT.md`, `tests/live.test.ts`;
- validação: 83 testes e typecheck passam; blocos conferidos por screenshot;
- pendente: ao configurar CSP em produção (OPS), liberar `frame-src https://www.youtube-nocookie.com`.

## Handoff TSE-010

- feito: coleta de EA20 municipal para Presidente (eleição federal) e Governador (eleição estadual) nos municípios do catálogo EA12, com pool de 8 requisições, orçamento `TSE_MUNICIPAL_BUDGET_MS` (padrão 20s, máx. 50s, 0 desliga) e cursor rotativo;
- armazenamento: resumo por cargo com top 5, % apurado, fase e horário por município; entrada anterior preservada em falha ou regressão; uma escrita por execução;
- API: `/api/municipalities?office=president|governor` (lista com líder por município) e `&code=<TSE 5 dígitos>` (top 5 de um município); parâmetros fora da allowlist retornam 400, ausência de dados 503;
- relatório do coletor ganhou `municipal[]` (tentados, atualizados, falhas, total), sem payloads;
- arquivos: `src/lib/tse/municipal-results.ts`, `src/lib/tse/public-municipal.ts`, `src/app/api/municipalities/route.ts`, `src/lib/tse/collector.ts`, `.env.example`, `README.md`, testes;
- validação: 88 testes e typecheck passam;
- pendente: prova online no simulado (o ambiente do agente não acessa o TSE); medir no ensaio (OPS-007) quantos municípios cabem por execução e ajustar orçamento/frequência do coletor.

## Handoff WEB-006

- feito: busca de município no bloco lateral: autocomplete sem acento e por prefixo (depois substring), atalhos "Mais acessados" (Curitiba, Londrina, Maringá, Cascavel, Ponta Grossa) e resultado com top 3 de Presidente e Governador e % apurado;
- dados: lista de `/api/locations?state=pr` e resultados de `/api/municipalities?...&code=`; respostas conferidas por guardas de tipo antes do uso; falha ou 503 mostra "Resultados ainda não disponíveis";
- acessibilidade: combobox/listbox com Enter para escolher a primeira sugestão e Esc para limpar;
- arquivos: `src/components/MunicipalitySearch.tsx`, `src/lib/ui/municipality-search.ts`, `src/app/page.tsx`, `src/app/globals.css`, `tests/web-municipality-search.test.ts`;
- validação: 91 testes e typecheck passam; fluxo conferido no navegador com catálogo e resultados de fixture.

## Handoff WEB-007

- feito: mapa SVG dos 399 municípios (Paraná e aba Municípios), colorido pelo candidato que lidera em cada cidade; os três candidatos com mais municípios recebem azul, laranja e verde, os demais "Outros" e sem resultado "Sem dados";
- interação: seletor Presidente/Governador, hover com líder e %, clique abre o top do município (mesmo componente da busca); dados de `/api/municipalities`, atualizados a cada 60s e mantendo a última lista válida em falha;
- geometria: `public/maps/pr-municipios.json` (224 KB, 79 KB gzip) gerado por `scripts/build-pr-map.py` (stdlib, projeção equiretangular + Douglas-Peucker) a partir de `tbrugz/geodata-br` `geojs-41-mun.json` (perímetros IBGE, CC0 1.0); junção pelo código IBGE de 7 dígitos;
- acessibilidade: SVG com `role="img"` e `<title>` por município; navegação por teclado é atendida pela busca de município;
- arquivos: `src/components/PrMap.tsx`, `src/lib/ui/map-colors.ts`, `scripts/build-pr-map.py`, `public/maps/pr-municipios.json`, `src/app/page.tsx`, `src/app/globals.css`, `tests/web-map.test.ts`;
- validação: 93 testes e typecheck passam; mapa conferido no navegador com dados de fixture;
- pendente (WEB-013): seletor "Selecione uma região" do wireframe; a API do IBGE com a relação município → região não é acessível a partir do ambiente do agente.

## Handoff API-003

- feito: "Últimas atualizações" geradas automaticamente pelo coletor a partir da comparação entre o snapshot anterior e o promovido (`deriveUpdates`);
- eventos: marcos de apuração (10, 25, 50, 60, 75, 90, 95%) do Presidente no Brasil e do Governador no Paraná, primeiro líder e troca de liderança nos cargos majoritários, e resultado final (eleito, 2º turno ou apuração encerrada); comparação reiniciada quando a fase muda (simulado → oficial);
- armazenamento: lista `updates:v1` com até 30 itens, ordenada pelo horário do TSE, com id idempotente (reexecuções não duplicam); falha ao gravar não afeta a coleta;
- `promoteLastKnownGood` passa a devolver também `previous`;
- interface: `UpdatesCard` com horário de Brasília, 5 itens visíveis e "Ver todas as atualizações";
- arquivos: `src/lib/tse/updates.ts`, `src/lib/tse/last-known-good.ts`, `src/lib/tse/collector.ts`, `src/components/UpdatesCard.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `tests/tse-updates.test.ts`, `tests/tse-collector.test.ts`;
- validação: 97 testes e typecheck passam; bloco conferido no navegador.

## Handoff TSE-012

- feito: fotos oficiais dos candidatos a Presidente, Governador e Senador coletadas pelo coletor e servidas por `/api/photos/<sqcand>`; o navegador nunca acessa o TSE;
- cliente: `fetchPhoto` com URL montada só de partes validadas (ciclo, eleição, `br`/UF, `sqcand` numérico), mesma allowlist, HTTPS, sem redirect e timeout; exige `image/jpeg`, assinatura JPEG (`FF D8 FF`) e no máximo 300 KB; leitura de bytes separada da decodificação UTF-8 (`readLimitedBytes`);
- armazenamento: `photos:v1:<sqcand>` em base64 sem TTL, índice `photos:v1:index` para não reler; cada foto é buscada uma vez, até 20 por execução; falha de foto não afeta resultados;
- interface: `Avatar` exibe a foto e volta às iniciais se ela ainda não existir;
- arquivos: `src/lib/tse/client.ts`, `src/lib/tse/photos.ts`, `src/lib/tse/collector.ts`, `src/app/api/photos/[id]/route.ts`, `src/components/results/{Avatar,CandidateList}.tsx`, `src/app/globals.css`, `README.md`, testes;
- validação: 100 testes, typecheck e build passam;
- risco: o caminho `<ciclo>/<eleição>/fotos/<br|uf>/<sqcand>.jpeg` segue o padrão público de 2022/2024 e não pôde ser verificado no simulado 2026 a partir do ambiente do agente; confirmar numa coleta no Mac antes do ensaio (OPS-007);
- custo: ~30 fotos × ~20–40 KB em base64 no Upstash, gravadas uma única vez.

## Handoff WEB-009

- feito: ordem mobile do wireframe (status → ranking → cargos do Paraná → busca → transmissão → atualizações → Modo TV) só com CSS (`display: contents` no aside + `order`), sem duplicar componentes;
- mobile ≤600px: abas em 4 colunas, cards e linhas mais compactos, mapa oculto na aba Paraná (continua na aba Municípios), menu e busca no botão ☰;
- correção: `Avatar` detecta imagem que falhou antes da hidratação e volta às iniciais;
- arquivos: `src/app/globals.css`, `src/app/page.tsx`, `src/components/{LiveBlocks,UpdatesCard}.tsx`, `src/components/results/Avatar.tsx`;
- validação: 100 testes e typecheck passam; conferido em 390px e 1280px com fixtures.

## Estado das branches (2026-09-28)

Branches criadas em sequência, cada uma a partir da anterior, então `cloud/web-mobile` contém todo o trabalho:
`cloud/tse-timeout-timer` → `cloud/web-identity` → `cloud/web-hero` → `cloud/tse-party-groups` → `cloud/web-header-footer` → `cloud/web-results` → `cloud/web-live` → `cloud/tse-municipal` → `cloud/web-municipality-search` → `cloud/web-map` → `cloud/api-updates` → `cloud/tse-photos` → `cloud/web-mobile`.

## Handoff OPS (preparação, sem deploy)

- feito: CSP, HSTS e cache de `/maps` em `next.config.ts` (só produção); conferido no build de produção com Playwright: zero violações de CSP, abas e mapa funcionando;
- robustez: rotas públicas (`results`, `locations`, `municipalities`, `photos`) respondem 503 `no-store` quando o cache está inacessível ou mal configurado, em vez de 500; teste `tests/api-cache-unavailable.test.ts`;
- coletor: `vercel.json` com cron a cada minuto e `maxDuration = 60` na rota interna; `CRON_SECRET` deve ter o mesmo valor de `COLLECTOR_SECRET`;
- scripts: `pnpm check:simulado` (coleta completa no simulado com cache em memória, imprime agregados, municípios, agremiações, foto e atualizações) e `pnpm load-test <url> <s> <clientes>` (sem dependências);
- documentação: `docs/DEPLOY.md` com o roteiro OPS-001 a OPS-007;
- validação: 101 testes, typecheck e build passam (na cópia da nuvem); teste de carga local sem CDN: ~470 req/s com 200 clientes, zero erros de rede — valor indicativo, o teste real é contra o deploy;
- resolvido (2026-10-01): projeto movido para `~/Projetos/prmais-eleicoes-starter`, fora do iCloud; `.git`, `.gitignore` e `.env.example` restaurados da pasta antiga; `git fsck` limpo; 101 testes, typecheck e build passam no Mac;
- pendente: `node_modules` ainda traz cópias `* 2` do iCloud (inofensivas); rodar `rm -rf node_modules && pnpm install` quando conveniente; a pasta antiga em `~/Documents` pode ser apagada.
