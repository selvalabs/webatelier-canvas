# docs(security): define webservice go-no-go gate

## Problem

A capacidade correspondente ainda precisa de implementação ou hardening incremental.

## Scope

- autenticação
- isolamento de browser
- SSRF e egress
- auditoria

## Out of scope

- mudanças não relacionadas;
- merge automático;
- credenciais reais.

## Acceptance criteria

- lint, testes e typecheck passam;
- diff contém somente o escopo;
- documentação e QA são atualizados;
- PR referencia esta issue e CI fica verde.
