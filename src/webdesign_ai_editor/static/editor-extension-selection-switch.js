(() => {
  "use strict";

  if (window.__WDA_SELECTION_SWITCH_ACTIVE__) return;
  window.__WDA_SELECTION_SWITCH_ACTIVE__ = true;

  const HOST_ID = "__wda_editor_host__";
  const state = {
    api: null,
    selected: null,
    selector: "",
    attempts: 0,
    synthetic: false
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
    state.selector = api.getSelector();
    installControls(shadow);
    observeMode(shadow);
    window.addEventListener("wda:selection-changed", onSelectionChanged);
    window.addEventListener("pointerdown", onPointerDown, true);
    refreshControls();
  }

  function installControls(shadow) {
    const inspector = shadow.getElementById("__wda_selection_inspector__");
    if (!inspector || inspector.querySelector("[data-selection-switch-controls]")) return;

    const controls = document.createElement("div");
    controls.dataset.selectionSwitchControls = "true";
    controls.className = "wda-inspector-v2__actions";
    controls.innerHTML = `
      <button class="wda-inspector-v2__button" type="button" data-selection-command="deselect" title="Remove a seleção atual sem alterar a página. Atalho: Esc.">Desmarcar</button>
      <button class="wda-inspector-v2__button" type="button" data-selection-command="parent" title="Seleciona o container pai do elemento atual.">Pai</button>
      <button class="wda-inspector-v2__button" type="button" data-selection-command="child" title="Seleciona o primeiro filho visual do elemento atual.">Filho</button>
      <button class="wda-inspector-v2__button" type="button" data-selection-command="next" title="Percorre elementos visuais sob o mesmo container.">Próximo</button>
    `;
    inspector.appendChild(controls);

    controls.querySelector('[data-selection-command="deselect"]')?.addEventListener("click", clearSelection);
    controls.querySelector('[data-selection-command="parent"]')?.addEventListener("click", selectParent);
    controls.querySelector('[data-selection-command="child"]')?.addEventListener("click", selectChild);
    controls.querySelector('[data-selection-command="next"]')?.addEventListener("click", selectNextSibling);
  }

  function observeMode(shadow) {
    const mode = shadow.querySelector("#wda-mode");
    if (!mode) return;
    const observer = new MutationObserver(refreshControls);
    observer.observe(mode, { attributes: true, attributeFilter: ["data-mode"] });
  }

  function onSelectionChanged(event) {
    state.selected = event.detail?.element || null;
    state.selector = event.detail?.selector || "";
    refreshControls();
  }

  function onPointerDown(event) {
    if (!isEditMode() || state.synthetic || event.button !== 0 || isEditorUiEvent(event)) return;
    if (window.__WDA_GLOBAL_DRAG_PENDING__) return;

    const candidate = firstSelectable(event.composedPath());
    if (!candidate) {
      if (state.selected) {
        event.preventDefault();
        event.stopImmediatePropagation();
        clearSelection();
      }
      return;
    }

    if (!state.selected || candidate === state.selected) return;
    if (state.selected.contains(candidate)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    forceSelect(candidate, event.clientX, event.clientY);
  }

  function forceSelect(element, clientX, clientY) {
    if (!isEditMode() || !isSelectable(element)) return;
    dispatchEscape();
    state.synthetic = true;
    window.setTimeout(() => {
      const rect = element.getBoundingClientRect();
      element.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 9876,
        pointerType: "mouse",
        button: 0,
        buttons: 1,
        clientX: Number.isFinite(clientX) ? clientX : rect.left + Math.min(rect.width / 2, 12),
        clientY: Number.isFinite(clientY) ? clientY : rect.top + Math.min(rect.height / 2, 12)
      }));
      state.synthetic = false;
      state.api?.refreshSelection();
    }, 0);
  }

  function clearSelection() {
    dispatchEscape();
    state.selected = null;
    state.selector = "";
    state.api?.refreshSelection();
    state.api?.setStatus("Seleção removida.", "success");
    refreshControls();
  }

  function dispatchEscape() {
    document.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      bubbles: true,
      cancelable: true,
      composed: true
    }));
  }

  function selectParent() {
    const parent = state.selected?.parentElement;
    if (isSelectable(parent)) forceSelect(parent);
  }

  function selectChild() {
    const child = state.selected
      ? Array.from(state.selected.children).find(isSelectable)
      : null;
    if (child) forceSelect(child);
  }

  function selectNextSibling() {
    const selected = state.selected;
    const parent = selected?.parentElement;
    if (!selected || !parent) return;
    const siblings = Array.from(parent.children).filter(isSelectable);
    const index = siblings.indexOf(selected);
    const next = siblings[(index + 1) % siblings.length];
    if (next) forceSelect(next);
  }

  function refreshControls() {
    const shadow = document.getElementById(HOST_ID)?.shadowRoot;
    const controls = shadow?.querySelector("[data-selection-switch-controls]");
    if (!controls) return;

    const editable = isEditMode();
    const commands = controls.querySelectorAll("button");
    for (const button of commands) button.disabled = !editable || !state.selected;

    const parent = controls.querySelector('[data-selection-command="parent"]');
    const child = controls.querySelector('[data-selection-command="child"]');
    const next = controls.querySelector('[data-selection-command="next"]');
    if (parent instanceof HTMLButtonElement) {
      parent.disabled = !editable || !isSelectable(state.selected?.parentElement || null);
    }
    if (child instanceof HTMLButtonElement) {
      child.disabled = !editable || !state.selected || !Array.from(state.selected.children).some(isSelectable);
    }
    if (next instanceof HTMLButtonElement) {
      const siblings = state.selected?.parentElement
        ? Array.from(state.selected.parentElement.children).filter(isSelectable)
        : [];
      next.disabled = !editable || siblings.length < 2;
    }
  }

  function isEditMode() {
    const mode = document.getElementById(HOST_ID)?.shadowRoot?.querySelector("#wda-mode");
    return mode?.getAttribute("data-mode") !== "interact";
  }

  function firstSelectable(path) {
    for (const node of path) {
      if (isSelectable(node)) return node;
    }
    return null;
  }

  function isSelectable(value) {
    if (!(value instanceof HTMLElement || value instanceof SVGElement) || !value.isConnected) return false;
    const tag = value.tagName.toLowerCase();
    if (["html", "body", "head", "script", "style", "meta", "link", "noscript"].includes(tag)) return false;
    if (value.id === HOST_ID || value.hasAttribute("data-wda-editor-ui")) return false;
    if (value.closest(`#${HOST_ID}, .moveable-control-box, .wda-moveable`)) return false;
    const rect = value.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return false;
    const style = getComputedStyle(value);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
  }

  function isEditorUiEvent(event) {
    return event.composedPath().some((node) => node instanceof Element && Boolean(
      node.closest?.(`#${HOST_ID}, [data-wda-editor-ui="true"], .moveable-control-box, .wda-moveable`)
    ));
  }

  window.__WDA_FORCE_SELECT__ = forceSelect;
  window.__WDA_CLEAR_SELECTION__ = clearSelection;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
