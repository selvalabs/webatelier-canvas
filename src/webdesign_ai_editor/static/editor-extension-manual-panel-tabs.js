(() => {
  "use strict";

  const ACTIVE_FLAG = "__WDA_MANUAL_PANEL_TABS_ACTIVE__";
  const HOST_ID = "__wda_editor_host__";
  const STYLE_ID = "__wda_manual_panel_tabs_style__";
  const TABS_ID = "__wda_manual_tabs__";
  const PANELS_ID = "__wda_manual_panels__";
  const FOOTER_ID = "__wda_manual_footer__";
  const MAX_BOOT_ATTEMPTS = 240;

  if (window[ACTIVE_FLAG]) return;
  window[ACTIVE_FLAG] = true;

  const state = {
    attempts: 0,
    activeTab: loadActiveTab()
  };

  function boot() {
    const host = document.getElementById(HOST_ID);
    const shadow = host?.shadowRoot;
    const selected = shadow?.querySelector("#wda-selected");

    if (!host || !shadow || !selected) {
      state.attempts += 1;
      if (state.attempts < MAX_BOOT_ATTEMPTS) window.setTimeout(boot, 25);
      return;
    }

    if (selected.dataset.wdaManualTabsReady === "true") return;
    selected.dataset.wdaManualTabsReady = "true";

    renameEditor(shadow);
    installStyles(shadow);
    organizePanel(shadow, selected);
    switchTab(shadow, state.activeTab);
  }

  function renameEditor(shadow) {
    const brand = shadow.querySelector(".wda-brand");
    if (brand) brand.textContent = "WebAtelier Canvas";

    const panel = shadow.querySelector(".wda-panel");
    if (panel) panel.setAttribute("aria-label", "WebAtelier Canvas");
  }

  function installStyles(shadow) {
    if (shadow.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .wda-manual-summary {
        position: sticky;
        top: 0;
        z-index: 4;
        margin: 0 0 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.18);
        background: linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9));
        backdrop-filter: blur(10px);
      }

      .wda-manual-tabs {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 5px;
        margin: 10px 0 10px;
      }

      .wda-manual-tab {
        min-height: 30px;
        padding: 6px 7px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 8px;
        background: rgba(15, 23, 42, 0.52);
        color: #cbd5e1;
        cursor: pointer;
        font: 700 10px/1 ui-sans-serif, system-ui, sans-serif;
        letter-spacing: 0.01em;
      }

      .wda-manual-tab:hover {
        border-color: rgba(96, 165, 250, 0.62);
        color: #e2e8f0;
      }

      .wda-manual-tab[aria-selected="true"] {
        border-color: rgba(96, 165, 250, 0.9);
        background: rgba(37, 99, 235, 0.28);
        color: #ffffff;
      }

      .wda-manual-panels {
        display: block;
      }

      .wda-manual-panel[hidden] {
        display: none !important;
      }

      .wda-manual-panel .wda-section:first-child {
        margin-top: 0;
      }

      .wda-manual-note {
        margin: 0;
        padding: 10px;
        border: 1px dashed rgba(148, 163, 184, 0.28);
        border-radius: 10px;
        color: #cbd5e1;
        background: rgba(15, 23, 42, 0.42);
        font: 500 11px/1.45 ui-sans-serif, system-ui, sans-serif;
      }

      .wda-manual-footer {
        position: sticky;
        bottom: 0;
        z-index: 4;
        display: grid;
        gap: 7px;
        margin-top: 10px;
        padding-top: 9px;
        border-top: 1px solid rgba(148, 163, 184, 0.18);
        background: linear-gradient(0deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9));
        backdrop-filter: blur(10px);
      }

      .wda-manual-experimental {
        display: none !important;
      }

      @media (max-width: 420px) {
        .wda-manual-tabs {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `;
    shadow.appendChild(style);
  }

  function organizePanel(shadow, selected) {
    const elementLabel = selected.querySelector("#wda-element-label");
    const selectorLabel = selected.querySelector("#wda-selector");
    const empty = shadow.querySelector("#wda-empty");

    const summary = document.createElement("div");
    summary.className = "wda-manual-summary";
    if (elementLabel) summary.appendChild(elementLabel);
    if (selectorLabel) summary.appendChild(selectorLabel);

    const tabs = document.createElement("div");
    tabs.id = TABS_ID;
    tabs.className = "wda-manual-tabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Controles manuais");

    const panels = document.createElement("div");
    panels.id = PANELS_ID;
    panels.className = "wda-manual-panels";

    const tabDefinitions = [
      { id: "content", label: "Conteúdo" },
      { id: "layout", label: "Layout" },
      { id: "style", label: "Estilo" },
      { id: "advanced", label: "Avançado" }
    ];

    for (const definition of tabDefinitions) {
      tabs.appendChild(createTabButton(definition));
      panels.appendChild(createPanel(definition));
    }

    const sections = Array.from(selected.querySelectorAll("fieldset.wda-section"));
    for (const section of sections) {
      const title = section.querySelector("legend")?.textContent?.trim().toLowerCase() || "";
      if (title.includes("conteúdo")) {
        panelFor(panels, "content").appendChild(section);
      } else if (title.includes("geometria")) {
        renameLegend(section, "Layout");
        panelFor(panels, "layout").appendChild(section);
      } else if (title.includes("tipografia") || title.includes("aparência")) {
        panelFor(panels, "style").appendChild(section);
      } else if (title.includes("prompt")) {
        section.classList.add("wda-manual-experimental");
        section.setAttribute("aria-hidden", "true");
        selected.appendChild(section);
      }
    }

    const advancedPanel = panelFor(panels, "advanced");
    if (!advancedPanel.children.length) {
      const note = document.createElement("p");
      note.className = "wda-manual-note";
      note.textContent = "Próximo passo: concentrar aqui controles finos como margin, padding, z-index, overflow, position e box-shadow, sem poluir a edição básica.";
      advancedPanel.appendChild(note);
    }

    const footer = document.createElement("div");
    footer.id = FOOTER_ID;
    footer.className = "wda-manual-footer";

    const actions = selected.querySelector(".wda-actions");
    const status = selected.querySelector("#wda-status");
    if (actions) footer.appendChild(actions);
    if (status) footer.appendChild(status);

    if (empty) empty.insertAdjacentElement("afterend", summary);
    else selected.prepend(summary);
    summary.insertAdjacentElement("afterend", tabs);
    tabs.insertAdjacentElement("afterend", panels);
    selected.appendChild(footer);
  }

  function createTabButton(definition) {
    const button = document.createElement("button");
    button.className = "wda-manual-tab";
    button.type = "button";
    button.id = `wda-manual-tab-${definition.id}`;
    button.dataset.wdaManualTab = definition.id;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", `wda-manual-panel-${definition.id}`);
    button.textContent = definition.label;
    button.addEventListener("click", () => switchTab(button.getRootNode(), definition.id));
    return button;
  }

  function createPanel(definition) {
    const panel = document.createElement("div");
    panel.className = "wda-manual-panel";
    panel.id = `wda-manual-panel-${definition.id}`;
    panel.dataset.wdaManualPanel = definition.id;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", `wda-manual-tab-${definition.id}`);
    return panel;
  }

  function panelFor(panels, id) {
    return panels.querySelector(`[data-wda-manual-panel="${id}"]`);
  }

  function renameLegend(section, value) {
    const legend = section.querySelector("legend");
    if (legend) legend.textContent = value;
  }

  function switchTab(root, tabId) {
    const shadow = root instanceof ShadowRoot ? root : document.getElementById(HOST_ID)?.shadowRoot;
    if (!shadow) return;

    const fallback = shadow.querySelector(`[data-wda-manual-tab="${tabId}"]`) ? tabId : "content";
    for (const button of shadow.querySelectorAll("[data-wda-manual-tab]")) {
      const active = button.dataset.wdaManualTab === fallback;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    }

    for (const panel of shadow.querySelectorAll("[data-wda-manual-panel]")) {
      panel.hidden = panel.dataset.wdaManualPanel !== fallback;
    }

    state.activeTab = fallback;
    try {
      localStorage.setItem("wda-manual-panel-tab", fallback);
    } catch {
      // Ignore private browsing or unavailable storage.
    }
  }

  function loadActiveTab() {
    try {
      return localStorage.getItem("wda-manual-panel-tab") || "content";
    } catch {
      return "content";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
