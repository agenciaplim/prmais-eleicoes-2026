# Segurança

O objetivo é manter uma base segura sem aumentar desnecessariamente a complexidade.

## Regras obrigatórias

### 1. TSE somente server-side

O browser não acessa endpoints do TSE.

### 2. Fonte externa fixa

Usuários não podem fornecer URL, host ou caminho para o coletor acessar.

Evitar SSRF e proxies genéricos.

### 3. Validar tudo que vem de fora

Antes de publicar dados:

```text
fetch
-> verificar status HTTP
-> limitar tamanho
-> validar tipo esperado
-> verificar assinatura JWS quando exigida
-> parse
-> validar schema
-> validar campos semânticos
-> normalizar
-> promover como último resultado válido
```

### 4. Last-known-good

Falha de rede, schema ou assinatura nunca limpa os resultados atuais.

A aplicação mantém o último snapshot válido e informa sua data/hora.

Snapshots eleitorais são revalidados no modelo interno antes da promoção, armazenados em envelope versionado sem TTL e não podem regredir de fase oficial para simulada nem para uma totalização mais antiga. Em produção, ausência ou corrupção do snapshot resulta em `503`, nunca em mock silencioso.

Falha de assinatura JWS encerra a coleta e não aciona fallback para o arquivo JSON sem assinatura.

### 5. Secrets

Nunca commitar:

- `.env.local`;
- tokens Upstash;
- tokens Vercel;
- `COLLECTOR_SECRET`;
- certificados/chaves privadas;
- qualquer credencial.

### 6. HTML externo

Conteúdo externo é texto/dado, não HTML.

Evitar `dangerouslySetInnerHTML`.

### 7. API pública pequena

Não criar endpoints genéricos de consulta ou execução.

As APIs públicas aceitam apenas combinações de cargo/abrangência predefinidas ou uma única sigla de UF validada. Parâmetros desconhecidos, repetidos ou incompletos são recusados antes da leitura do cache.

O coletor só pode ser acionado pela rota interna autenticada com Bearer secret. Falhas de autenticação são recusadas antes de carregar configuração TSE/cache ou iniciar qualquer fetch.

### 8. Cache

Usuários consultam nosso cache. Uma requisição pública nunca deve disparar uma nova consulta individual ao TSE.

### 9. Timeouts e retry

Toda chamada ao TSE deve ter timeout.

Retry deve ter limite e backoff.

### 10. Headers e edge

Na produção, configurar HTTPS, CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` e proteções de edge/WAF disponíveis.

### 11. Rate limit

Aplicar rate limiting nos endpoints públicos quando a hospedagem estiver definida.

### 12. Logs

Não registrar tokens, segredos ou credenciais.

Registrar erros de coleta e horário do último sucesso.

### 13. Dependências

Manter poucas dependências e lockfile versionado após a primeira instalação.

### 14. Produção

Nenhum fixture ou mock pode ser selecionado silenciosamente em produção.

A aplicação deve falhar de forma segura se configuração obrigatória estiver ausente.
