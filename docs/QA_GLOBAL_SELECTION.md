# QA: global selection and mouse dragging

Run the bundled demo with `./scripts/run-demo.ps1` and verify the following in Chromium headed.

## Selection switching

1. Select the primary button.
2. Click a surrounding card without pressing Escape.
3. Click a heading inside another section.
4. Use **Pai**, **Filho** and **Próximo** from the inspector.

Expected: selection changes immediately, the inspector selector updates and the Moveable box follows the new element.

## Global drag

1. Select a card/container.
2. Start a drag over text or a button inside that card.
3. Move more than five pixels and release.
4. Select the button and drag it in the same way.

Expected: the currently selected element moves, a single `transform` patch is persisted and guides/grid continue to update. A click without movement selects the child instead of moving the container.

## Deselect

Verify all three paths:

- press Escape;
- click empty canvas/body space;
- click **Desmarcar**.

Expected: Moveable controls disappear and the panel returns to the empty-selection state without changing the page.

## Interact mode

Switch to Interact mode and verify links, buttons and form fields receive normal input. Return to Edit mode and repeat the selection sequence.
