# WebDesign AI Editor

Editor visual local-first para projetos web. A aplicação abre uma página em Chromium headed por Playwright, injeta uma camada de edição visual e permite alterações manuais ou por prompt com Gemma via Ollama.

## Estado do projeto

O MVP inclui launcher Playwright, runtime TypeScript injetável, seleção visual, drag, resize, rotate, smart guides, painel de propriedades, undo/redo, patches JSONL, integração Ollama, API FastAPI opcional e CI.

Antes de mergear mudanças, execute a validação local e o QA descrito em `docs/QA_PLAN.md`.

## Requisitos

- Python 3.11 ou superior;
- `uv`;
- Node.js 20 ou superior;
- Ollama e um modelo Gemma para edição por prompt;
- projeto web acessível por URL local.

A edição manual continua disponível quando Ollama estiver desligado.

## Instalação local

No Windows:

```powershell
.\scripts\bootstrap.ps1
```

O script instala dependências Python e JavaScript, compila o runtime, instala Chromium e cria `.env` quando necessário.

Confira os modelos disponíveis:

```powershell
ollama list
```

Ajuste `WDA_OLLAMA_MODEL` em `.env` para o nome exato do modelo instalado.

## Demo em um comando

```powershell
.\scripts\run-demo.ps1
```

O comando serve `examples/demo`, escolhe outra porta quando `4173` não está disponível, abre o Chromium controlado pelo Playwright, injeta o editor e encerra o servidor quando o browser fecha.

Para escolher qualquer porta livre:

```powershell
uv run python -m webdesign_ai_editor demo --port 0
```

## Editar um projeto local

Primeiro execute o projeto web. Depois:

```powershell
uv run python -m webdesign_ai_editor doctor
uv run python -m webdesign_ai_editor launch --url http://127.0.0.1:3000
```

Atalhos principais:

- `Escape`: desmarcar;
- `Ctrl+Z`: desfazer;
- `Ctrl+Shift+Z` ou `Ctrl+Y`: refazer;
- `Alt+E`: alternar editar/interagir;
- duplo clique em texto: edição direta.

## API local

```powershell
uv run python -m webdesign_ai_editor serve --host 127.0.0.1 --port 8787
```

O modo local usa bindings internos do Playwright. Consulte `docs/LOCAL_FIRST_AND_WEBSERVICE.md` antes de qualquer evolução para serviço remoto.

## Validação

```powershell
.\scripts\validate.ps1
```

Comandos equivalentes:

```powershell
uv run python -m ruff check .
uv run python -m pytest
uv run python -m mypy src
npm run --prefix editor-runtime typecheck
npm run --prefix editor-runtime build
```

## Fluxo GitHub

```text
Issue -> Branch -> Implementação local -> Validação local -> Commit -> Push -> PR -> CI -> Revisão -> Merge -> Sync local
```

## Escopo atual

O MVP salva patches de estilo, texto e atributos. Ainda não reescreve automaticamente JSX, templates ou folhas CSS originais.

## Documentação

- `docs/WINDOWS_SETUP.md`: setup e demo no Windows;
- `docs/DEVELOPMENT_GOVERNANCE.md`: processo de desenvolvimento;
- `docs/PATCH_DELIVERY.md`: entrega por ZIP e script;
- `AGENTS.md`: limites para assistentes de código.
