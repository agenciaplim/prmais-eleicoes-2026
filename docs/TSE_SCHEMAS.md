# Schemas TSE 2026

Mapeamento dos arquivos oficiais necessários ao PR+ Eleições 2026.

Última conferência: 2026-09-28, durante o simulado nacional do TSE.

## Fontes oficiais

- [Informações técnicas sobre a divulgação de resultados 2026](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados)
- [Instruções para download dos arquivos (versão 1.0 de 25/05/2026)](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-instrucoes-para-download-dos-arquivos-da-divulgacao-2026)
- [EA11 - Configuração de eleições (23/06/2026)](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea11-arquivo-de-configuracao-de-eleicoes)
- [EA12 - Configuração de municípios (22/05/2026)](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea12-arquivo-de-configuracao-de-municipios)
- [EA14 - Acompanhamento Brasil (10/06/2026)](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea14-arquivo-de-acompanhamento-brasil)
- [EA15 - Acompanhamento UF (10/06/2026)](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea15-arquivo-de-acompanhamento-uf)
- [EA20 - Resultado unificado (10/07/2026)](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea20-arquivo-de-resultado-unificado)

Os PDFs vigentes são o contrato de referência. Os payloads do simulado foram usados apenas para confirmar serialização, campos condicionais e cardinalidade. O TSE pode publicar novas versões; conferir a página técnica antes de congelar os schemas de produção.

## Fluxo e abrangência do PR+

```text
EA11 configuração de eleições
  ├── identifica pleito, ciclo, eleições, cargos e diretórios
  ├── EA12 lista UFs, municípios e zonas
  ├── EA14 acompanha Brasil e UFs
  ├── EA15 acompanha Paraná e seus 399 municípios
  └── EA20 entrega o resultado de cada cargo e abrangência
```

Para o primeiro turno de 2026, a página oficial informa o pleito `3220`, a eleição federal `6257` e a eleição estadual `6259`. Esses valores não devem ser fixados no parser: o coletor deve descobri-los pelo EA11 e validar que correspondem ao turno, tipo de eleição e cargos esperados.

Arquivos necessários para o MVP:

| Uso | Arquivo |
| --- | --- |
| Descoberta de configuração | EA11 |
| Relação dos 399 municípios do Paraná | EA12 da eleição estadual |
| Progresso nacional da eleição federal | EA14 da eleição federal |
| Progresso estadual e municipal do Paraná | EA15 da eleição estadual |
| Presidente no Brasil | EA20, cargo `0001`, abrangência `br` |
| Presidente no Paraná | EA20, cargo `0001`, abrangência `pr` |
| Governador do Paraná | EA20, cargo `0003`, abrangência `pr` |
| Senador pelo Paraná | EA20, cargo `0005`, abrangência `pr` |
| Deputado Federal pelo Paraná | EA20, cargo `0006`, abrangência `pr` |
| Deputado Estadual pelo Paraná | EA20, cargo `0007`, abrangência `pr` |
| Resultado por município | EA20 municipal por cargo, usando o código TSE do EA12 |

## Construção segura de URLs

O host deve vir de configuração interna e ser comparado com uma allowlist. Nunca aceitar host, URL ou caminho fornecido pelo usuário.

```text
EA11  <base>/<ambiente>/comum/config/ele-c.json
EA12  <base>/<ambiente>/<ciclo>/<eleicao>/config/mun-e<eleicao-6>-cm.json
EA14  <base>/<ambiente>/<ciclo>/<eleicao>/dados/br/br-e<eleicao-6>-ab.json
EA15  <base>/<ambiente>/<ciclo>/<eleicao>/dados/<uf>/<uf>-e<eleicao-6>-ab.json
EA20 BR
      <base>/<ambiente>/<ciclo>/<eleicao>/dados/br/br-c<cargo-4>-e<eleicao-6>-u.json
EA20 UF
      <base>/<ambiente>/<ciclo>/<eleicao>/dados/<uf>/<uf>-c<cargo-4>-e<eleicao-6>-u.json
EA20 município
      <base>/<ambiente>/<ciclo>/<eleicao>/dados/<uf>/<uf><municipio-5>-c<cargo-4>-e<eleicao-6>-u.json
```

Regras de formato:

- UF em minúsculas; Brasil usa `br` e exterior usa `zz`;
- município com 5 dígitos e zeros à esquerda;
- cargo com 4 dígitos e prefixo `c`;
- eleição com 6 dígitos e prefixo `e`;
- o caminho deve ser montado por funções específicas para cada tipo de arquivo;
- não transformar `arq[].dir` em proxy genérico nem aceitar tokens fora do conjunto documentado.

## Convenções de tipos

Apesar de os PDFs usarem os termos `inteiro` e `decimal`, todos os valores escalares numéricos observados no simulado de 2026 chegaram como strings JSON. O schema de entrada deve, portanto, validar strings sem coerção implícita e o normalizador deve convertê-las depois.

| Classe | Formato de entrada observado |
| --- | --- |
| Contagem/código numérico | string de dígitos, como `"29327"` |
| Percentual de exibição | string com vírgula e 2 casas, como `"85,15"` |
| Percentual preciso | string com vírgula e até 9 casas, ou `"0"`/`"100"` |
| Data | `dd/mm/aaaa` |
| Hora | `hh:mm:ss` |
| Indicador | enum string, geralmente `s`/`n` |

Não converter identificadores com `Number` antes de preservar a forma canônica: códigos de município, zona, cargo e eleição dependem de zeros à esquerda nos nomes de arquivo.

## EA11 - Configuração de eleições

Nome: `ele-c.json`.

```text
raiz
├── dg, hg, idg, f
├── arq[] { tp, dir }
└── pl[]
    ├── cd, cdpr, c, dt, dtlim
    └── e[]
        ├── cd, cdt2, sqele, nm, t, tp
        └── abr[]
            ├── cd
            ├── cp[] { cd, ds, tp }
            └── mu[] { cd, cdi } (condicional)
```

Campos centrais:

| Campo | Significado / validação |
| --- | --- |
| `f` | fase `s` (simulado) ou `o` (oficial) |
| `arq[].tp` | tipo do diretório: `e`, `u`, `ab`, `cm`, `cs`, `a`, `aux`, `ft`; o simulado também publicou `t`, não descrito no dicionário |
| `pl[].cd` | código do pleito |
| `pl[].c` | ciclo, por exemplo `ele2026` |
| `e[].cd` / `cdt2` | eleição atual e eventual eleição de segundo turno |
| `e[].tp` | `1` estadual ordinária, `3` municipal ordinária, `8` federal ordinária; o PDF define também `2`, `4`, `5`, `6`, `7` e `9` |
| `e[].abr[].cp[].cd` | cargo: `1`, `3`, `5`, `6`, `7`, `8`, `11` ou `13`, conforme eleição |
| `cp[].tp` | tipo do cargo/pergunta; validar como código opaco até o normalizador |

No payload observado, `abr[].mu` não estava presente e `cdt2` podia ser string vazia. Ambos devem ser condicionais no schema de entrada.

## EA12 - Configuração de municípios

Nome: `mun-e<eleição-6>-cm.json`.

```text
raiz { dg, hg, idg, f }
└── abr[]
    ├── cd, ds
    └── mu[] { cd, cdi, nm, c, z[] }
```

| Campo | Significado / validação |
| --- | --- |
| `abr[].cd` | UF em minúsculas ou `zz` |
| `mu[].cd` | código TSE com exatamente 5 dígitos |
| `mu[].cdi` | código IBGE; validar 7 dígitos no payload de 2026 |
| `mu[].nm` | nome do município/localidade |
| `mu[].c` | capital: `s` ou `n` |
| `mu[].z[]` | zonas com exatamente 4 dígitos |

Divergência oficial observada: o PDF EA12 descreve `cdi` como código IBGE de 5 dígitos, mas o simulado publicou códigos IBGE de 7 dígitos, como `4100103`. A fixture e o schema devem seguir o payload oficial observado e manter um teste que documente essa diferença.

No simulado, a abrangência `pr` continha exatamente 399 municípios.

## EA14 - Acompanhamento Brasil

Nome: `br-e<eleição-6>-ab.json`.

```text
raiz { ele, t, f, dg, hg, idg }
└── abr[]
    ├── and, tpabr, cdabr, dt, ht
    ├── contadores de UFs (somente tpabr=br)
    ├── contadores de municípios
    ├── s { métricas de seções }
    └── e { métricas de eleitorado }
```

`tpabr` aceita `br` ou `uf`; `cdabr` deve ser coerente com o tipo. Os grupos condicionais são:

- Brasil: `ufsnr`, `ufspt`, `ufsf` e seus percentuais;
- Brasil e/ou UF conforme o registro: `munnr`, `munpt`, `munf` e seus percentuais;
- todos os registros: `s` e `e`.

O EA14 serve para detectar quais UFs mudaram e direcionar a leitura dos EA20. `dt`/`ht` indicam a última totalização da abrangência, mas podem ficar temporariamente à frente do EA20 por causa da sincronização paralela da CDN.

## EA15 - Acompanhamento UF

Nome: `<uf>-e<eleição-6>-ab.json`.

A raiz é igual à do EA14. Cada item de `abr[]` contém `and`, `tpabr`, `cdabr`, `dt`, `ht`, `s` e `e`.

| `tpabr` | `cdabr` | Campos adicionais |
| --- | --- | --- |
| `uf` | sigla da UF | `munnr`, `munpt`, `munf` e percentuais |
| `mun` | código TSE de 5 dígitos | nenhum contador agregado de municípios |

No simulado estadual de 2026, o arquivo do Paraná continha 400 registros: 399 municípios e um agregado `tpabr=uf`, `cdabr=pr`.

Assim como no EA14, `dt`/`ht` são gatilhos de atualização, não prova de que o EA20 correspondente já chegou à CDN.

## Métricas compartilhadas por EA14, EA15 e EA20

### Seções (`s`)

```text
ts = st + snt
st = si + sni
si = sa + sna
```

| Campo | Significado |
| --- | --- |
| `ts` | total de seções |
| `st` / `snt` | seções totalizadas / não totalizadas |
| `si` / `sni` | seções instaladas / não instaladas |
| `sa` / `sna` | seções apuradas / marcadas como não apuradas |

Cada quantidade, exceto `ts`, possui percentuais de exibição e preciso com prefixo `p`, por exemplo `pst` e `pstn`.

### Eleitorado (`e`)

```text
te = est + esnt
est = esi + esni
esi = esa + esna
esi = c + a
```

| Campo | Significado |
| --- | --- |
| `te` | total de eleitores aptos |
| `est` / `esnt` | eleitorado em seções totalizadas / não totalizadas |
| `esi` / `esni` | eleitorado em seções instaladas / não instaladas |
| `esa` / `esna` | eleitorado em seções apuradas / não apuradas |
| `c` / `a` | comparecimento / abstenção |

Os percentuais seguem a mesma convenção (`pest`/`pestn`, `pc`/`pcn`, `pa`/`pan` etc.). As identidades acima devem ser verificações semânticas antes de promover um snapshot como último resultado válido.

## EA20 - Resultado unificado

Nomes:

- Brasil: `br-c<cargo-4>-e<eleição-6>-u.json`;
- UF: `<uf>-c<cargo-4>-e<eleição-6>-u.json`;
- município: `<uf><município-5>-c<cargo-4>-e<eleição-6>-u.json`;
- zona: `<uf><município-5>-z<zona-4>-c<cargo-4>-e<eleição-6>-u.json`.

### Raiz

```text
ele, t, f, sup, tpabr, cdabr
dg, hg, idg
dv, dt, ht, tf, and
md? , esae? , mnae?
carg[] | perg[]
s, e, v
```

| Campo | Significado / condição |
| --- | --- |
| `tpabr` | `br`, `uf`, `mu` ou `zona` |
| `dv` | se a votação pode ser divulgada; quando `n`, votos de Presidente vêm zerados |
| `tf` | existe totalização final (`s`/`n`) |
| `and` | `n` não iniciada, `p` parcial, `f` finalizada |
| `md` | opcional; majoritário matematicamente definido: `e`, `s` ou `n`, antes da totalização final |
| `esae` | eleição sem atribuição de eleito; documentado para depois da totalização final |
| `mnae[]` | motivos de não atribuição; preenchido quando `esae=s` |

`and=f` não significa sempre `tf=s`. Em resultados municipais de eleições estaduais/federais, `and=f` pode indicar apenas `s.snt=0`.

### Cargos, partidos e candidatos

```text
carg[]
├── cd, nmn, nmm, nmf, nv, qe?
├── fed[] { n, nm, sg, com, npar[] }
└── agr[]
    ├── n, nm, tp, com, tvtn?, tvtl?, tvan?, tval?, vag?
    └── par[]
        ├── n, sg, nm, nfed, dvt?, tvtn, tvtl?, tvan, tval?
        └── cand[]
            ├── n, sqcand, nm, nmu, dt, dvt, seq, e, st
            ├── vap, pvap, pvapn
            ├── vs[]? { tp, sqcand, nm, nmu, sgp }
            └── subs[]? { nm, nmu, sgp }
```

Condicionalidade relevante:

- `qe`, votos de legenda (`tvtl`/`tval`) e certas vagas por agremiação são de cargos proporcionais;
- `vs[]` aparece em cargos majoritários: vice para Presidente/Governador e suplentes `s1`/`s2` para Senador;
- candidatos proporcionais observados não traziam `vs`;
- `dvt` pode só aparecer após a primeira totalização parcial;
- `st` só é preenchido na totalização final;
- `e=s` também identifica candidato que disputará segundo turno;
- `carg` não existe em consulta popular, que usa `perg[].resp[]`;
- listas podem estar vazias e campos condicionais podem ser omitidos, nunca presumidos.

### Votos (`v`)

```text
tv = vvc + vb + tvn + vscv
vvc = vv + van + vansj
vv = vnom + vl
tvn = vn + vnt
```

| Campo | Significado |
| --- | --- |
| `tv` | total de votos computados |
| `vvc` | votos a votáveis concorrentes |
| `vv` | votos válidos |
| `vnom` / `vl` | votos nominais / de legenda |
| `van` / `vansj` | anulados / anulados sub judice |
| `vb` | brancos |
| `tvn` | total de nulos |
| `vn` / `vnt` | nulos / nulos técnicos |
| `vscv` | votos sem candidato para votar |
| `vsan` | votos sem anulação, conforme campo oficial adicional |

Os pares percentuais usam o mesmo padrão de exibição e precisão (`pvap`/`pvapn`, `pvv`/`pvvn`, `ptvn`/`ptvnn` etc.). `vl` e seus percentuais só existem para cargos proporcionais.

## Regras para fixtures, parser e normalizador

1. Preservar o JSON bruto apenas em testes; a API pública expõe somente o modelo interno PR+.
2. Validar o envelope e os campos críticos antes de converter qualquer valor.
3. Validar formatos lexicais com regex: dígitos, datas, horas e percentuais com vírgula.
4. Modelar campos condicionais como opcionais e aplicar refinamentos por cargo, abrangência e fase.
5. Tolerar novos campos aditivos do TSE sem publicá-los; campos obrigatórios ausentes continuam sendo erro.
6. Verificar coerência entre URL solicitada e payload: eleição, cargo, fase, turno e abrangência.
7. Verificar identidades de seções, eleitorado e votos quando os campos necessários estiverem presentes.
8. Rejeitar percentuais fora de `0..100`, contagens negativas e relações impossíveis.
9. Converter vírgula decimal de forma explícita no normalizador, sem depender de locale do processo.
10. Nunca promover payload inválido ao last-known-good.

## Pontos em aberto para as próximas tarefas

- TSE-002 deve criar fixtures pequenas e representativas, sem copiar payloads completos de centenas de KB.
- As fixtures precisam cobrir majoritário, proporcional, município, campos condicionais ausentes, destinação anulada/sub judice e candidato substituído.
- TSE-003 deve separar schema de entrada (strings do TSE) de tipos normalizados (números e datas internas).
- A configuração atual possui um único `TSE_ELECTION_ID`, mas o MVP consome ao menos as eleições federal e estadual. A modelagem da configuração deve ser ajustada na tarefa de fetch, sem fixar os códigos de 2026 no código.
- Antes da operação oficial, repetir a conferência das versões dos PDFs e executar as fixtures contra uma janela de simulado ou carga oficial zerada.
