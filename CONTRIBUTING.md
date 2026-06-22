# Contribuindo

## Fluxo obrigatório

Cada mudança deve seguir:

```text
Issue -> Branch -> Implementação local -> Validação local -> Commit -> Push -> PR -> CI -> Revisão -> Merge -> Sync local
```

A issue funciona como mini-spec operacional e deve declarar problema, escopo, fora de escopo, critérios de aceitação e comandos de validação.

## Nomenclatura

Use Conventional Commits em issues, branches, commits e Pull Requests.

Exemplos:

```text
feat(editor): add element selection overlay
fix(snap): correct viewport center guideline
feat/editor-selection-overlay
```

## Preparação da branch

```powershell
git checkout main
git pull origin main
git checkout -b feat/scope-short-name
git branch --show-current
```

## Validação antes do commit

```powershell
uv run ruff check . --fix
uv run ruff check .
uv run pytest
uv run mypy src
npm run --prefix editor-runtime typecheck
npm run --prefix editor-runtime build
git status --short
git diff --stat
```

Arquivos novos não aparecem em `git diff --stat` antes do stage. Use:

```powershell
git add <arquivos>
git diff --cached --stat
```

Não commite automaticamente após aplicar um patch. Revise o diff e os resultados primeiro.

## Segurança

Nunca commite tokens, senhas, chaves, `.env` real, dados reais de usuários ou dumps sensíveis. Novas variáveis devem ser documentadas em `.env.example` com placeholders seguros.

## Pull Request

O PR deve:

- referenciar a issue com `Closes #N`;
- possuir título Conventional Commit;
- descrever Summary, Validation, riscos e evidências visuais quando aplicável;
- conter apenas arquivos do escopo;
- estar com CI verde antes do merge.

O merge depende de confirmação humana. Prefira Squash Merge quando houver commits intermediários.

## Governança específica do editor

As regras adicionais para runtime injetado, contrato de patches, mudanças visuais, bundle gerado e evolução para webservice estão em `docs/DEVELOPMENT_GOVERNANCE.md`. Assistentes de código também devem seguir `AGENTS.md`.
