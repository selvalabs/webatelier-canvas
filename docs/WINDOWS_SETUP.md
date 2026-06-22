# Windows local setup

## Bootstrap

Run from the repository root:

```powershell
.\scripts\bootstrap.ps1
```

The script installs Python and JavaScript dependencies, builds the injected runtime, installs Playwright Chromium, creates `.env` when needed, and verifies the local tooling.

## One-command demo

```powershell
.\scripts\run-demo.ps1
```

The command serves `examples/demo`, opens the Playwright-managed Chromium, injects the editor, and shuts down the local server after the browser closes. When the preferred port is unavailable, another loopback port is selected automatically.

To request any available port explicitly:

```powershell
uv run python -m webdesign_ai_editor demo --port 0
```

## Recommended module commands

```powershell
uv run python -m webdesign_ai_editor doctor
uv run python -m webdesign_ai_editor launch --url http://127.0.0.1:3000
uv run python -m ruff check .
uv run python -m pytest
uv run python -m mypy src
```

Using `python -m` avoids reliance on generated command wrappers in the virtual environment.

## JavaScript dependency recovery

```powershell
cd editor-runtime
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm cache verify
npm install --no-audit --no-fund
npm run typecheck
npm run build
cd ..
```

## AI prompts

Manual editing works without Ollama. To enable prompt-based editing:

```powershell
ollama list
uv run python -m webdesign_ai_editor doctor
```

Set `WDA_OLLAMA_MODEL` in `.env` to the exact installed model name.
