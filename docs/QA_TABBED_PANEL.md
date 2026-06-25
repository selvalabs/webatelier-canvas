# QA: Tabbed WebAtelier panel

Use this checklist after launching the editor in headed Chromium.

## Navigation

- The panel header says `WebAtelier Canvas`.
- Tabs are visible for Seleção, Design, Layout, CSS, Assets, Timeline, IA and JS Hub.
- Mouse click changes tabs without losing the selected element.
- ArrowLeft, ArrowRight, Home and End move between tabs.
- The last active tab is restored within the same browser session.

## Layout

- The header remains visible.
- The tab bar remains visible.
- Only the active tab content scrolls.
- The panel footer/status remains visible.
- Mobile/narrow viewport keeps horizontal tab scrolling.

## Selection-aware behavior

- Tabs that require a selection show an empty-state message when no element is selected.
- Selecting an element reveals Design, Layout, CSS and IA controls.
- Deselecting hides selection-required controls again.

## Extension registration

- Existing controls are moved into the expected tabs.
- Later panels with `data-wda-tab` are moved automatically.
- Later panels can use `window.__WDA_TABS_API__.register(...)`.

## Regression checks

- Manual editing still works.
- AI preview still opens.
- Timeline controls remain usable.
- JS Hub tab remains available after #39.
