# feat(editor): bootstrap local-first visual editor

## Problem

O projeto ainda não possui repositório estruturado, documentação, CI ou vertical slice executável.

## Scope

- adicionar PRD, arquitetura, specs, sprints e QA;
- configurar Python, TypeScript e CI;
- criar contratos de ações e patches;
- adicionar launcher Playwright headed;
- adicionar runtime inicial com seleção, transformações e painel;
- integrar Ollama por saída estruturada;
- adicionar testes iniciais.

## Out of scope

- exportação para código-fonte;
- colaboração;
- deploy público;
- autenticação multiusuário.

## Acceptance criteria

- `uv run ruff check .`;
- `uv run pytest`;
- `uv run mypy src`;
- `npm run --prefix editor-runtime typecheck`;
- `npm run --prefix editor-runtime build`;
- QA P0 do vertical slice executado localmente.
