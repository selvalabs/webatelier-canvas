(() => {
  "use strict";
  if (window.__WDA_UI_CONTROLS__) return;
  window.__WDA_UI_CONTROLS__ = true;
  let attempts = 0;
  let collapsed = false;

  function boot() {
    const shadow = document.getElementById("__wda_editor_host__")?.shadowRoot;
    const header = shadow?.querySelector(".wda-header");
    const content = shadow?.querySelector(".wda-content");
    const mode = shadow?.querySelector("#wda-mode");
    if (!shadow || !header || !content || !mode) {
      attempts += 1;
      if (attempts < 200) window.setTimeout(boot, 25);
      return;
    }

    addStyles(shadow);
    if (!header.querySelector(".wda-header-tools")) {
      const tools = document.createElement("div");
      tools.className = "wda-header-tools";
      const help = makeButton("?", "Atalhos");
      const toggle = makeButton("↔", "Recolher painel");
      mode.remove();
      tools.append(mode, help, toggle);
      header.appendChild(tools);
      help.addEventListener("click", showHelp);
      toggle.addEventListener("click", togglePanel);
    }

    if (!content.querySelector("#__wda_shortcuts__")) {
      const legend = document.createElement("div");
      legend.id = "__wda_shortcuts__";
      legend.className = "wda-shortcuts";
      legend.textContent = "Alt+E editar · Alt+P painel · Esc limpar · Ctrl+Z desfazer · Shift+setas acelerar";
      content.prepend(legend);
    }
    window.addEventListener("keydown", onKeyDown, true);
  }

  function addStyles(shadow) {
    if (shadow.getElementById("__wda_ui_control_styles__")) return;
    const style = document.createElement("style");
    style.id = "__wda_ui_control_styles__";
    style.textContent = ".wda-header-tools{display:flex;align-items:center;gap:6px}.wda-shell-button{width:30px;height:30px;border:1px solid var(--wda-line);border-radius:8px;background:rgba(6,12,24,.62);color:var(--wda-muted);cursor:pointer;font:800 12px/1 ui-monospace,monospace}.wda-shell-button:hover{color:var(--wda-ink);border-color:var(--wda-blue)}.wda-shortcuts{display:none;margin:0 0 10px;padding:9px;border:1px solid var(--wda-line);border-radius:10px;background:rgba(3,8,18,.92);color:var(--wda-muted);font:550 10px/1.6 ui-monospace,monospace}.wda-shortcuts[data-open=true]{display:block}.wda-panel[data-collapsed=true]{width:78px!important}.wda-panel[data-collapsed=true] .wda-content,.wda-panel[data-collapsed=true] .wda-brand-copy,.wda-panel[data-collapsed=true] .wda-mode,.wda-panel[data-collapsed=true] .wda-shell-button:first-of-type{display:none!important}.wda-panel[data-collapsed=true] .wda-brand{display:none!important}.wda-panel[data-collapsed=true] .wda-header{justify-content:center!important;padding-left:12px!important}";
    shadow.appendChild(style);
  }

  function makeButton(text, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "wda-shell-button";
    button.textContent = text;
    button.title = label;
    button.setAttribute("aria-label", label);
    return button;
  }

  function showHelp() {
    const legend = document.getElementById("__wda_editor_host__")?.shadowRoot?.getElementById("__wda_shortcuts__");
    if (legend) legend.dataset.open = legend.dataset.open === "true" ? "false" : "true";
  }

  function togglePanel() {
    const panel = document.getElementById("__wda_editor_host__")?.shadowRoot?.querySelector(".wda-panel");
    if (!panel) return;
    collapsed = !collapsed;
    panel.dataset.collapsed = String(collapsed);
  }

  function onKeyDown(event) {
    if (event.altKey && event.key.toLowerCase() === "p") {
      event.preventDefault();
      togglePanel();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
