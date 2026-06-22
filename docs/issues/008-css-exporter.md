# feat(export): generate reviewable CSS patches

## Problem

A capacidade correspondente ainda precisa de implementação ou hardening incremental.

## Scope

- preview de diff
- backup
- sem escrita automática sem aprovação

## Out of scope

- mudanças não relacionadas;
- merge automático;
- credenciais reais.

## Acceptance criteria

- lint, testes e typecheck passam;
- diff contém somente o escopo;
- documentação e QA são atualizados;
- PR referencia esta issue e CI fica verde.
