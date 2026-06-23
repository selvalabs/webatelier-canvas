(() => {
  "use strict";
  if (window.__WDA_JS_HUB_PANEL_ACTIVE__) return;
  window.__WDA_JS_HUB_PANEL_ACTIVE__ = true;

  const state = {
    editor: null,
    elements: null,
    registry: [],
    selected: null,
    toolId: "accordion",
    panel: null,
    preview: null,
    pendingSpec: null,
    attempts: 0
  };

  function boot() {
    const editor = window.__WDA_EXTENSION_API__;
    const elements = window.__WDA_ELEMENTS_API__;
    const registry = window.__WDA_JS_TOOL_REGISTRY__;
    const shadow = document.getElementById("__wda_editor_host__")?.shadowRoot;
    if (!editor || !elements || !Array.isArray(registry) || !shadow) {
      state.attempts += 1;
      if (state.attempts < 280) window.setTimeout(boot, 25);
      return;
    }

    state.editor = editor;
    state.elements = elements;
    state.registry = registry;
    state.selected = editor.getSelectedElement();
    state.panel = createPanel(shadow);
    state.preview = createPreview(shadow);
    bindPanel();
    window.addEventListener("wda:selection-changed", (event) => {
      state.selected = event.detail?.element || null;
      refreshDisabled();
    });
    selectTool(state.toolId);
    refreshDisabled();
    exposeApi();
  }

  function createPanel(shadow) {
    const existing = shadow.getElementById("__wda_js_hub_panel__");
    if (existing) return existing;
    const panel = document.createElement("section");
    panel.id = "__wda_js_hub_panel__";
    panel.className = "wda-js-hub";
    panel.dataset.wdaTab = "js";
    panel.dataset.wdaRequiresSelection = "true";
    panel.innerHTML = `
      <h3 class="wda-js-hub__title">JS Hub seguro</h3>
      <p class="wda-js-hub__intro">Ferramentas internas geram estruturas editáveis e comportamentos revisados. Não há execução de código arbitrário.</p>
      <div class="wda-js-hub__grid">${state.registry.map((tool) => `<button class="wda-js-hub__tool" type="button" data-js-tool="${escapeAttribute(tool.id)}" title="${escapeAttribute(tool.description)}"><strong>${escapeText(tool.label)}</strong><span>${escapeText(tool.description)}</span></button>`).join("")}</div>
      <div class="wda-js-hub__form" data-js-fields></div>
      <label class="wda-js-hub__field"><span>Posição</span><select class="wda-js-hub__select" data-js-position><option value="inside_end">Dentro · final</option><option value="inside_start">Dentro · início</option><option value="before">Antes</option><option value="after">Depois</option></select></label>
      <div class="wda-js-hub__actions"><button class="wda-button" type="button" data-js-action="preview">Pré-visualizar</button><button class="wda-button wda-button-primary" type="button" data-js-action="insert">Inserir ferramenta</button></div>
      <div class="wda-js-hub__status" data-js-status role="status" aria-live="polite"></div>
    `;
    const selected = shadow.querySelector("#wda-selected");
    const content = shadow.querySelector(".wda-content");
    (selected || content)?.appendChild(panel);
    return panel;
  }

  function createPreview(shadow) {
    const existing = shadow.getElementById("__wda_js_preview__");
    if (existing) return existing;
    const modal = document.createElement("div");
    modal.id = "__wda_js_preview__";
    modal.className = "wda-js-preview";
    modal.dataset.open = "false";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "__wda_js_preview_title__");
    modal.innerHTML = `
      <article class="wda-js-preview__card">
        <header class="wda-js-preview__head"><h2 class="wda-js-preview__title" id="__wda_js_preview_title__">Pré-visualizar ferramenta</h2></header>
        <div class="wda-js-preview__body"><p class="wda-js-preview__description" data-js-preview-description></p><div class="wda-js-preview__canvas" data-js-preview-canvas></div></div>
        <footer class="wda-js-preview__foot"><button class="wda-button" type="button" data-js-decision="close">Voltar</button><button class="wda-button wda-button-primary" type="button" data-js-decision="insert">Inserir</button></footer>
      </article>
    `;
    shadow.appendChild(modal);
    return modal;
  }

  function bindPanel() {
    for (const button of state.panel.querySelectorAll("[data-js-tool]")) {
      button.addEventListener("click", () => selectTool(button.dataset.jsTool));
    }
    state.panel.querySelector('[data-js-action="preview"]')?.addEventListener("click", showPreview);
    state.panel.querySelector('[data-js-action="insert"]')?.addEventListener("click", () => void insertTool());
    state.preview.querySelector('[data-js-decision="close"]')?.addEventListener("click", closePreview);
    state.preview.querySelector('[data-js-decision="insert"]')?.addEventListener("click", () => void insertTool());
    state.preview.addEventListener("pointerdown", (event) => {
      if (event.target === state.preview) closePreview();
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.preview?.dataset.open === "true") closePreview();
    }, true);
  }

  function selectTool(id) {
    const tool = state.registry.find((item) => item.id === id) || state.registry[0];
    if (!tool) return;
    state.toolId = tool.id;
    for (const button of state.panel.querySelectorAll("[data-js-tool]")) button.dataset.active = String(button.dataset.jsTool === tool.id);
    const fields = state.panel.querySelector("[data-js-fields]");
    if (!fields) return;
    fields.replaceChildren();
    for (const definition of tool.fields || []) {
      const label = document.createElement("label");
      label.className = "wda-js-hub__field";
      const caption = document.createElement("span");
      caption.textContent = definition.label;
      const input = document.createElement("input");
      input.className = "wda-js-hub__input";
      input.type = "text";
      input.dataset.jsField = definition.id;
      input.maxLength = definition.maxLength || 120;
      input.value = definition.value || "";
      label.append(caption, input);
      fields.appendChild(label);
    }
    setStatus(`${tool.label} selecionado.`);
  }

  function valuesFor(tool) {
    const values = {};
    for (const definition of tool.fields || []) {
      const input = state.panel.querySelector(`[data-js-field="${definition.id}"]`);
      values[definition.id] = String(input?.value || definition.value || "").trim().slice(0, definition.maxLength || 120);
    }
    return values;
  }

  function buildCurrentSpec() {
    const tool = state.registry.find((item) => item.id === state.toolId);
    if (!tool) throw new Error("Ferramenta não encontrada.");
    const raw = tool.build(valuesFor(tool));
    return { tool, spec: state.elements.normalize(raw) };
  }

  function showPreview() {
    try {
      const current = buildCurrentSpec();
      state.pendingSpec = current.spec;
      const title = state.preview.querySelector(".wda-js-preview__title");
      const description = state.preview.querySelector("[data-js-preview-description]");
      const canvas = state.preview.querySelector("[data-js-preview-canvas]");
      if (title) title.textContent = current.tool.label;
      if (description) description.textContent = current.tool.description;
      if (canvas) {
        canvas.replaceChildren();
        canvas.appendChild(renderPreviewNode(current.spec));
      }
      state.preview.dataset.open = "true";
      state.preview.querySelector('[data-js-decision="insert"]')?.focus();
      setStatus("Preview pronto. Confirme para inserir.", "success");
    } catch (error) {
      setStatus(messageOf(error), "error");
    }
  }

  async function insertTool() {
    try {
      if (!state.selected) throw new Error("Selecione um elemento de referência.");
      const spec = state.pendingSpec || buildCurrentSpec().spec;
      const position = state.panel.querySelector("[data-js-position]")?.value || "inside_end";
      setBusy(true);
      const element = await state.elements.insert(spec, position, "manual");
      element.classList.add("wda-tool-runtime");
      window.__WDA_JS_HUB_BEHAVIOR__?.refresh?.();
      closePreview();
      state.pendingSpec = null;
      setStatus("Ferramenta inserida e registrada na timeline.", "success");
    } catch (error) {
      setStatus(messageOf(error), "error");
    } finally {
      setBusy(false);
    }
  }

  function renderPreviewNode(spec) {
    const node = document.createElement(spec.tag);
    for (const [name, value] of Object.entries(spec.attributes || {})) {
      if (name === "class") node.className = value;
      else node.setAttribute(name, value);
    }
    for (const [property, value] of Object.entries(spec.styles || {})) node.style.setProperty(camelToKebab(property), value);
    if (spec.text && spec.tag !== "img") node.textContent = spec.text;
    for (const child of spec.children || []) node.appendChild(renderPreviewNode(child));
    return node;
  }

  function refreshDisabled() {
    if (!state.panel) return;
    for (const control of state.panel.querySelectorAll("button, input, select")) control.disabled = !state.selected;
  }

  function setBusy(busy) {
    for (const button of state.panel.querySelectorAll("button")) button.disabled = busy || !state.selected;
    for (const button of state.preview.querySelectorAll("button")) button.disabled = busy;
  }

  function setStatus(message, kind = "") {
    const node = state.panel?.querySelector("[data-js-status]");
    if (node) { node.textContent = message; node.dataset.kind = kind; }
  }

  function closePreview() { if (state.preview) state.preview.dataset.open = "false"; }
  function messageOf(error) { return error instanceof Error ? error.message : String(error); }
  function camelToKebab(value) { return value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`); }
  function escapeText(value) { const node = document.createElement("span"); node.textContent = String(value); return node.innerHTML; }
  function escapeAttribute(value) { return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;"); }
  function exposeApi() { window.__WDA_JS_HUB_API__ = { selectTool, preview: showPreview, insert: insertTool, registry: () => [...state.registry] }; }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
