# Sprint checkpoint

This document records the current integration state so Codex, ChatGPT and future contributors can resume without relying on chat history.

## Current objective

Integrate the editor UX improvement sprint into `main` in small, reviewable PRs.

The immediate focus is to finish and merge the remaining feature PRs after the Elements insertion engine landed.

## Completed in this sprint

- Project foundation and governance.
- Windows local workflow hardening.
- Universal selection, drag and deselect.
- Tabbed WebAtelier Canvas panel views.
- Instructions, hotkeys and contextual tooltips.
- CSS learning inspector.
- Project identity metadata, favicon preview and safe export naming.
- Elements palette and insertion engine.

## Active PRs

### #36 Export packages

Title: `feat(export): package reviewable HTML CSS assets and metadata`

Status at checkpoint:

- Open.
- Stacked on `feat/project-identity-metadata` / PR #34.
- Last known CI: green.
- Merge order: after #34, then #36.

Scope:

- deterministic ZIP export;
- `index.html`, `styles.css`, `metadata.json`, optional favicon and `REPORT.md`;
- browser preview/confirmation flow;
- local API endpoint;
- standalone export CLI;
- exporter/API tests.

### #38 Saved local projects

Title: `feat(projects): save local projects and prepare service-ready sessions`

Status at checkpoint:

- Open.
- Stacked on `feat/project-identity-metadata` / PR #34.
- Needs CI/mergeability recheck before merge.

Scope:

- local project profiles;
- conservative framework detection;
- project-scoped sessions/workspaces;
- CRUD API routes;
- standalone project CLI;
- service-readiness documentation.

### #39 Clean JS Hub

Title: `feat(js-hub): add a safe visual tool registry`

Status at checkpoint:

- Open.
- Clean branch from `main`: `feat/js-tools-clean`.
- Supersedes old PR #37.
- Last known issue: Python CI failed on `ruff`; `tests/test_js_hub_security.py` was simplified afterward.
- Next action: recheck CI for latest head commit.

Scope:

- reviewed JS Hub tool registry;
- Accordion, Tabs, Modal, Mobile Menu and Reveal tools;
- preview and approved insertion panel;
- internal delegated runtime behaviors;
- security test and documentation.

## Superseded PRs

### #37 JS Hub stacked branch

Status:

- Superseded by #39.
- Do not continue this PR unless #39 becomes unusable.
- Close after #39 is green and mergeable.

Reason:

- It was originally stacked on an old `feat/elements-builder` base and carried unrelated Elements files after #35 was merged.

## Next actions

Use short blocks. Avoid long multi-step runs.

1. Check latest CI for #39.
2. If #39 is green, close #37 and merge #39 after review.
3. Recheck #34 and #36 stack.
4. Merge #34 before #36 if still required.
5. Recheck #38 and update/retarget if needed.
6. After active PRs are clean, begin Project Manager v2 / service-ready planning.

## Validation commands

Run locally from the repository root:

```powershell
cd "C:\Users\carlo\projects\webdesign-ai-editor"

uv run ruff check .
uv run pytest
uv run mypy src
npm run --prefix editor-runtime typecheck
node scripts/check-runtime-extensions.mjs
npm run --prefix editor-runtime build
```

For full Windows validation:

```powershell
cd "C:\Users\carlo\projects\webdesign-ai-editor"

.\scripts\validate.ps1
```

## Operating rules

- Keep PRs small.
- Prefer clean branches from `main` over deeply stacked branches when conflicts appear.
- Verify CI before merging.
- Do not force-push unless explicitly approved.
- Do not merge unrelated feature files into cleanup PRs.
- When CI fails, inspect the failing job and fix only the narrowest cause.
- Stop and report after each block.
