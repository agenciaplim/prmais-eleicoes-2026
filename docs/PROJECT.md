# Projeto — PR+ Eleições 2026

## Objetivo

Construir rapidamente uma central de apuração eleitoral do PR+ com foco em:

- Presidência do Brasil;
- resultados do Paraná;
- Governador;
- Senado;
- Deputado Federal;
- Deputado Estadual;
- resultados dos 399 municípios do Paraná;
- mapa do Paraná;
- transmissão ao vivo incorporada à página.

## Princípios

1. simples antes de sofisticado;
2. segurança não é opcional;
3. o TSE é a fonte eleitoral primária;
4. o navegador nunca consulta o TSE diretamente;
5. último resultado válido permanece visível em falhas temporárias;
6. componentes visuais seguem o wireframe aprovado;
7. a identidade visual deve ser a identidade real do PR+;
8. nenhuma arquitetura adicional será criada sem necessidade concreta.

## Stack aprovada

- Next.js
- TypeScript
- Zod
- Upstash Redis em produção
- cache em memória para desenvolvimento local
- Vercel para hospedagem
- Git/GitHub para histórico e coordenação

## Arquitetura

```text
TSE
 |
 v
Next.js server
 |  fetch + timeout + validate + normalize
 v
Cache
 |  local memory em dev / Upstash em produção
 v
API PR+
 |
 v
Frontend
 |
 v
Usuário
```

## Escopo de primeira versão

Incluído:

- layout do wireframe;
- identidade PR+;
- apuração nacional presidencial;
- Paraná;
- cargos estaduais;
- 399 municípios;
- mapa;
- bloco de transmissão ao vivo;
- responsividade;
- fallback de último dado válido.

Não incluir sem nova decisão:

- PostgreSQL;
- microserviços;
- Kubernetes;
- filas;
- painel administrativo próprio;
- staging permanente;
- múltiplos collectors;
- autenticação própria.

## Transmissão

A transmissão deve ser configurável.

A primeira hipótese operacional é Instagram, mas o componente não deve depender estruturalmente de um único provedor.

Variáveis previstas:

```env
LIVE_PROVIDER=youtube
LIVE_EMBED_URL=
```

Se o provedor não permitir embed adequado, o bloco deve suportar CTA/link externo sem quebrar o restante da página.

## Domínio

Referência atual:

`eleicoes.prmais`

Não hardcode o domínio em regras internas; use configuração quando necessário.
