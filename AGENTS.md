# Diretrizes para agentes de IA

Este arquivo complementa `CONTRIBUTING.md` e `docs/DEVELOPMENT_GOVERNANCE.md`. Ele orienta assistentes de código sem substituir revisão humana.

## Invariantes do produto

1. O modo principal é local-first e deve funcionar sem API pública.
2. A edição manual deve continuar disponível quando Ollama ou o modelo estiver indisponível.
3. Edição manual, IA, undo/redo e exportadores usam o mesmo contrato de patches.
4. Respostas do modelo são dados não confiáveis: validar JSON Schema, Pydantic, allowlists e valores antes de aplicar.
5. Nunca executar HTML, JavaScript, comandos de sistema ou event handlers retornados pelo modelo.
6. A API e o Ollama usam loopback por padrão. Não transformar `--allow-remote` em configuração padrão.
7. O runtime TypeScript em `editor-runtime/src/` é a fonte. Não editar manualmente o bundle gerado em `src/webdesign_ai_editor/static/`.
8. Não fazer commit, push, PR, merge, force-push ou alteração de escopo sem decisão explícita do desenvolvedor.

## Fluxo obrigatório

```text
Issue -> Branch -> Implementação local -> Validação local -> Revisão do diff -> Commit -> Push -> PR -> CI -> Revisão humana -> Merge -> Sync local
```

Branches, commits, issues e PRs seguem Conventional Commits. Cada PR deve ser pequeno, referenciar uma issue e declarar escopo, fora de escopo, validação, riscos e evidência visual quando aplicável.

## Limites por camada

- `domain/`: contratos puros e validação; sem Playwright, FastAPI ou acesso a disco.
- `services/`: coordenação de casos de uso; depende de portas, não de adaptadores concretos.
- `adapters/`: Playwright, Ollama, JSONL e outras integrações.
- `api/`: transporte HTTP opcional; não deve conter regra de negócio.
- `editor-runtime/src/`: interação visual no DOM; deve ser defensiva contra CSS e conteúdo hostis.
- `static/`: artefato gerado pelo build do runtime.

## Validação mínima por mudança

```powershell
uv run ruff check . --fix
uv run ruff check .
uv run pytest
uv run mypy src
npm run --prefix editor-runtime typecheck
npm run --prefix editor-runtime build
```

Mudanças visuais também exigem QA manual no Chromium headed. Mudanças de segurança exigem teste negativo. Mudanças no contrato de patch exigem atualização de schema, testes, documentação e decisão arquitetural.

## Entregas por patch

Quando uma alteração envolver vários arquivos, preferir ZIP com `payload/`, README de aplicação e script PowerShell que valide ZIP, raiz, branch e paths; faça backup fora do repositório; aplique sem deletar arquivos não declarados; e pare antes do commit.
