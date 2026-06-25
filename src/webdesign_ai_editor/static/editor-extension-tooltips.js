(() => {
  "use strict";
  if (window.__WDA_TOOLTIPS_ACTIVE__) return;
  window.__WDA_TOOLTIPS_ACTIVE__ = true;

  const HOST_ID = "__wda_editor_host__";
  const state = { shadow: null, tooltip: null, target: null, timer: 0, attempts: 0 };
  const fallback = new Map([
    ["wda-mode", "Alterna entre Editar e Interagir. Em Interagir, a página recebe cliques normalmente. Atalho: Alt+E."],
    ["wda-undo", "Desfaz a última alteração visual registrada. Atalho: Ctrl+Z."],
    ["wda-redo", "Refaz a última alteração desfeita. Atalho: Ctrl+Shift+Z ou Ctrl+Y."],
    ["wda-apply-prompt", "Envia o contexto do elemento à Gemma local e abre um preview antes de aplicar."],
    ["wda-text", "Edita o texto simples do elemento selecionado."],
    ["wda-width", "Define a largura inline do elemento em pixels."],
    ["wda-height", "Define a altura inline do elemento em pixels."],
    ["wda-rotation", "Rotaciona o elemento selecionado em graus."]
  ]);

  function boot() {
    const shadow = document.getElementById(HOST_ID)?.shadowRoot;
    if (!shadow) {
      state.attempts += 1;
      if (state.attempts < 240) window.setTimeout(boot, 25);
      return;
    }
    state.shadow = shadow;
    createTooltip(shadow);
    annotate(shadow);
    shadow.addEventListener("pointerover", onPointerOver);
    shadow.addEventListener("pointerout", onPointerOut);
    shadow.addEventListener("focusin", onFocusIn);
    shadow.addEventListener("focusout", hide);
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") hide();
    }, true);
    const observer = new MutationObserver(() => annotate(shadow));
    observer.observe(shadow, { childList: true, subtree: true });
  }

  function createTooltip(shadow) {
    if (shadow.getElementById("__wda_tooltip__")) {
      state.tooltip = shadow.getElementById("__wda_tooltip__");
      return;
    }
    const tooltip = document.createElement("div");
    tooltip.id = "__wda_tooltip__";
    tooltip.className = "wda-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.dataset.open = "false";
    shadow.appendChild(tooltip);
    state.tooltip = tooltip;
  }

  function annotate(root) {
    for (const control of root.querySelectorAll("button, input, select, textarea, summary, [role=button], [role=tab]")) {
      if (!(control instanceof HTMLElement)) continue;
      const text = tooltipText(control);
      if (text) control.dataset.wdaTooltip = text;
      if (control instanceof HTMLButtonElement && !control.getAttribute("aria-label")) {
        control.setAttribute("aria-label", control.textContent?.trim() || text || "Controle do editor");
      }
    }
  }

  function tooltipText(control) {
    return control.dataset.wdaTooltip
      || control.getAttribute("title")
      || (control.id ? fallback.get(control.id) : "")
      || control.getAttribute("aria-label")
      || labelText(control)
      || control.textContent?.trim()
      || "";
  }

  function labelText(control) {
    const label = control.closest("label")?.querySelector("span");
    return label?.textContent?.trim() || "";
  }

  function onPointerOver(event) {
    const target = interactiveTarget(event);
    if (target) schedule(target, 260);
  }

  function onPointerOut(event) {
    if (interactiveTarget(event) === state.target) hide();
  }

  function onFocusIn(event) {
    const target = interactiveTarget(event);
    if (target) schedule(target, 80);
  }

  function interactiveTarget(event) {
    return event.composedPath().find((node) => node instanceof HTMLElement && node.dataset.wdaTooltip) || null;
  }

  function schedule(target, delay) {
    hide();
    state.target = target;
    state.timer = window.setTimeout(() => show(target), delay);
  }

  function show(target) {
    const tooltip = state.tooltip;
    if (!tooltip || !target.isConnected) return;
    const text = target.dataset.wdaTooltip || "";
    if (!text) return;
    tooltip.textContent = text;
    tooltip.dataset.open = "true";
    const rect = target.getBoundingClientRect();
    const width = Math.min(280, Math.max(160, text.length * 4.8));
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left));
    const top = rect.bottom + 98 < window.innerHeight ? rect.bottom + 8 : Math.max(8, rect.top - 58);
    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
    tooltip.style.width = `${Math.round(width)}px`;
  }

  function hide() {
    if (state.timer) window.clearTimeout(state.timer);
    state.timer = 0;
    state.target = null;
    if (state.tooltip) state.tooltip.dataset.open = "false";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
