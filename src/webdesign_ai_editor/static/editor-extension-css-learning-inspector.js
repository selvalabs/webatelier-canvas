(() => {
  "use strict";
  if (window.__WDA_CSS_LEARNING_ACTIVE__) return;
  window.__WDA_CSS_LEARNING_ACTIVE__ = true;

  const state = { api: null, selected: null, panel: null, attempts: 0 };

  function boot() {
    const api = window.__WDA_EXTENSION_API__;
    const catalog = window.__WDA_CSS_PROPERTY_CATALOG__;
    const shadow = document.getElementById("__wda_editor_host__")?.shadowRoot;
    if (!api || !Array.isArray(catalog) || !shadow) {
      state.attempts += 1;
      if (state.attempts < 260) window.setTimeout(boot, 25);
      return;
    }
    state.api = api;
    state.selected = api.getSelectedElement();
    state.panel = createPanel(shadow, catalog);
    bindPanel(state.panel);
    window.addEventListener("wda:selection-changed", (event) => {
      state.selected = event.detail?.element || null;
      syncAll();
    });
    syncAll();
  }

  function createPanel(shadow, catalog) {
    const existing = shadow.getElementById("__wda_css_learning__");
    if (existing) return existing;
    const panel = document.createElement("section");
    panel.id = "__wda_css_learning__";
    panel.className = "wda-css-learning";
    panel.dataset.wdaTab = "css";
    panel.dataset.wdaRequiresSelection = "true";
    panel.innerHTML = `<div class="wda-css-learning__head"><span class="wda-css-learning__title">CSS Learning Inspector</span><p class="wda-css-learning__intro">Edite com nomes CSS reais. O slider representa 0–100% da faixa segura; o campo mantém o valor final do CSS.</p><input class="wda-css-learning__search" type="search" placeholder="Buscar propriedade CSS" aria-label="Buscar propriedade CSS"></div><div data-css-groups></div><p class="wda-css-learning__empty" data-css-empty hidden>Nenhuma propriedade encontrada.</p>`;

    const groupsRoot = panel.querySelector("[data-css-groups]");
    for (const groupName of [...new Set(catalog.map((item) => item.group))]) {
      const group = document.createElement("section");
      group.className = "wda-css-group";
      group.dataset.group = groupName;
      group.innerHTML = `<h3 class="wda-css-group__title">${escapeText(groupName)}</h3>`;
      for (const definition of catalog.filter((item) => item.group === groupName)) {
        group.appendChild(renderControl(definition));
      }
      groupsRoot?.appendChild(group);
    }

    const selected = shadow.querySelector("#wda-selected");
    if (selected) selected.appendChild(panel);
    return panel;
  }

  function renderControl(definition) {
    const control = document.createElement("article");
    control.className = "wda-css-control";
    control.dataset.property = definition.property;
    control.dataset.search = `${definition.css} ${definition.group} ${definition.explanation}`.toLowerCase();
    control.__definition = definition;

    const inputMarkup = definition.kind === "select"
      ? `<select class="wda-css-control__select" data-css-value>${definition.options.map((value) => `<option value="${escapeAttribute(value)}">${escapeText(value)}</option>`).join("")}</select>`
      : `<input class="wda-css-control__input" data-css-value type="text" spellcheck="false">`;
    const rangeMarkup = definition.kind === "text" || definition.kind === "select"
      ? ""
      : `<input class="wda-css-control__range" data-css-range type="range" min="0" max="100" step="1" aria-label="Ajustar ${escapeAttribute(definition.css)} de 0 a 100 por cento">`;

    control.innerHTML = `<div class="wda-css-control__top"><code class="wda-css-control__name">${escapeText(definition.css)}</code><button class="wda-css-control__reset" type="button" data-css-reset title="Remove o valor inline e volta a usar a cascata CSS.">Reset</button></div><p class="wda-css-control__help">${escapeText(definition.explanation)}</p><code class="wda-css-control__example">${escapeText(definition.example)}</code><div class="wda-css-control__values">${rangeMarkup || "<span></span>"}${inputMarkup}</div><div class="wda-css-control__meta"><span data-css-computed>computed: —</span><span data-css-inline>inline: —</span></div>`;
    return control;
  }

  function bindPanel(panel) {
    panel.querySelector(".wda-css-learning__search")?.addEventListener("input", filterControls);
    for (const control of panel.querySelectorAll(".wda-css-control")) {
      control.querySelector("[data-css-range]")?.addEventListener("input", () => applyFromRange(control));
      control.querySelector("[data-css-value]")?.addEventListener("change", () => applyFromValue(control));
      control.querySelector("[data-css-reset]")?.addEventListener("click", () => resetControl(control));
    }
  }

  function syncAll() {
    if (!state.panel) return;
    const disabled = !state.selected;
    for (const input of state.panel.querySelectorAll("input, select, button")) input.disabled = disabled;
    for (const control of state.panel.querySelectorAll(".wda-css-control")) syncControl(control);
  }

  function syncControl(control) {
    const element = state.selected;
    const definition = control.__definition;
    if (!element || !definition) return;
    const cssName = camelToKebab(definition.property);
    const inline = element.style.getPropertyValue(cssName);
    const computed = computedValue(element, definition);
    const value = inline || computed;
    const valueInput = control.querySelector("[data-css-value]");
    if (valueInput) valueInput.value = value;
    const range = control.querySelector("[data-css-range]");
    if (range) range.value = String(toPercent(parseDefinitionValue(value, definition), definition));
    const computedLabel = control.querySelector("[data-css-computed]");
    const inlineLabel = control.querySelector("[data-css-inline]");
    if (computedLabel) computedLabel.textContent = `computed: ${computed || "—"}`;
    if (inlineLabel) inlineLabel.textContent = `inline: ${inline || "—"}`;
  }

  function applyFromRange(control) {
    const definition = control.__definition;
    const range = control.querySelector("[data-css-range]");
    if (!definition || !range) return;
    const percent = Number(range.value);
    const numeric = fromPercent(percent, definition);
    const value = definition.kind === "rotate"
      ? replaceRotation(state.selected?.style.transform || "", numeric)
      : `${formatNumber(numeric)}${definition.unit || ""}`;
    const valueInput = control.querySelector("[data-css-value]");
    if (valueInput) valueInput.value = definition.kind === "rotate" ? `${formatNumber(numeric)}deg` : value;
    void applyValue(definition, value);
  }

  function applyFromValue(control) {
    const definition = control.__definition;
    const input = control.querySelector("[data-css-value]");
    if (!definition || !input) return;
    let value = input.value.trim();
    if (definition.kind === "rotate") {
      const numeric = Number.parseFloat(value);
      if (!Number.isFinite(numeric)) return reportInvalid(definition.css);
      value = replaceRotation(state.selected?.style.transform || "", numeric);
    }
    if (!safeCss(value)) return reportInvalid(definition.css);
    void applyValue(definition, value);
  }

  async function applyValue(definition, value) {
    const element = state.selected;
    if (!element) return;
    const cssName = camelToKebab(definition.property);
    const beforeValue = element.style.getPropertyValue(cssName);
    const before = beforeValue || null;
    element.style.setProperty(cssName, value);
    const after = element.style.getPropertyValue(cssName) || null;
    if (before !== after) {
      await state.api.emitPatch({ selector: state.api.getSelector(), source: "manual", action: "set_style", property: definition.property, before, after });
    }
    state.api.refreshSelection();
    state.api.setStatus(`${definition.css} atualizado.`, "success");
    window.dispatchEvent(new Event("resize"));
    syncAll();
  }

  async function resetControl(control) {
    const element = state.selected;
    const definition = control.__definition;
    if (!element || !definition) return;
    const cssName = camelToKebab(definition.property);
    const before = element.style.getPropertyValue(cssName) || null;
    element.style.removeProperty(cssName);
    if (before !== null) {
      await state.api.emitPatch({ selector: state.api.getSelector(), source: "manual", action: "set_style", property: definition.property, before, after: null });
    }
    state.api.refreshSelection();
    state.api.setStatus(`${definition.css} voltou à cascata.`, "success");
    syncAll();
  }

  function filterControls(event) {
    const query = event.target.value.trim().toLowerCase();
    let visible = 0;
    for (const control of state.panel.querySelectorAll(".wda-css-control")) {
      const match = !query || control.dataset.search.includes(query);
      control.hidden = !match;
      if (match) visible += 1;
    }
    for (const group of state.panel.querySelectorAll(".wda-css-group")) {
      group.hidden = !group.querySelector(".wda-css-control:not([hidden])");
    }
    const empty = state.panel.querySelector("[data-css-empty]");
    if (empty) empty.hidden = visible > 0;
  }

  function computedValue(element, definition) {
    const computed = getComputedStyle(element);
    if (definition.kind === "rotate") return `${formatNumber(readRotation(computed.transform))}deg`;
    return computed[definition.property] || "";
  }

  function parseDefinitionValue(value, definition) {
    if (definition.kind === "rotate") return Number.parseFloat(value) || 0;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : definition.min;
  }

  function toPercent(value, definition) {
    return Math.max(0, Math.min(100, ((value - definition.min) / (definition.max - definition.min)) * 100));
  }

  function fromPercent(percent, definition) {
    const raw = definition.min + (definition.max - definition.min) * (percent / 100);
    const step = definition.step || 1;
    return Math.round(raw / step) * step;
  }

  function readRotation(transform) {
    if (!transform || transform === "none") return 0;
    const direct = transform.match(/rotate(?:Z)?\(\s*(-?[\d.]+)deg\s*\)/i);
    if (direct) return Number(direct[1]) || 0;
    try {
      const matrix = new DOMMatrixReadOnly(transform);
      return Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
    } catch { return 0; }
  }

  function replaceRotation(transform, degrees) {
    const rotation = `rotate(${formatNumber(degrees)}deg)`;
    const clean = (transform || "").trim();
    if (!clean || clean === "none") return rotation;
    return /rotate(?:Z)?\([^)]*\)/i.test(clean)
      ? clean.replace(/rotate(?:Z)?\([^)]*\)/i, rotation)
      : `${clean} ${rotation}`;
  }

  function safeCss(value) {
    const lowered = value.toLowerCase();
    return !["javascript:", "vbscript:", "expression(", "@import", "<", ">"].some((item) => lowered.includes(item));
  }

  function reportInvalid(property) {
    state.api?.setStatus(`Valor inválido para ${property}.`, "error");
  }

  function camelToKebab(value) { return value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`); }
  function formatNumber(value) { return String(Math.round(value * 100) / 100); }
  function escapeText(value) { const span = document.createElement("span"); span.textContent = String(value); return span.innerHTML; }
  function escapeAttribute(value) { return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;"); }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
