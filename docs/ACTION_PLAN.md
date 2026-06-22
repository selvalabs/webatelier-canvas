# Plano de ação

## Etapa 1 - Criar o repositório

1. executar `create-webdesign-ai-editor-repository.ps1`;
2. confirmar que `main` foi criada pelo GitHub;
3. criar/confirmar branch `feat/bootstrap-foundation`;
4. aplicar o ZIP com o script fornecido;
5. não commitar ainda.

## Etapa 2 - Validar o bootstrap

```powershell
uv sync --extra dev
uv run playwright install chromium
npm ci --prefix editor-runtime
npm run --prefix editor-runtime build
./scripts/validate.ps1
```

Depois:

```powershell
git status --short
git diff --stat
git add <arquivos-do-escopo>
git diff --cached --stat
```

## Etapa 3 - Teste manual local

1. iniciar uma página de teste com `python -m http.server 3000 --directory examples/site`;
2. executar `uv run wda doctor`;
3. executar `uv run wda launch --url http://127.0.0.1:3000`;
4. executar casos P0 de `docs/QA_PLAN.md`;
5. confirmar criação do JSONL fora do repositório.

## Etapa 4 - Commit e PR

Commit sugerido:

```powershell
git commit -m "feat(editor): bootstrap local-first visual editor"
git push -u origin feat/bootstrap-foundation
```

Crie a issue e o PR com os templates do repositório. O merge só deve ocorrer após CI verde e revisão humana.

## Etapa 5 - Próximas issues

Ordem recomendada:

1. hardening de seleção;
2. precisão de transformações;
3. QA de smart guides;
4. painel de propriedades completo;
5. preview de plano da IA;
6. persistência e exportação;
7. E2E e visual regression;
8. exportador CSS;
9. daemon/WebSocket local;
10. avaliação de webservice privado.
