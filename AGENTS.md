# AGENTS.md

Este arquivo é obrigatório para Codex, Cloud Code e qualquer outro agente que trabalhe neste repositório.

## Antes de modificar código

Leia:

1. `docs/PROJECT.md`
2. `CURRENT_STATE.md`
3. `TASKS.md`
4. `docs/SECURITY.md`
5. `docs/DECISIONS.md`

## Regras

- Não alterar arquitetura silenciosamente.
- Não adicionar dependências sem necessidade clara.
- Não expor segredos em código, logs ou commits.
- Nunca fazer o browser consultar o TSE diretamente.
- Não criar proxy genérico para URLs externas.
- Todo payload externo deve ser validado antes de uso.
- Resultado inválido nunca substitui o último resultado válido.
- Não desabilitar testes ou validações para “fazer funcionar”.
- Não fazer deploy em produção sem instrução explícita do usuário.
- Não modificar a estrutura visual principal sem respeitar `docs/WIREFRAME.md`.

## Trabalho paralelo

Antes de iniciar uma tarefa:

1. confira `TASKS.md`;
2. marque a tarefa como `IN_PROGRESS` e informe o agente;
3. use uma branch própria;
4. evite editar arquivos que outro agente está modificando;
5. ao terminar, atualize `CURRENT_STATE.md` e `TASKS.md`.

Formato sugerido de branch:

```text
codex/tse-parser
cloud/web-home
```

## Finalização de tarefa

Uma tarefa só pode ser marcada como concluída quando, quando aplicável:

```text
[ ] implementação concluída
[ ] validações adicionadas
[ ] testes relevantes passando
[ ] typecheck passando
[ ] build passando
[ ] documentação atualizada
[ ] CURRENT_STATE atualizado
[ ] TASKS atualizado
```

## Handoff curto

Ao encerrar trabalho, registre em `CURRENT_STATE.md`:

- o que foi feito;
- principais arquivos alterados;
- o que falta;
- qualquer risco ou decisão nova.
