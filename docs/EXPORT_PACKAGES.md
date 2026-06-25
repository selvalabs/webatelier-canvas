# Local export packages

WebAtelier Canvas exports the current browser snapshot without modifying the source project.

## Browser workflow

1. Open the **Assets** view.
2. Set the project identity and export filename.
3. Choose **Preview export**.
4. Review generated files and warnings.
5. Confirm **Generate ZIP**.

The archive is written under the application data directory in `exports/`. The panel displays the exact local path.

## Package contents

- `index.html`: sanitized current DOM snapshot;
- `styles.css`: inline styles extracted into deterministic selectors;
- `metadata.json`: project name, page title, description, export filename and source URL;
- `assets/favicon.*`: optional local favicon;
- `REPORT.md`: included files and unresolved warnings.

Scripts and editor overlays are removed from the static snapshot. External stylesheets may remain referenced and are reported as a warning.

## Standalone CLI

A validated JSON payload can be exported without opening the editor:

```powershell
cd "C:\Users\carlo\projects\webdesign-ai-editor"

uv run python -m webdesign_ai_editor.export_cli package `
  --payload ".\snapshot.json" `
  --output-dir ".\exports"
```

The command validates filenames, payload size and favicon format before writing.

## Safety boundary

- export writes only to the configured output directory;
- source project files are never overwritten;
- filenames cannot contain path separators or relative traversal;
- favicon packaging accepts only bounded, allowlisted image data URLs;
- raw scripts are excluded from the static export.
