# Saved local projects

A project profile connects a trusted local directory, a loopback development URL and project-scoped WebAtelier Canvas data.

## Create and inspect a profile

```powershell
cd "C:\Users\carlo\projects\webdesign-ai-editor"

uv run python -m webdesign_ai_editor.project_cli create `
  --name "My landing page" `
  --root "C:\Users\carlo\projects\my-site" `
  --url "http://127.0.0.1:5173"

uv run python -m webdesign_ai_editor.project_cli list
uv run python -m webdesign_ai_editor.project_cli show <project-uuid>
```

Detection reads only bounded configuration files and filenames. It never executes package scripts or imports project code.

## Open a saved project

Start the project development server yourself, then run:

```powershell
cd "C:\Users\carlo\projects\webdesign-ai-editor"

uv run python -m webdesign_ai_editor.project_cli open <project-uuid>
```

The launcher creates a project-scoped session and stores patches beneath the application data directory. The source project is not modified.

## Storage layout

```text
<app-data>/projects/
  profiles/<project-id>.json
  workspaces/<project-id>/
    sessions/
    exports/
```

Removing a profile preserves its workspace for recovery.

## API

The loopback API exposes CRUD endpoints under `/api/v1/projects`, a session-association endpoint and read-only workspace paths.

## Service-ready security gates

The current implementation remains local-first:

- project URLs must use `localhost` or an IP loopback address;
- URLs with embedded credentials are rejected;
- root directories must already exist;
- framework detection does not execute source code or package-manager commands;
- profiles and sessions live outside the edited project by default;
- public binding, multi-user access and remote browser workers remain unsupported.

Before any remote service mode, add authentication, authorization, per-user filesystem isolation, browser sandboxing, request quotas, audit logging, TLS and explicit network egress controls.
