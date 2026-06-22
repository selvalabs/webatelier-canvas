(() => {
  "use strict";
  if (window.__WDA_PROPERTIES_ACTIVE__) return;
  window.__WDA_PROPERTIES_ACTIVE__ = true;

  const state = { api: null, selected: null, attempts: 0 };
  const styleFields = [
    ["display", "Display", "select", ["", "block", "inline", "inline-block", "flex", "inline-flex", "grid", "none"]],
    ["flexDirection", "Direção", "select", ["", "row", "column", "row-reverse", "column-reverse"]],
    ["alignItems", "Alinhar", "select", ["", "stretch", "flex-start", "center", "flex-end", "baseline"]],
    ["justifyContent", "Distribuir", "select", ["", "flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"]],
    ["gap", "Gap", "text"],
    ["padding", "Padding", "text"],
    ["margin", "Margin", "text"],
    ["minWidth", "Min width", "text"],
    ["maxWidth", "Max width", "text"],
    ["minHeight", "Min height", "text"],
    ["maxHeight", "Max height", "text"],
    ["lineHeight", "Line height", "text"],
    ["letterSpacing", "Tracking", "text"],
    ["boxShadow", "Sombra", "text"],
    ["zIndex", "Z-index", "number"],
    ["overflow", "Overflow", "select", ["", "visible", "hidden", "clip", "auto", "scroll"]],
    ["objectFit", "Imagem fit", "select", ["", "cover", "contain", "fill", "none", "scale-down"]]
  ];
  const attributeFields = [
    ["href", "Link href"],
    ["src", "Imagem src"],
    ["alt", "Texto alternativo"],
    ["title", "Título acessível"]
  ];

  function boot() {
    const api = window.__WDA_EXTENSION_API__;
    const shadow = document.getElementById("__wda_editor_host__")?.shadowRoot;
    if (!api || !shadow) {
      state.attempts += 1;
      if (state.attempts < 200) window.setTimeout(boot, 25);
      return;
    }
    state.api = api;
    state.selected = api.getSelectedElement();
    installStyles(shadow);
    installPanel(shadow);
    window.addEventListener("wda:selection-changed", (event) => {
      state.selected = event.detail?.element || null;
      syncFields(shadow);
    });
    syncFields(shadow);
  }

  function installStyles(shadow) {
    if (shadow.getElementById("__wda_properties_styles__")) return;
    const style = document.createElement("style");
    style.id = "__wda_properties_styles__";
    style.textContent = `
      .wda-properties{margin:0 0 10px}.wda-properties details{margin:0 0 7px;border:1px solid var(--wda-line,rgba(148,163,184,.24));border-radius:9px;background:rgba(4,11,23,.28)}.wda-properties summary{padding:8px 9px;color:#a8c8e8;cursor:pointer;font:700 10px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase}.wda-properties summary:focus-visible{outline:2px solid var(--wda-blue,#61b8ff);outline-offset:2px}.wda-properties__body{padding:0 9px 9px}.wda-properties__grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.wda-properties__field{display:grid;gap:4px;min-width:0}.wda-properties__field[data-wide=true]{grid-column:1/-1}.wda-properties__field span{color:var(--wda-muted,#91a5bd);font:700 9px/1.25 ui-sans-serif,system-ui,sans-serif}.wda-properties__clear{margin-top:7px;width:100%;min-height:28px;border:1px solid var(--wda-line);border-radius:7px;background:transparent;color:var(--wda-muted);cursor:pointer;font:700 9px/1 ui-sans-serif,system-ui,sans-serif}.wda-properties__clear:hover{color:var(--wda-ink);border-color:var(--wda-blue)}
    `;
    shadow.appendChild(style);
  }

  function installPanel(shadow) {
    if (shadow.getElementById("__wda_properties_panel__")) return;
    const selected = shadow.querySelector("#wda-selected");
    const promptSection = shadow.querySelector("#wda-prompt")?.closest("fieldset");
    if (!selected) return;

    const wrapper = document.createElement("section");
    wrapper.id = "__wda_properties_panel__";
    wrapper.className = "wda-properties";
    wrapper.innerHTML = `${renderGroup("Layout", styleFields.slice(0, 9), "layout")}${renderGroup("Detalhes", styleFields.slice(9), "details")}${renderAttributes()}`;
    if (promptSection) selected.insertBefore(wrapper, promptSection);
    else selected.appendChild(wrapper);

    for (const field of wrapper.querySelectorAll("[data-style]")) {
      field.addEventListener("change", () => void applyStyleField(field));
    }
    for (const field of wrapper.querySelectorAll("[data-attribute]")) {
      field.addEventListener("change", () => void applyAttributeField(field));
    }
    for (const button of wrapper.querySelectorAll("[data-clear-group]")) {
      button.addEventListener("click", () => void clearGroup(button.getAttribute("data-clear-group") || ""));
    }
  }

  function renderGroup(title, fields, group) {
    return `<details${group === "layout" ? " open" : ""}><summary>${title}</summary><div class="wda-properties__body"><div class="wda-properties__grid">${fields.map(renderStyleField).join("")}</div><button type="button" class="wda-properties__clear" data-clear-group="${group}">Limpar estilos deste grupo</button></div></details>`;
  }

  function renderStyleField(field) {
    const [property, label, type, options] = field;
    const wide = ["boxShadow", "padding", "margin"].includes(property);
    if (type === "select") {
      return `<label class="wda-properties__field" data-wide="${wide}"><span>${label}</span><select class="wda-select" data-style="${property}">${options.map((value) => `<option value="${value}">${value || "auto"}</option>`).join("")}</select></label>`;
    }
    return `<label class="wda-properties__field" data-wide="${wide}"><span>${label}</span><input class="wda-input" type="${type}" data-style="${property}" placeholder="auto"></label>`;
  }

  function renderAttributes() {
    return `<details><summary>Conteúdo e mídia</summary><div class="wda-properties__body"><div class="wda-properties__grid">${attributeFields.map(([name, label]) => `<label class="wda-properties__field" data-wide="true"><span>${label}</span><input class="wda-input" type="text" data-attribute="${name}"></label>`).join("")}</div></div></details>`;
  }

  async function applyStyleField(field) {
    const element = state.selected;
    const property = field.getAttribute("data-style");
    if (!element || !property || !state.api) return;
    const value = field.value.trim();
    if (!isSafeCssValue(value)) {
      state.api.setStatus("Valor CSS bloqueado por segurança.", "error");
      syncFields(document.getElementById("__wda_editor_host__")?.shadowRoot);
      return;
    }
    const cssName = camelToKebab(property);
    const beforeValue = element.style.getPropertyValue(cssName);
    const before = beforeValue === "" ? null : beforeValue;
    if (value) element.style.setProperty(cssName, value);
    else element.style.removeProperty(cssName);
    const afterValue = element.style.getPropertyValue(cssName);
    const after = afterValue === "" ? null : afterValue;
    if (before !== after) await emit("set_style", property, before, after);
    refresh("Propriedade atualizada.");
  }

  async function applyAttributeField(field) {
    const element = state.selected;
    const name = field.getAttribute("data-attribute");
    if (!element || !name || !state.api) return;
    const value = field.value.trim();
    if (!isSafeAttribute(name, value)) {
      state.api.setStatus("Valor de atributo bloqueado por segurança.", "error");
      syncFields(document.getElementById("__wda_editor_host__")?.shadowRoot);
      return;
    }
    const before = element.getAttribute(name);
    if (value) element.setAttribute(name, value);
    else element.removeAttribute(name);
    const after = element.getAttribute(name);
    if (before !== after) await emit("set_attribute", name, before, after);
    refresh("Atributo atualizado.");
  }

  async function clearGroup(group) {
    const properties = group === "layout" ? styleFields.slice(0, 9) : styleFields.slice(9);
    for (const [property] of properties) {
      const element = state.selected;
      if (!element) break;
      const cssName = camelToKebab(property);
      const beforeValue = element.style.getPropertyValue(cssName);
      if (!beforeValue) continue;
      element.style.removeProperty(cssName);
      await emit("set_style", property, beforeValue, null);
    }
    refresh("Grupo de estilos limpo.");
  }

  async function emit(action, property, before, after) {
    return state.api.emitPatch({ selector: state.api.getSelector(), source: "manual", action, property, before, after });
  }

  function refresh(message) {
    state.api?.refreshSelection();
    state.api?.setStatus(message, "success");
    window.dispatchEvent(new Event("resize"));
  }

  function syncFields(shadow) {
    const panel = shadow?.getElementById("__wda_properties_panel__");
    if (!panel) return;
    const element = state.selected;
    for (const field of panel.querySelectorAll("input, select, button")) field.disabled = !element;
    if (!element) return;
    const computed = getComputedStyle(element);
    for (const field of panel.querySelectorAll("[data-style]")) {
      const property = field.getAttribute("data-style");
      const inline = property ? element.style.getPropertyValue(camelToKebab(property)) : "";
      field.value = inline || (property ? computed[property] || "" : "");
    }
    for (const field of panel.querySelectorAll("[data-attribute]")) {
      const name = field.getAttribute("data-attribute");
      field.value = name ? element.getAttribute(name) || "" : "";
    }
  }

  function camelToKebab(value) {
    return value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
  }

  function isSafeCssValue(value) {
    const lowered = value.toLowerCase();
    return !["javascript:", "vbscript:", "expression(", "@import", "<", ">"].some((item) => lowered.includes(item));
  }

  function isSafeAttribute(name, value) {
    const lowered = value.trim().toLowerCase();
    if (["href", "src"].includes(name) && lowered.startsWith("javascript:")) return false;
    return !lowered.includes("<script") && !lowered.includes("</");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
