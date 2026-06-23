(() => {
  "use strict";
  if (window.__WDA_ASSETS_ACTIVE__) return;
  window.__WDA_ASSETS_ACTIVE__ = true;

  const HOST_ID = "__wda_editor_host__";
  const MAX_FAVICON_BYTES = 512 * 1024;
  const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"]);
  const state = {
    shadow: null,
    panel: null,
    sessionId: "default",
    attempts: 0,
    metadata: defaults()
  };

  function defaults() {
    return {
      projectName: "Untitled project",
      pageTitle: "",
      description: "",
      exportFilename: "webatelier-export",
      favicon: ""
    };
  }

  async function boot() {
    const shadow = document.getElementById(HOST_ID)?.shadowRoot;
    if (!shadow) {
      state.attempts += 1;
      if (state.attempts < 240) window.setTimeout(boot, 25);
      return;
    }
    state.shadow = shadow;
    state.sessionId = await resolveSessionId();
    state.metadata = loadMetadata();
    state.panel = createPanel(shadow);
    bindPanel(state.panel);
    syncForm();
    applyPreview();
    exposeApi();
  }

  async function resolveSessionId() {
    if (typeof window.__wda_session_state !== "function") return "default";
    try {
      const payload = await window.__wda_session_state();
      return payload?.session_id || "default";
    } catch {
      return "default";
    }
  }

  function createPanel(shadow) {
    const existing = shadow.getElementById("__wda_assets_panel__");
    if (existing) return existing;
    const panel = document.createElement("section");
    panel.id = "__wda_assets_panel__";
    panel.className = "wda-assets";
    panel.dataset.wdaTab = "assets";
    panel.dataset.wdaRequiresSelection = "false";
    panel.innerHTML = `
      <h3 class="wda-assets__title">Identidade do projeto</h3>
      <p class="wda-assets__intro">Nomeie o trabalho, prepare os metadados e escolha o nome seguro do pacote exportado.</p>
      <div class="wda-assets__grid">
        <label class="wda-assets__field" data-wide="true"><span>Nome do projeto</span><input class="wda-assets__input" data-meta="projectName" maxlength="120"></label>
        <label class="wda-assets__field" data-wide="true"><span>Título da página</span><input class="wda-assets__input" data-meta="pageTitle" maxlength="160"></label>
        <label class="wda-assets__field" data-wide="true"><span>Descrição</span><textarea class="wda-assets__textarea" data-meta="description" maxlength="500"></textarea></label>
        <label class="wda-assets__field" data-wide="true"><span>Nome do arquivo exportado</span><input class="wda-assets__input" data-meta="exportFilename" maxlength="120" spellcheck="false"></label>
        <label class="wda-assets__field" data-wide="true"><span>Favicon URL</span><input class="wda-assets__input" data-meta="favicon" placeholder="https://... ou arquivo local" spellcheck="false"></label>
        <div class="wda-assets__field" data-wide="true"><span>Preview do favicon</span><div class="wda-assets__preview"><img data-favicon-preview alt="Preview do favicon"><span data-favicon-label>Nenhum favicon definido.</span></div></div>
      </div>
      <div class="wda-assets__actions">
        <button class="wda-button" type="button" data-assets-action="file" title="Seleciona um favicon local PNG, JPEG, WebP ou ICO. O arquivo permanece no navegador local.">Escolher favicon</button>
        <button class="wda-button" type="button" data-assets-action="reset" title="Restaura os metadados padrão desta sessão.">Restaurar</button>
        <input class="wda-assets__file" type="file" accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon" data-favicon-file>
      </div>
      <div class="wda-assets__status" data-assets-status role="status" aria-live="polite"></div>
    `;
    const selected = shadow.querySelector("#wda-selected");
    const content = shadow.querySelector(".wda-content");
    (selected || content)?.appendChild(panel);
    return panel;
  }

  function bindPanel(panel) {
    for (const field of panel.querySelectorAll("[data-meta]")) {
      field.addEventListener("change", () => updateField(field.dataset.meta, field.value));
    }
    panel.querySelector('[data-assets-action="file"]')?.addEventListener("click", () => panel.querySelector("[data-favicon-file]")?.click());
    panel.querySelector('[data-assets-action="reset"]')?.addEventListener("click", resetMetadata);
    panel.querySelector("[data-favicon-file]")?.addEventListener("change", onFaviconFile);
  }

  function updateField(name, value) {
    const next = { ...state.metadata, [name]: value.trim() };
    const error = validate(next);
    if (error) {
      setStatus(error, "error");
      syncForm();
      return;
    }
    state.metadata = next;
    persist();
    applyPreview();
    setStatus("Metadados salvos localmente.", "success");
  }

  async function onFaviconFile(event) {
    const file = event.target?.files?.[0];
    if (!file) return;
    try {
      if (!allowedTypes.has(file.type)) throw new Error("Formato de favicon não permitido.");
      if (file.size > MAX_FAVICON_BYTES) throw new Error("O favicon deve ter no máximo 512 KB.");
      const dataUrl = await readDataUrl(file);
      state.metadata = { ...state.metadata, favicon: dataUrl };
      persist();
      syncForm();
      applyPreview();
      setStatus("Favicon local carregado.", "success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), "error");
    } finally {
      event.target.value = "";
    }
  }

  function resetMetadata() {
    state.metadata = defaults();
    persist();
    syncForm();
    applyPreview();
    setStatus("Metadados restaurados.", "success");
  }

  function validate(value) {
    if (!value.projectName || value.projectName.length > 120) return "Nome do projeto inválido.";
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(value.exportFilename)) return "Nome de exportação: use letras, números, ponto, hífen ou underscore.";
    if (value.favicon && !safeFavicon(value.favicon)) return "Favicon deve usar http(s) ou imagem local permitida.";
    return "";
  }

  function safeFavicon(value) {
    if (/^data:image\/(png|jpeg|webp|x-icon|vnd\.microsoft\.icon);base64,/i.test(value)) return value.length <= 700000;
    try {
      const url = new URL(value, location.href);
      return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
    } catch {
      return false;
    }
  }

  function syncForm() {
    if (!state.panel) return;
    for (const field of state.panel.querySelectorAll("[data-meta]")) field.value = state.metadata[field.dataset.meta] || "";
    const image = state.panel.querySelector("[data-favicon-preview]");
    const label = state.panel.querySelector("[data-favicon-label]");
    if (image) {
      image.hidden = !state.metadata.favicon;
      image.src = state.metadata.favicon || "";
    }
    if (label) label.textContent = state.metadata.favicon ? "Favicon pronto para preview/exportação." : "Nenhum favicon definido.";
  }

  function applyPreview() {
    if (state.metadata.pageTitle) document.title = state.metadata.pageTitle;
    let link = document.head.querySelector('link[data-wda-preview-favicon="true"]');
    if (!state.metadata.favicon) {
      link?.remove();
      return;
    }
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.dataset.wdaPreviewFavicon = "true";
      document.head.appendChild(link);
    }
    link.href = state.metadata.favicon;
  }

  function loadMetadata() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey()) || "null");
      const candidate = { ...defaults(), ...(stored || {}) };
      return validate(candidate) ? defaults() : candidate;
    } catch {
      return defaults();
    }
  }

  function persist() {
    localStorage.setItem(storageKey(), JSON.stringify(state.metadata));
    window.dispatchEvent(new CustomEvent("wda:project-metadata-changed", { detail: state.metadata }));
  }

  function storageKey() { return `wda-project-metadata:${state.sessionId}`; }
  function setStatus(message, kind = "") { const node = state.panel?.querySelector("[data-assets-status]"); if (node) { node.textContent = message; node.dataset.kind = kind; } }
  function readDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "")); reader.onerror = () => reject(reader.error || new Error("Falha ao ler arquivo.")); reader.readAsDataURL(file); }); }

  function exposeApi() {
    window.__WDA_PROJECT_METADATA__ = {
      get: () => structuredClone(state.metadata),
      save: (value) => {
        const candidate = { ...state.metadata, ...value };
        const error = validate(candidate);
        if (error) throw new Error(error);
        state.metadata = candidate;
        persist();
        syncForm();
        applyPreview();
        return structuredClone(state.metadata);
      },
      sessionId: () => state.sessionId
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => void boot(), { once: true });
  else void boot();
})();
