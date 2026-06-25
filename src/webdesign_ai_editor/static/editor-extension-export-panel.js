(() => {
  "use strict";
  if (window.__WDA_EXPORT_PANEL_ACTIVE__) return;
  window.__WDA_EXPORT_PANEL_ACTIVE__ = true;

  const HOST_ID = "__wda_editor_host__";
  const state = { panel: null, preview: null, payload: null, attempts: 0 };

  function boot() {
    const shadow = document.getElementById(HOST_ID)?.shadowRoot;
    if (!shadow || typeof window.__wda_export_package !== "function") {
      state.attempts += 1;
      if (state.attempts < 260) window.setTimeout(boot, 25);
      return;
    }
    state.panel = createPanel(shadow);
    state.preview = createPreview(shadow);
    bind();
    exposeApi();
  }

  function createPanel(shadow) {
    const existing = shadow.getElementById("__wda_export_panel__");
    if (existing) return existing;
    const panel = document.createElement("section");
    panel.id = "__wda_export_panel__";
    panel.className = "wda-export";
    panel.dataset.wdaTab = "assets";
    panel.dataset.wdaRequiresSelection = "false";
    panel.innerHTML = `
      <h3 class="wda-export__title">Exportar projeto</h3>
      <p class="wda-export__intro">Gera HTML, CSS, metadata, favicon e relatório em um ZIP local sem alterar os arquivos originais.</p>
      <div class="wda-export__actions">
        <button class="wda-button" type="button" data-export-action="preview" title="Analisa o snapshot atual e mostra arquivos e avisos antes de gravar.">Pré-visualizar</button>
        <button class="wda-button wda-button-primary" type="button" data-export-action="package" title="Confirma o preview e grava um ZIP na pasta local de dados do WebAtelier Canvas.">Gerar ZIP</button>
      </div>
      <div class="wda-export__status" data-export-status role="status" aria-live="polite"></div>
    `;
    const selected = shadow.querySelector("#wda-selected");
    const content = shadow.querySelector(".wda-content");
    (selected || content)?.appendChild(panel);
    return panel;
  }

  function createPreview(shadow) {
    const existing = shadow.getElementById("__wda_export_preview__");
    if (existing) return existing;
    const modal = document.createElement("div");
    modal.id = "__wda_export_preview__";
    modal.className = "wda-export-preview";
    modal.dataset.open = "false";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "__wda_export_preview_title__");
    modal.innerHTML = `
      <article class="wda-export-preview__card">
        <header class="wda-export-preview__head"><div class="wda-export-preview__eyebrow">Exportação local</div><h2 class="wda-export-preview__title" id="__wda_export_preview_title__">Revisar pacote</h2></header>
        <div class="wda-export-preview__body">
          <p class="wda-export-preview__summary" data-export-summary></p>
          <strong>Arquivos</strong><div class="wda-export-preview__files" data-export-files></div>
          <strong data-warning-heading>Avisos</strong><div class="wda-export-preview__warnings" data-export-warnings></div>
        </div>
        <footer class="wda-export-preview__foot"><button class="wda-button" type="button" data-export-decision="close">Voltar</button><button class="wda-button wda-button-primary" type="button" data-export-decision="confirm">Gerar ZIP</button></footer>
      </article>
    `;
    shadow.appendChild(modal);
    return modal;
  }

  function bind() {
    state.panel.querySelector('[data-export-action="preview"]')?.addEventListener("click", () => void showPreview());
    state.panel.querySelector('[data-export-action="package"]')?.addEventListener("click", () => void generatePackage());
    state.preview.querySelector('[data-export-decision="close"]')?.addEventListener("click", closePreview);
    state.preview.querySelector('[data-export-decision="confirm"]')?.addEventListener("click", () => void generatePackage());
    state.preview.addEventListener("pointerdown", (event) => {
      if (event.target === state.preview) closePreview();
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.preview?.dataset.open === "true") closePreview();
    }, true);
  }

  async function showPreview() {
    try {
      state.payload = buildPayload();
      renderPreview(state.payload);
      state.preview.dataset.open = "true";
      state.preview.querySelector('[data-export-decision="confirm"]')?.focus();
      setStatus("Snapshot analisado. Revise antes de exportar.", "success");
    } catch (error) {
      setStatus(messageOf(error), "error");
    }
  }

  async function generatePackage() {
    try {
      const payload = state.payload || buildPayload();
      setBusy(true);
      const result = await window.__wda_export_package(payload);
      if (!result?.ok) throw new Error(result?.error || "Falha ao gerar o pacote.");
      closePreview();
      setStatus(`ZIP gerado em ${result.archive_path}`, "success");
      window.dispatchEvent(new CustomEvent("wda:export-created", { detail: result }));
    } catch (error) {
      setStatus(messageOf(error), "error");
    } finally {
      setBusy(false);
    }
  }

  function buildPayload() {
    const metadata = window.__WDA_PROJECT_METADATA__?.get?.() || fallbackMetadata();
    const snapshot = createSnapshot(metadata);
    const warnings = [...snapshot.warnings];
    let favicon = metadata.favicon || "";
    if (favicon && !favicon.toLowerCase().startsWith("data:image/")) {
      warnings.push("O favicon remoto não foi incorporado; escolha um arquivo local para exportá-lo.");
      favicon = "";
    }
    return {
      export_filename: safeFilename(metadata.exportFilename || "webatelier-export"),
      project_name: String(metadata.projectName || "Untitled project").slice(0, 120),
      page_title: String(metadata.pageTitle || document.title || "").slice(0, 160),
      description: String(metadata.description || "").slice(0, 500),
      source_url: location.href,
      html: snapshot.html,
      css: snapshot.css,
      favicon,
      warnings
    };
  }

  function createSnapshot(metadata) {
    const clone = document.documentElement.cloneNode(true);
    const warnings = [];
    clone.querySelector(`#${HOST_ID}`)?.remove();
    for (const node of clone.querySelectorAll('[data-wda-editor-ui="true"], .moveable-control-box, .wda-moveable')) node.remove();

    const scripts = Array.from(clone.querySelectorAll("script"));
    if (scripts.length) warnings.push(`${scripts.length} script(s) foram removidos do export estático.`);
    for (const script of scripts) script.remove();

    const externalStyles = clone.querySelectorAll('link[rel="stylesheet"][href^="http"]');
    if (externalStyles.length) warnings.push("O HTML ainda referencia estilos externos; acesso à rede pode ser necessário.");

    for (const preview of clone.querySelectorAll('[data-wda-preview-favicon="true"]')) preview.remove();
    const head = clone.querySelector("head") || clone.insertBefore(document.createElement("head"), clone.firstChild);
    const title = head.querySelector("title") || head.appendChild(document.createElement("title"));
    title.textContent = metadata.pageTitle || document.title || metadata.projectName || "WebAtelier export";

    let description = head.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.setAttribute("name", "description");
      head.appendChild(description);
    }
    description.setAttribute("content", metadata.description || "");

    const stylesheet = document.createElement("link");
    stylesheet.setAttribute("rel", "stylesheet");
    stylesheet.setAttribute("href", "styles.css");
    head.appendChild(stylesheet);

    if (metadata.favicon) {
      const icon = document.createElement("link");
      icon.setAttribute("rel", "icon");
      icon.setAttribute("href", "__WDA_FAVICON_PATH__");
      head.appendChild(icon);
    }

    const rules = [];
    let index = 0;
    for (const element of clone.querySelectorAll("[style]")) {
      const cssText = element.getAttribute("style")?.trim();
      if (!cssText) continue;
      index += 1;
      const id = `e${index}`;
      element.setAttribute("data-wda-export-id", id);
      element.removeAttribute("style");
      rules.push(`[data-wda-export-id="${id}"] { ${cssText} }`);
    }

    return {
      html: `<!doctype html>\n${clone.outerHTML}`,
      css: rules.join("\n"),
      warnings
    };
  }

  function renderPreview(payload) {
    const summary = state.preview.querySelector("[data-export-summary]");
    const files = state.preview.querySelector("[data-export-files]");
    const warnings = state.preview.querySelector("[data-export-warnings]");
    const heading = state.preview.querySelector("[data-warning-heading]");
    if (summary) summary.textContent = `${payload.project_name} será gravado como ${payload.export_filename}.zip.`;
    if (files) {
      files.replaceChildren();
      for (const name of ["index.html", "styles.css", "metadata.json", "REPORT.md", ...(payload.favicon ? ["assets/favicon"] : [])]) files.appendChild(item(name));
    }
    if (warnings) {
      warnings.replaceChildren();
      for (const warning of payload.warnings) warnings.appendChild(item(warning));
    }
    if (heading) heading.hidden = payload.warnings.length === 0;
    if (warnings) warnings.hidden = payload.warnings.length === 0;
  }

  function item(text) {
    const node = document.createElement("div");
    node.className = "wda-export-preview__item";
    node.textContent = text;
    return node;
  }

  function fallbackMetadata() {
    return { projectName: document.title || "Untitled project", pageTitle: document.title || "", description: "", exportFilename: "webatelier-export", favicon: "" };
  }

  function safeFilename(value) {
    const normalized = String(value).trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(normalized)) throw new Error("Defina um nome de exportação seguro na aba Assets.");
    return normalized;
  }

  function setBusy(busy) {
    for (const button of state.panel.querySelectorAll("button")) button.disabled = busy;
    for (const button of state.preview.querySelectorAll("button")) button.disabled = busy;
  }

  function setStatus(message, kind = "") {
    const node = state.panel?.querySelector("[data-export-status]");
    if (node) { node.textContent = message; node.dataset.kind = kind; }
  }

  function closePreview() { if (state.preview) state.preview.dataset.open = "false"; }
  function messageOf(error) { return error instanceof Error ? error.message : String(error); }
  function exposeApi() { window.__WDA_EXPORT_API__ = { buildPayload, preview: showPreview, export: generatePackage }; }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
