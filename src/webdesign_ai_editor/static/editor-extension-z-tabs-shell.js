(() => {
  "use strict";
  if (window.__WDA_TABS_SHELL_ACTIVE__) return;
  window.__WDA_TABS_SHELL_ACTIVE__ = true;

  const HOST_ID = "__wda_editor_host__";
  const tabs = [
    ["select", "Seleção", false, "Selecione um elemento da página para inspecionar e navegar pela hierarquia."],
    ["design", "Design", true, "Controles visuais de texto, tipografia, cor e aparência."],
    ["layout", "Layout", true, "Geometria, flex, grid, espaçamento e posicionamento."],
    ["css", "CSS", true, "O inspector CSS didático será exibido nesta aba."],
    ["assets", "Assets", false, "Identidade do projeto, favicon, imagens e nomes de exportação."],
    ["timeline", "Timeline", false, "Histórico persistido, undo/redo, importação e exportação de patches."],
    ["ai", "IA", true, "Prompt local, preview e aprovação de planos da Gemma."],
    ["js", "JS Hub", false, "Ferramentas visuais seguras registradas pelo projeto." ]
  ];

  const state = {
    shadow: null,
    content: null,
    selectedState: null,
    views: new Map(),
    active: "select",
    attempts: 0,
    observer: null
  };

  function boot() {
    const shadow = document.getElementById(HOST_ID)?.shadowRoot;
    const content = shadow?.querySelector(".wda-content");
    const selectedState = shadow?.querySelector("#wda-selected");
    if (!shadow || !content || !selectedState) {
      state.attempts += 1;
      if (state.attempts < 260) window.setTimeout(boot, 25);
      return;
    }
    if (shadow.getElementById("__wda_tablist__")) return;

    state.shadow = shadow;
    state.content = content;
    state.selectedState = selectedState;
    installSupplementalStyles(shadow);
    createShell(content);
    organizeExistingContent();
    observeSelection();
    observeNewPanels();
    exposeApi();
    activate(validStoredTab());
  }

  function installSupplementalStyles(shadow) {
    const style = document.createElement("style");
    style.id = "__wda_tabs_shell_styles__";
    style.textContent = `
      .wda-tab-view[data-selection-active="false"] [data-requires-selected-node="true"]{display:none!important}
      .wda-tab-view[data-selection-active="true"]>.wda-tab-empty{display:none!important}
      .wda-tab-view[data-selection-active="false"][data-tab="select"]>.wda-tab-empty{display:none!important}
      .wda-tab-view[data-has-content="true"]>.wda-tab-placeholder{display:none}
      #wda-selected{display:none!important}
    `;
    shadow.appendChild(style);
  }

  function createShell(content) {
    const tablist = document.createElement("div");
    tablist.id = "__wda_tablist__";
    tablist.className = "wda-tablist";
    tablist.setAttribute("role", "tablist");
    tablist.setAttribute("aria-label", "Views do WebAtelier Canvas");

    const viewport = document.createElement("div");
    viewport.className = "wda-tab-viewport";

    for (const [id, label, requiresSelection, placeholderText] of tabs) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "wda-tab";
      button.id = `__wda_tab_${id}__`;
      button.dataset.tab = id;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", `__wda_view_${id}__`);
      button.setAttribute("aria-selected", "false");
      button.tabIndex = -1;
      button.textContent = label;
      button.title = `Abrir a view ${label} do painel.`;
      button.addEventListener("click", () => activate(id));
      button.addEventListener("keydown", onTabKeyDown);
      tablist.appendChild(button);

      const view = document.createElement("section");
      view.id = `__wda_view_${id}__`;
      view.className = "wda-tab-view";
      view.dataset.tab = id;
      view.dataset.active = "false";
      view.dataset.requiresSelection = String(requiresSelection);
      view.dataset.selectionActive = "false";
      view.dataset.hasContent = "false";
      view.setAttribute("role", "tabpanel");
      view.setAttribute("aria-labelledby", button.id);
      view.hidden = true;

      const empty = document.createElement("div");
      empty.className = requiresSelection ? "wda-tab-empty" : "wda-tab-placeholder";
      empty.textContent = placeholderText;
      view.appendChild(empty);
      viewport.appendChild(view);
      state.views.set(id, view);
    }

    const footer = document.createElement("div");
    footer.className = "wda-panel-status";
    footer.dataset.wdaPanelStatus = "true";

    content.prepend(tablist);
    tablist.insertAdjacentElement("afterend", viewport);
    viewport.insertAdjacentElement("afterend", footer);
  }

  function organizeExistingContent() {
    const shadow = state.shadow;
    const selected = state.selectedState;
    if (!shadow || !selected) return;

    const emptyState = shadow.querySelector("#wda-empty");
    if (emptyState) register("select", emptyState, false);

    for (const node of Array.from(selected.children)) {
      const target = classify(node);
      register(target, node, true);
    }

    const status = shadow.querySelector("#wda-status");
    const footer = shadow.querySelector("[data-wda-panel-status]");
    if (status && footer) footer.appendChild(status);

    selected.hidden = true;
    updateSelectionState();
    scanDeclaredPanels();
  }

  function classify(node) {
    if (!(node instanceof Element)) return "design";
    if (node.matches(".wda-element-label, #wda-selector, #__wda_selection_inspector__, #__wda_transform_precision__, #__wda_guides_controls__")) return "select";
    if (node.matches("#__wda_properties_panel__")) return "layout";
    if (node.matches("#__wda_timeline_panel__, .wda-actions")) return "timeline";
    if (node.querySelector("#wda-prompt")) return "ai";
    if (node.querySelector("#wda-width, #wda-height, #wda-rotation")) return "layout";
    if (node.querySelector("#wda-text, #wda-font-family, #wda-color, #wda-background-color")) return "design";
    return node.getAttribute("data-wda-tab") || "design";
  }

  function register(tabId, element, requiresSelection = false) {
    const view = state.views.get(tabId) || state.views.get("design");
    if (!view || !(element instanceof Element) || view.contains(element)) return;
    element.dataset.wdaTabMoved = "true";
    if (requiresSelection) element.dataset.requiresSelectedNode = "true";
    view.appendChild(element);
    view.dataset.hasContent = "true";
  }

  function scanDeclaredPanels() {
    const shadow = state.shadow;
    if (!shadow) return;
    for (const element of shadow.querySelectorAll("[data-wda-tab]:not(.wda-tab):not(.wda-tab-view)")) {
      const tabId = element.getAttribute("data-wda-tab") || "design";
      const requiresSelection = element.getAttribute("data-wda-requires-selection") === "true";
      register(tabId, element, requiresSelection);
    }
  }

  function observeNewPanels() {
    const shadow = state.shadow;
    if (!shadow) return;
    state.observer = new MutationObserver(() => scanDeclaredPanels());
    state.observer.observe(shadow, { childList: true, subtree: true });
  }

  function observeSelection() {
    const selected = state.selectedState;
    if (!selected) return;
    const observer = new MutationObserver(updateSelectionState);
    observer.observe(selected, { attributes: true, attributeFilter: ["data-active"] });
  }

  function updateSelectionState() {
    const active = state.selectedState?.dataset.active === "true";
    for (const view of state.views.values()) view.dataset.selectionActive = String(active);
  }

  function activate(tabId) {
    if (!state.views.has(tabId)) tabId = "select";
    state.active = tabId;
    sessionStorage.setItem("wda-active-tab", tabId);

    for (const [id, view] of state.views) {
      const active = id === tabId;
      view.dataset.active = String(active);
      view.hidden = !active;
    }
    for (const button of state.shadow?.querySelectorAll(".wda-tab") || []) {
      const active = button.getAttribute("data-tab") === tabId;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    }
    window.dispatchEvent(new Event("resize"));
  }

  function onTabKeyDown(event) {
    const buttons = Array.from(state.shadow?.querySelectorAll(".wda-tab") || []);
    const current = buttons.indexOf(event.currentTarget);
    if (current < 0) return;
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % buttons.length;
    else if (event.key === "ArrowLeft") next = (current - 1 + buttons.length) % buttons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = buttons.length - 1;
    else return;
    event.preventDefault();
    const button = buttons[next];
    if (button instanceof HTMLButtonElement) {
      button.focus();
      activate(button.dataset.tab || "select");
    }
  }

  function validStoredTab() {
    const stored = sessionStorage.getItem("wda-active-tab") || "select";
    return state.views.has(stored) ? stored : "select";
  }

  function exposeApi() {
    window.__WDA_TABS_API__ = {
      activate,
      getView: (id) => state.views.get(id) || null,
      register: (id, element, options = {}) => register(id, element, Boolean(options.requiresSelection)),
      active: () => state.active
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
