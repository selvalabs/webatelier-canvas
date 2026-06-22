# Durable editing sessions

Each launch uses a UUID and persists accepted patches as JSONL in the application data directory. The editor panel shows the persisted timeline and can export or import a reviewable JSON file.

## Start a new session

```powershell
uv run python -m webdesign_ai_editor launch --url http://127.0.0.1:3000
```

The terminal prints the generated session UUID.

## Resume a session

```powershell
uv run python -m webdesign_ai_editor launch `
  --url http://127.0.0.1:3000 `
  --session-id <uuid>
```

List known sessions:

```powershell
uv run python -m webdesign_ai_editor sessions
```

## Export

Use the timeline panel or the CLI:

```powershell
uv run python -m webdesign_ai_editor export-session `
  --session-id <uuid> `
  --output session-patches.json
```

Importing through the editor validates each patch, reapplies supported changes to the current DOM and persists them under the active session. Clearing the timeline removes the local log but intentionally does not revert the page currently displayed.
