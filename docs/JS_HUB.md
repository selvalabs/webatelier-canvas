# JS Hub: safe visual tools

The JS Hub is not a general-purpose JavaScript console. It exposes reviewed, declarative tools that generate editable DOM structures and use internal event delegation for behavior.

## Included tools

- Accordion;
- Tabs;
- Modal trigger and local dialog;
- Mobile menu;
- Reveal on scroll.

Each tool has metadata, bounded text fields, a structured element builder, a preview and explicit insertion approval. Insertions use the same validated `insert_element` contract as the element palette, so they enter the session timeline and remain editable.

Tool behavior is attached by the trusted runtime after insertion. The generated page structure remains plain HTML and CSS, while the runtime behavior can be reviewed independently.

## Security rules

A registered tool must:

- generate only allowlisted tags, attributes and styles;
- use internal `addEventListener` delegation rather than inline handlers;
- avoid `eval`, dynamic function construction and user-provided executable code;
- avoid remote scripts and package downloads;
- limit generated tree depth and node count;
- work without network access;
- remain removable through insertion history.

## Registering another tool

Add one entry to `editor-extension-js-hub-registry.js` with:

- stable `id`;
- user-facing label and description;
- bounded field definitions;
- a `build(values)` function that returns the structured insertion schema.

Behavior must be implemented in `editor-extension-js-hub-behavior.js` using reviewed class-based delegation. Add security and model-validation tests before opening a PR.

## QA

1. Select a container.
2. Open the JS Hub view.
3. Configure and preview each tool.
4. Insert and interact with the tool in Edit and Interact modes.
5. Undo and redo the insertion.
6. Export/import the session and confirm the structure remains editable.
