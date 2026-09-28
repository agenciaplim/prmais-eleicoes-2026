# Fixtures TSE

Payloads sintéticos e reduzidos, baseados nos schemas oficiais e na serialização observada no simulado do TSE em 28/09/2026.

Eles não reproduzem resultados reais e usam nomes genéricos. Fixtures nunca devem ser selecionadas silenciosamente em produção.

## Catálogo

| Arquivo | Cobertura principal |
| --- | --- |
| `ea11-election-config.json` | pleito, eleições federal/estadual, cargos e templates de diretório |
| `ea12-pr-municipalities.json` | códigos TSE/IBGE, capital, município e zonas |
| `ea14-br-progress.json` | agregados Brasil e Paraná, seções e eleitorado |
| `ea15-pr-progress.json` | agregado estadual e municípios em estágios diferentes |
| `ea20-president-br.json` | majoritário parcial, vice, voto anulado sub judice e substituição |
| `ea20-deputy-federal-pr.json` | proporcional final, federação, legenda e campos sem `vs` |
| `ea20-president-curitiba.json` | abrangência municipal e campos condicionais omitidos |

## Regras

- valores numéricos permanecem strings, como chegam nos payloads de 2026;
- percentuais de exibição usam vírgula e duas casas;
- percentuais precisos usam vírgula e até nove casas, exceto `0` e `100`;
- códigos preservam zeros à esquerda quando fazem parte de nomes de arquivo;
- relações aritméticas de seções, eleitorado e votos são coerentes;
- cada arquivo representa somente os registros necessários para o cenário de teste.
