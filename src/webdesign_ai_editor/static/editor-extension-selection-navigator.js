(() => {
  "use strict";

  const ACTIVE_FLAG = "__WDA_SELECTION_NAVIGATOR_ACTIVE__";
  const HOST_ID = "__wda_editor_host__";
  const API_KEY = "__WDA_EXTENSION_API__";
  const PANEL_ID = "__wda_selection_navigator__";
  const STYLE_ID = "__wda_selection_navigator_style__";
  const MAX_BOOT_ATTEMPTS = 280;
  const MAX_BREADCRUMB_ITEMS = 7;

  if (window[ACTIVE_FLAG]) return;
  window[ACTIVE_FLAG] = true;

  const state = {
    attempts: 0,
    api: null,
    shadow: null,
    panel: null,
    selected: null,
    selector: "",
    lastSelection: null
  };

  function boot() {
    const shadow = document.getElementById(HOST_ID)?.shadowRoot;
    const api = window[API_KEY];

    if (!shadow || !api) {
      state.attempts += 1;
      if (state.attempts < MAX_BOOT_ATTEMPTS) window.setTimeout(boot, 25);
      return;
    }

    state.shadow = shadow;
    state.api = api;
    installStyles(shadow);
    state.panel = createPanel(shadow);
    bindPanel(state.panel);
    refreshFromApi();

    window.addEventListener("wda:selection-changed", (event) => {
      const nextSelected = event.detail?.element || null;
      if (state.selected && state.selected !== nextSelected) {
        state.lastSelection = state.selected;
      }
      state.selected = nextSelected;
      state.selector = event.detail?.selector || api.getSelector?.() || "";
      render();
    });

    window.__WDA_SELECTION_NAVIGATOR__ = {
      refresh: refreshFromApi,
      selectParent,
      selectFirstChild,
      selectPreviousSibling,
      selectNextSibling,
      selectPreviousSelection: restorePreviousSelection
    };
  }

  function installStyles(shadow) {
    if (shadow.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .wda-selection-nav {
        margin: 10px 0;
        padding: 10px;
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.46);
      }

      .wda-selection-nav__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }

      .wda-selection-nav__title {
        color: #e2e8f0;
        font: 800 11px/1.2 ui-sans-serif, system-ui, sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .wda-selection-nav__meta {
        max-width: 42%;
        overflow: hidden;
        color: #94a3b8;
        font: 700 9px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .wda-selection-nav__actions {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 6px;
        margin-bottom: 8px;
      }

      .wda-selection-nav__button,
      .wda-selection-nav__crumb {
        min-height: 30px;
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 8px;
        background: rgba(30, 41, 59, 0.72);
        color: #e2e8f0;
        cursor: pointer;
        font: 800 10px/1 ui-sans-serif, system-ui, sans-serif;
      }

      .wda-selection-nav__button:hover:not(:disabled),
      .wda-selection-nav__crumb:hover:not(:disabled) {
        border-color: rgba(96, 165, 250, 0.7);
        background: rgba(30, 64, 175, 0.28);
      }

      .wda-selection-nav__button:disabled,
      .wda-selection-nav__crumb:disabled {
        cursor: not-allowed;
        opacity: 0.42;
      }

      .wda-selection-nav__button[data-primary="true"] {
        border-color: rgba(45, 212, 191, 0.58);
        color: #99f6e4;
      }

      .wda-selection-nav__breadcrumb {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 5px;
        min-height: 28px;
      }

      .wda-selection-nav__crumb {
        max-width: 100%;
        min-height: 26px;
        padding: 0 7px;
        overflow: hidden;
        color: #bfdbfe;
        font: 700 10px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .wda-selection-nav__crumb[data-current="true"] {
        border-color: rgba(45, 212, 191, 0.7);
        background: rgba(20, 184, 166, 0.18);
        color: #ccfbf1;
      }

      .wda-selection-nav__separator {
        color: #64748b;
        font: 700 10px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }

      .wda-selection-nav__empty {
        margin: 0;
        color: #94a3b8;
        font: 500 11px/1.45 ui-sans-serif, system-ui, sans-serif;
      }
    `;
    shadow.appendChild(style);
  }

  function createPanel(shadow) {
    const existing = shadow.getElementById(PANEL_ID);
    if (existing) return existing;

    const panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.className = "wda-selection-nav";
    panel.dataset.wdaTab = "selection";
    panel.dataset.wdaRequiresSelection = "true";
    panel.setAttribute("aria-label", "Navegação da seleção");
    panel.innerHTML = `
      <div class="wda-selection-nav__header">
        <span class="wda-selection-nav__title">Hierarquia</span>
        <span class="wda-selection-nav__meta" data-selection-nav-meta>sem seleção</span>
      </div>
      <div class="wda-selection-nav__actions">
        <button class="wda-selection-nav__button" type="button" data-selection-nav-action="previous" title="Voltar para a seleção anterior">↩</button>
        <button class="wda-selection-nav__button" type="button" data-selection-nav-action="parent" title="Selecionar elemento pai">↑ Pai</button>
        <button class="wda-selection-nav__button" type="button" data-selection-nav-action="child" title="Entrar no primeiro filho visível">↓ Filho</button>
        <button class="wda-selection-nav__button" type="button" data-selection-nav-action="prev-sibling" title="Selecionar irmão anterior">←</button>
        <button class="wda-selection-nav__button" type="button" data-selection-nav-action="next-sibling" title="Selecionar próximo irmão" data-primary="true">→</button>
      </div>
      <div class="wda-selection-nav__breadcrumb" data-selection-nav-breadcrumb></div>
    `;

    const inspector = shadow.getElementById("__wda_selection_inspector__");
    const selectorLabel = shadow.querySelector("#wda-selector");
    const selectedPanel = shadow.querySelector("#wda-selected");
    const content = shadow.querySelector(".wda-content");

    if (inspector) inspector.insertAdjacentElement("beforebegin", panel);
    else if (selectorLabel) selectorLabel.insertAdjacentElement("afterend", panel);
    else (selectedPanel || content)?.appendChild(panel);

    return panel;
  }

  function bindPanel(panel) {
    panel.querySelector('[data-selection-nav-action="previous"]')?.addEventListener("click", restorePreviousSelection);
    panel.querySelector('[data-selection-nav-action="parent"]')?.addEventListener("click", selectParent);
    panel.querySelector('[data-selection-nav-action="child"]')?.addEventListener("click", selectFirstChild);
    panel.querySelector('[data-selection-nav-action="prev-sibling"]')?.addEventListener("click", selectPreviousSibling);
    panel.querySelector('[data-selection-nav-action="next-sibling"]')?.addEventListener("click", selectNextSibling);
  }

  function refreshFromApi() {
    if (!state.api) return;
    state.selected = state.api.getSelectedElement?.() || null;
    state.selector = state.api.getSelector?.() || "";
    render();
  }

  function render() {
    const panel = state.panel;
    if (!panel) return;

    const selected = state.selected;
    const meta = panel.querySelector("[data-selection-nav-meta]");
    const breadcrumb = panel.querySelector("[data-selection-nav-breadcrumb]");

    if (meta) meta.textContent = selected ? compactLabel(selected) : "sem seleção";

    const parent = selected?.parentElement && isSelectable(selected.parentElement) ? selected.parentElement : null;
    const child = firstSelectableChild(selected);
    const previousSibling = selectableSibling(selected, -1);
    const nextSibling = selectableSibling(selected, 1);
    const previousSelection = state.lastSelection && isSelectable(state.lastSelection) ? state.lastSelection : null;

    setButton(panel, "previous", previousSelection);
    setButton(panel, "parent", parent);
    setButton(panel, "child", child);
    setButton(panel, "prev-sibling", previousSibling);
    setButton(panel, "next-sibling", nextSibling);

    if (!breadcrumb) return;
    breadcrumb.replaceChildren();

    if (!selected) {
      const empty = document.createElement("p");
      empty.className = "wda-selection-nav__empty";
      empty.textContent = "Selecione um elemento para navegar por pais, filhos e irmãos.";
      breadcrumb.appendChild(empty);
      return;
    }

    const chain = ancestry(selected).slice(-MAX_BREADCRUMB_ITEMS);
    chain.forEach((element, index) => {
      if (index > 0) {
        const separator = document.createElement("span");
        separator.className = "wda-selection-nav__separator";
        separator.textContent = ">";
        breadcrumb.appendChild(separator);
      }
      const crumb = document.createElement("button");
      crumb.className = "wda-selection-nav__crumb";
      crumb.type = "button";
      crumb.textContent = compactLabel(element);
      crumb.title = fullLabel(element);
      crumb.dataset.current = String(element === selected);
      crumb.disabled = element === selected;
      crumb.addEventListener("click", () => selectElement(element));
      breadcrumb.appendChild(crumb);
    });
  }

  function setButton(panel, action, target) {
    const button = panel.querySelector(`[data-selection-nav-action="${action}"]`);
    if (!(button instanceof HTMLButtonElement)) return;
    button.disabled = !target;
    if (target) button.title = `${button.title.split(" · ")[0]} · ${fullLabel(target)}`;
  }

  function selectParent() {
    const parent = state.selected?.parentElement;
    if (parent && isSelectable(parent)) selectElement(parent);
  }

  function selectFirstChild() {
    const child = firstSelectableChild(state.selected);
    if (child) selectElement(child, { clearFirst: true });
  }

  function selectPreviousSibling() {
    const sibling = selectableSibling(state.selected, -1);
    if (sibling) selectElement(sibling);
  }

  function selectNextSibling() {
    const sibling = selectableSibling(state.selected, 1);
    if (sibling) selectElement(sibling);
  }

  function restorePreviousSelection() {
    if (state.lastSelection && isSelectable(state.lastSelection)) selectElement(state.lastSelection, { clearFirst: true });
  }

  function selectElement(element, options = {}) {
    if (!isSelectable(element)) return;

    const previous = state.selected;
    if (previous && previous !== element) state.lastSelection = previous;

    const dispatchSelection = () => {
      const eventInit = {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 1,
        pointerType: "mouse",
        clientX: Math.max(1, Math.round(element.getBoundingClientRect().left + 1)),
        clientY: Math.max(1, Math.round(element.getBoundingClientRect().top + 1))
      };

      try {
        element.dispatchEvent(new PointerEvent("pointerdown", eventInit));
      } catch {
        element.dispatchEvent(new MouseEvent("pointerdown", eventInit));
      }

      window.setTimeout(() => {
        state.api?.refreshSelection?.();
        refreshFromApi();
      }, 25);
    };

    if (options.clearFirst || (state.selected && state.selected.contains(element))) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true, composed: true }));
      window.setTimeout(dispatchSelection, 0);
      return;
    }

    dispatchSelection();
  }

  function ancestry(element) {
    const chain = [];
    let current = element;
    while (current && current !== document.documentElement) {
      if (isSelectable(current)) chain.unshift(current);
      current = current.parentElement;
    }
    return chain;
  }

  function firstSelectableChild(element) {
    if (!element) return null;
    for (const child of element.children || []) {
      if (isSelectable(child)) return child;
    }
    return null;
  }

  function selectableSibling(element, direction) {
    const parent = element?.parentElement;
    if (!parent) return null;
    const siblings = Array.from(parent.children).filter(isSelectable);
    const index = siblings.indexOf(element);
    if (index < 0) return null;
    return siblings[index + direction] || null;
  }

  function isSelectable(value) {
    if (!(value instanceof HTMLElement || value instanceof SVGElement)) return false;
    if (!value.isConnected) return false;
    if (isForbiddenElement(value)) return false;
    return isVisible(value);
  }

  function isForbiddenElement(element) {
    const tag = element.tagName.toLowerCase();
    return ["html", "head", "script", "style", "meta", "link", "noscript"].includes(tag)
      || element.id === HOST_ID
      || element.hasAttribute("data-wda-editor-ui")
      || Boolean(element.closest(`#${HOST_ID}, [data-wda-editor-ui="true"], .moveable-control-box, .wda-moveable`));
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return false;
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
  }

  function compactLabel(element) {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : "";
    const classes = Array.from(element.classList || [])
      .filter((value) => value && !value.startsWith("wda-") && !value.startsWith("moveable-"))
      .slice(0, 2)
      .map((value) => `.${value}`)
      .join("");
    return `${tag}${id}${classes}`.slice(0, 48);
  }

  function fullLabel(element) {
    const rect = element.getBoundingClientRect();
    return `${compactLabel(element)} · ${Math.round(rect.width)}×${Math.round(rect.height)}px`;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
