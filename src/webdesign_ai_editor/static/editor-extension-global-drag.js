(() => {
  "use strict";

  if (window.__WDA_GLOBAL_DRAG_ACTIVE__) return;
  window.__WDA_GLOBAL_DRAG_ACTIVE__ = true;

  const HOST_ID = "__wda_editor_host__";
  const THRESHOLD = 5;
  const state = {
    api: null,
    selected: null,
    enabled: true,
    pending: null,
    attempts: 0
  };

  function boot() {
    const api = window.__WDA_EXTENSION_API__;
    const shadow = document.getElementById(HOST_ID)?.shadowRoot;
    if (!api || !shadow) {
      state.attempts += 1;
      if (state.attempts < 240) window.setTimeout(boot, 25);
      return;
    }

    state.api = api;
    state.selected = api.getSelectedElement();
    installToggle(shadow);
    observeMode(shadow);
    window.addEventListener("wda:selection-changed", (event) => {
      state.selected = event.detail?.element || null;
      refreshToggle();
    });
    window.addEventListener("pointerdown", onPointerDown, true);
    refreshToggle();
  }

  function installToggle(shadow) {
    const inspector = shadow.getElementById("__wda_selection_inspector__");
    if (!inspector || inspector.querySelector("[data-global-drag-toggle]")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "wda-inspector-v2__button";
    button.dataset.globalDragToggle = "true";
    button.dataset.active = "true";
    button.title = "Quando ativo, arrastar dentro do elemento move a seleção; clicar sem mover seleciona o filho.";
    button.textContent = "Arrasto global: ativo";
    button.style.width = "100%";
    button.style.marginTop = "6px";
    button.addEventListener("click", () => {
      state.enabled = !state.enabled;
      refreshToggle();
      state.api?.setStatus(
        state.enabled
          ? "Arrasto global ativo."
          : "Arrasto global pausado; cliques priorizam seleção.",
        "success"
      );
    });
    inspector.appendChild(button);
  }

  function observeMode(shadow) {
    const mode = shadow.querySelector("#wda-mode");
    if (!mode) return;
    const observer = new MutationObserver(() => {
      if (!isEditMode() && state.pending) finish(true);
      refreshToggle();
    });
    observer.observe(mode, { attributes: true, attributeFilter: ["data-mode"] });
  }

  function refreshToggle() {
    const button = document.getElementById(HOST_ID)?.shadowRoot?.querySelector("[data-global-drag-toggle]");
    if (!(button instanceof HTMLButtonElement)) return;
    button.disabled = !isEditMode() || !state.selected;
    button.dataset.active = String(state.enabled && isEditMode());
    button.textContent = !isEditMode()
      ? "Arrasto global: interagir"
      : state.enabled
        ? "Arrasto global: ativo"
        : "Arrasto global: pausado";
  }

  function onPointerDown(event) {
    if (!isEditMode() || !state.enabled || !state.selected || event.button !== 0 || isEditorUiEvent(event)) return;
    if (!(event.target instanceof Node) || !state.selected.contains(event.target)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    window.__WDA_GLOBAL_DRAG_PENDING__ = true;

    const inline = state.selected.style.transform || "";
    const translation = readTranslate(inline || getComputedStyle(state.selected).transform);
    state.pending = {
      pointerId: event.pointerId,
      element: state.selected,
      candidate: firstSelectable(event.composedPath()),
      startX: event.clientX,
      startY: event.clientY,
      before: inline || null,
      baseTransform: stripTranslate(inline),
      baseX: translation.x,
      baseY: translation.y,
      dragging: false
    };

    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerCancel, true);
  }

  function onPointerMove(event) {
    const pending = state.pending;
    if (!pending || event.pointerId !== pending.pointerId) return;
    if (!isEditMode()) {
      finish(true);
      return;
    }

    const deltaX = event.clientX - pending.startX;
    const deltaY = event.clientY - pending.startY;
    if (!pending.dragging && Math.hypot(deltaX, deltaY) < THRESHOLD) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    pending.dragging = true;
    document.body.dataset.wdaDragging = "true";

    const x = round(pending.baseX + deltaX);
    const y = round(pending.baseY + deltaY);
    pending.element.style.transform = `translate3d(${x}px, ${y}px, 0)${pending.baseTransform ? ` ${pending.baseTransform}` : ""}`;
    state.api?.refreshSelection();
    window.dispatchEvent(new Event("resize"));
  }

  function onPointerUp(event) {
    const pending = state.pending;
    if (!pending || event.pointerId !== pending.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    finish(false);
  }

  function onPointerCancel(event) {
    if (state.pending && event.pointerId === state.pending.pointerId) finish(true);
  }

  function finish(cancelled) {
    const pending = state.pending;
    cleanup();
    if (!pending) return;

    if (cancelled) {
      restoreTransform(pending.element, pending.before);
      return;
    }

    if (pending.dragging) {
      const after = pending.element.style.transform || null;
      if (pending.before !== after) {
        void state.api?.emitPatch({
          selector: state.api.getSelector(),
          source: "manual",
          action: "set_style",
          property: "transform",
          before: pending.before,
          after
        });
      }
      state.api?.setStatus("Elemento movido.", "success");
      state.api?.refreshSelection();
      return;
    }

    if (pending.candidate && pending.candidate !== pending.element) {
      window.__WDA_FORCE_SELECT__?.(pending.candidate);
    }
  }

  function cleanup() {
    state.pending = null;
    window.__WDA_GLOBAL_DRAG_PENDING__ = false;
    delete document.body.dataset.wdaDragging;
    window.removeEventListener("pointermove", onPointerMove, true);
    window.removeEventListener("pointerup", onPointerUp, true);
    window.removeEventListener("pointercancel", onPointerCancel, true);
  }

  function restoreTransform(element, value) {
    if (value === null) element.style.removeProperty("transform");
    else element.style.transform = value;
    state.api?.refreshSelection();
  }

  function firstSelectable(path) {
    for (const node of path) {
      if (!(node instanceof HTMLElement || node instanceof SVGElement)) continue;
      if (node === state.selected || state.selected?.contains(node)) return node;
    }
    return null;
  }

  function isEditMode() {
    const mode = document.getElementById(HOST_ID)?.shadowRoot?.querySelector("#wda-mode");
    return mode?.getAttribute("data-mode") !== "interact";
  }

  function isEditorUiEvent(event) {
    return event.composedPath().some((node) => node instanceof Element && Boolean(
      node.closest?.(`#${HOST_ID}, [data-wda-editor-ui="true"], .moveable-control-box, .wda-moveable`)
    ));
  }

  function readTranslate(transform) {
    if (!transform || transform === "none") return { x: 0, y: 0 };
    const direct = transform.match(/translate(?:3d)?\(\s*(-?[\d.]+)px(?:\s*,\s*|\s+)(-?[\d.]+)px/i);
    if (direct) return { x: Number(direct[1]) || 0, y: Number(direct[2]) || 0 };
    try {
      const matrix = new DOMMatrixReadOnly(transform);
      return { x: matrix.e, y: matrix.f };
    } catch {
      return { x: 0, y: 0 };
    }
  }

  function stripTranslate(transform) {
    return (transform || "")
      .replace(/translate(?:3d|X|Y)?\([^)]*\)/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function round(value) {
    return Math.round(value * 100) / 100;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
