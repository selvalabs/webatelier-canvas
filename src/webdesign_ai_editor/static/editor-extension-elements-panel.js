(() => {
  "use strict";
  if (window.__WDA_ELEMENTS_PANEL_ACTIVE__) return;
  window.__WDA_ELEMENTS_PANEL_ACTIVE__ = true;

  const state = { api: null, editor: null, selected: null, template: "text", panel: null, attempts: 0 };

  function boot() {
    const api = window.__WDA_ELEMENTS_API__;
    const editor = window.__WDA_EXTENSION_API__;
    const catalog = window.__WDA_ELEMENT_CATALOG__;
    const shadow = document.getElementById("__wda_editor_host__")?.shadowRoot;
    if (!api || !editor || !Array.isArray(catalog) || !shadow) {
      state.attempts += 1;
      if (state.attempts < 260) window.setTimeout(boot, 25);
      return;
    }
    state.api = api;
    state.editor = editor;
    state.selected = editor.getSelectedElement();
    state.panel = createPanel(shadow, catalog);
    bindPanel(catalog);
    window.addEventListener("wda:selection-changed", (event) => {
      state.selected = event.detail?.element || null;
      refreshDisabled();
    });
    window.addEventListener("wda:insertion-history", refreshHistory);
    selectTemplate("text");
    refreshDisabled();
  }

  function createPanel(shadow, catalog) {
    const existing = shadow.getElementById("__wda_elements_panel__");
    if (existing) return existing;
    const panel = document.createElement("section");
    panel.id = "__wda_elements_panel__";
    panel.className = "wda-elements";
    panel.dataset.wdaTab = "design";
    panel.dataset.wdaRequiresSelection = "true";
    panel.innerHTML = `
      <h3 class="wda-elements__title">Adicionar elementos</h3>
      <p class="wda-elements__intro">Escolha uma estrutura segura e insira em relação ao elemento selecionado.</p>
      <div class="wda-elements__palette">${catalog.map((item) => `<button class="wda-elements__card" type="button" data-template="${item.id}" title="Adicionar ${item.label.toLowerCase()} à página.">${item.label}</button>`).join("")}</div>
      <div class="wda-elements__form">
        <label class="wda-elements__field"><span>Posição</span><select class="wda-elements__select" data-element-position><option value="inside_end">Dentro · final</option><option value="inside_start">Dentro · início</option><option value="before">Antes</option><option value="after">Depois</option></select></label>
        <label class="wda-elements__field"><span>Classe opcional</span><input class="wda-elements__input" data-element-class maxlength="120"></label>
        <label class="wda-elements__field" data-wide="true"><span>Texto principal</span><textarea class="wda-elements__textarea" data-element-text maxlength="5000"></textarea></label>
        <label class="wda-elements__field" data-wide="true"><span>URL da imagem</span><input class="wda-elements__input" data-element-src placeholder="https://..." spellcheck="false"></label>
      </div>
      <div class="wda-elements__actions"><button class="wda-button wda-button-primary" type="button" data-element-action="insert">Adicionar</button><button class="wda-button" type="button" data-element-action="undo">Desfazer inserção</button><button class="wda-button" type="button" data-element-action="redo">Refazer inserção</button><button class="wda-button" type="button" data-element-action="clear">Limpar campos</button></div>
      <div class="wda-elements__status" data-elements-status role="status" aria-live="polite"></div>
    `;
    const selected = shadow.querySelector("#wda-selected");
    selected?.appendChild(panel);
    return panel;
  }

  function bindPanel(catalog) {
    for (const button of state.panel.querySelectorAll("[data-template]")) {
      button.addEventListener("click", () => selectTemplate(button.dataset.template));
    }
    state.panel.querySelector('[data-element-action="insert"]')?.addEventListener("click", () => void insertSelected(catalog));
    state.panel.querySelector('[data-element-action="undo"]')?.addEventListener("click", () => void runHistory("undo"));
    state.panel.querySelector('[data-element-action="redo"]')?.addEventListener("click", () => void runHistory("redo"));
    state.panel.querySelector('[data-element-action="clear"]')?.addEventListener("click", clearFields);
  }

  function selectTemplate(id) {
    state.template = id || "text";
    for (const button of state.panel.querySelectorAll("[data-template]")) button.dataset.active = String(button.dataset.template === state.template);
    const item = window.__WDA_ELEMENT_CATALOG__.find((entry) => entry.id === state.template);
    const text = state.panel.querySelector("[data-element-text]");
    const src = state.panel.querySelector("[data-element-src]");
    if (text) text.value = item?.node?.text || firstText(item?.node) || "";
    if (src) src.value = item?.node?.attributes?.src || "";
  }

  async function insertSelected(catalog) {
    try {
      const item = catalog.find((entry) => entry.id === state.template);
      if (!item) throw new Error("Template não encontrado.");
      const spec = structuredClone(item.node);
      const text = state.panel.querySelector("[data-element-text]")?.value?.trim() || "";
      const src = state.panel.querySelector("[data-element-src]")?.value?.trim() || "";
      const className = state.panel.querySelector("[data-element-class]")?.value?.trim() || "";
      if (text) applyPrimaryText(spec, text);
      if (src && spec.tag === "img") spec.attributes = { ...(spec.attributes || {}), src };
      if (className) spec.attributes = { ...(spec.attributes || {}), class: safeClass(className) };
      const position = state.panel.querySelector("[data-element-position]")?.value || "inside_end";
      await state.api.insert(spec, position, "manual");
      setStatus(`${item.label} adicionado.`, "success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), "error");
    }
  }

  async function runHistory(action) {
    try {
      const changed = await state.api[action]();
      setStatus(changed ? "Histórico de inserção atualizado." : "Nada para alterar.", changed ? "success" : "");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), "error");
    }
  }

  function refreshHistory(event) {
    const undo = state.panel?.querySelector('[data-element-action="undo"]');
    const redo = state.panel?.querySelector('[data-element-action="redo"]');
    if (undo) undo.disabled = !event.detail?.canUndo;
    if (redo) redo.disabled = !event.detail?.canRedo;
  }

  function refreshDisabled() {
    if (!state.panel) return;
    const disabled = !state.selected;
    for (const control of state.panel.querySelectorAll("button, input, select, textarea")) {
      if (!control.matches('[data-element-action="undo"], [data-element-action="redo"]')) control.disabled = disabled;
    }
  }

  function clearFields() {
    const classField = state.panel.querySelector("[data-element-class]");
    if (classField) classField.value = "";
    selectTemplate(state.template);
  }

  function applyPrimaryText(spec, text) {
    if (spec.tag !== "img" && !spec.children?.length) spec.text = text;
    else if (spec.children?.length) spec.children[0].text = text;
  }

  function firstText(spec) {
    if (!spec) return "";
    if (spec.text) return spec.text;
    for (const child of spec.children || []) {
      const value = firstText(child);
      if (value) return value;
    }
    return "";
  }

  function safeClass(value) {
    return value.split(/\s+/).filter((item) => /^[A-Za-z_-][A-Za-z0-9_-]{0,63}$/.test(item)).slice(0, 8).join(" ");
  }

  function setStatus(message, kind = "") {
    const node = state.panel?.querySelector("[data-elements-status]");
    if (node) { node.textContent = message; node.dataset.kind = kind; }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
