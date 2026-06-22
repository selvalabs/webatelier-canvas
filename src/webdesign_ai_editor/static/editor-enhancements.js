(() => {
  "use strict";

  const HOST_ID = "__wda_editor_host__";
  const EXTENSION_STYLE_ID = "__wda_extension_styles__";
  const INSPECTOR_ID = "__wda_selection_inspector__";
  const ACTIVE_FLAG = "__WDA_ENHANCEMENTS_ACTIVE__";
  const API_KEY = "__WDA_EXTENSION_API__";
  const BRIDGE_FLAG = "__wda_extension_wrapped__";
  const MAX_BOOT_ATTEMPTS = 200;

  const editorWindow = window;
  if (editorWindow[ACTIVE_FLAG]) {
    return;
  }
  editorWindow[ACTIVE_FLAG] = true;

  const state = {
    host: null,
    shadow: null,
    selected: null,
    selector: "",
    lastCandidate: null,
    bootAttempts: 0,
    bridgeTimer: 0,
    syncFrame: 0
  };

  function boot() {
    const host = document.getElementById(HOST_ID);
    const shadow = host && host.shadowRoot;
    if (!host || !shadow) {
      state.bootAttempts += 1;
      if (state.bootAttempts < MAX_BOOT_ATTEMPTS) {
        window.setTimeout(boot, 25);
      }
      return;
    }

    state.host = host;
    state.shadow = shadow;
    installStyles(shadow);
    installInspector(shadow);
    installSelectionTracking(shadow);
    installBridgeRewriter();
    exposeApi();
    scheduleSync();
  }

  function installStyles(shadow) {
    if (shadow.getElementById(EXTENSION_STYLE_ID)) {
      return;
    }
    const style = document.createElement("style");
    style.id = EXTENSION_STYLE_ID;
    style.textContent = `
      .wda-inspector-v2 {
        margin: 10px 0 0;
        padding: 10px;
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 10px;
        background: rgba(15, 23, 42, 0.46);
      }
      .wda-inspector-v2__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }
      .wda-inspector-v2__title {
        color: #e2e8f0;
        font: 700 11px/1.2 ui-sans-serif, system-ui, sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .wda-inspector-v2__health {
        padding: 2px 6px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.16);
        color: #cbd5e1;
        font: 700 9px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }
      .wda-inspector-v2__health[data-health="unique"] {
        background: rgba(16, 185, 129, 0.16);
        color: #6ee7b7;
      }
      .wda-inspector-v2__health[data-health="ambiguous"],
      .wda-inspector-v2__health[data-health="missing"] {
        background: rgba(245, 158, 11, 0.18);
        color: #fcd34d;
      }
      .wda-inspector-v2__grid {
        display: grid;
        grid-template-columns: minmax(70px, auto) minmax(0, 1fr);
        gap: 5px 8px;
        margin: 0;
      }
      .wda-inspector-v2__grid dt {
        color: #94a3b8;
        font: 600 10px/1.35 ui-sans-serif, system-ui, sans-serif;
      }
      .wda-inspector-v2__grid dd {
        min-width: 0;
        margin: 0;
        overflow: hidden;
        color: #e2e8f0;
        font: 500 10px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .wda-inspector-v2__selector {
        display: block;
        width: 100%;
        margin-top: 8px;
        padding: 7px 8px;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 7px;
        background: rgba(2, 6, 23, 0.56);
        color: #bfdbfe;
        font: 500 10px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        overflow-wrap: anywhere;
        white-space: normal;
      }
      .wda-inspector-v2__actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        margin-top: 8px;
      }
      .wda-inspector-v2__button {
        min-height: 30px;
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 7px;
        background: rgba(30, 41, 59, 0.72);
        color: #e2e8f0;
        cursor: pointer;
        font: 700 10px/1 ui-sans-serif, system-ui, sans-serif;
      }
      .wda-inspector-v2__button:hover {
        border-color: rgba(96, 165, 250, 0.7);
        background: rgba(30, 64, 175, 0.28);
      }
      .wda-inspector-v2__button:focus-visible {
        outline: 2px solid #60a5fa;
        outline-offset: 2px;
      }
      .wda-inspector-v2__button:disabled {
        cursor: not-allowed;
        opacity: 0.45;
      }
    `;
    shadow.appendChild(style);
  }

  function installInspector(shadow) {
    if (shadow.getElementById(INSPECTOR_ID)) {
      return;
    }

    const selectorLabel = shadow.querySelector("#wda-selector");
    if (!selectorLabel) {
      return;
    }

    const inspector = document.createElement("section");
    inspector.id = INSPECTOR_ID;
    inspector.className = "wda-inspector-v2";
    inspector.setAttribute("aria-label", "Inspector do elemento selecionado");
    inspector.innerHTML = `
      <div class="wda-inspector-v2__header">
        <span class="wda-inspector-v2__title">Inspector</span>
        <span class="wda-inspector-v2__health" data-health="missing">sem seleção</span>
      </div>
      <dl class="wda-inspector-v2__grid">
        <dt>Tag</dt><dd data-field="tag">—</dd>
        <dt>ID</dt><dd data-field="id">—</dd>
        <dt>Classes</dt><dd data-field="classes">—</dd>
        <dt>Dimensão</dt><dd data-field="size">—</dd>
        <dt>Posição</dt><dd data-field="position">—</dd>
        <dt>Display</dt><dd data-field="display">—</dd>
        <dt>Semântica</dt><dd data-field="semantics">—</dd>
      </dl>
      <code class="wda-inspector-v2__selector" data-field="selector">—</code>
      <div class="wda-inspector-v2__actions">
        <button class="wda-inspector-v2__button" type="button" data-action="copy-selector">Copiar seletor</button>
        <button class="wda-inspector-v2__button" type="button" data-action="select-parent">Selecionar pai</button>
      </div>
    `;

    selectorLabel.insertAdjacentElement("afterend", inspector);
    inspector.querySelector('[data-action="copy-selector"]')?.addEventListener("click", () => {
      void copySelector();
    });
    inspector.querySelector('[data-action="select-parent"]')?.addEventListener("click", selectParent);
  }

  function installSelectionTracking(shadow) {
    window.addEventListener(
      "pointerdown",
      (event) => {
        if (isEditorUiEvent(event)) {
          return;
        }
        state.lastCandidate = firstEditableFromPath(event.composedPath());
        scheduleSync();
      },
      true
    );

    window.addEventListener("resize", scheduleSync, { passive: true });
    window.addEventListener("scroll", scheduleSync, { passive: true, capture: true });

    const selectorLabel = shadow.querySelector("#wda-selector");
    if (selectorLabel) {
      const observer = new MutationObserver(scheduleSync);
      observer.observe(selectorLabel, { childList: true, characterData: true, subtree: true });
    }

    const selectedPanel = shadow.querySelector("#wda-selected");
    if (selectedPanel) {
      const observer = new MutationObserver(scheduleSync);
      observer.observe(selectedPanel, { attributes: true, attributeFilter: ["data-active"] });
    }

    const documentObserver = new MutationObserver(() => {
      if (state.selected && !state.selected.isConnected) {
        state.selected = null;
        state.selector = "";
        scheduleSync();
      }
    });
    documentObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  function scheduleSync() {
    if (state.syncFrame) {
      cancelAnimationFrame(state.syncFrame);
    }
    state.syncFrame = requestAnimationFrame(() => {
      state.syncFrame = 0;
      syncSelection();
    });
  }

  function syncSelection() {
    const shadow = state.shadow;
    if (!shadow) {
      return;
    }

    const selectedPanel = shadow.querySelector("#wda-selected");
    const active = selectedPanel?.getAttribute("data-active") === "true";
    const coreSelector = shadow.querySelector("#wda-selector")?.textContent?.trim() || "";
    const resolved = active ? safeQuerySelector(coreSelector) : null;
    const candidate = isEditableElement(resolved)
      ? resolved
      : active && isEditableElement(state.lastCandidate) && state.lastCandidate.isConnected
        ? state.lastCandidate
        : null;

    state.selected = candidate;
    state.selector = candidate ? createStableSelector(candidate) : "";
    renderInspector();

    window.dispatchEvent(
      new CustomEvent("wda:selection-changed", {
        detail: {
          element: state.selected,
          selector: state.selector
        }
      })
    );
  }

  function renderInspector() {
    const shadow = state.shadow;
    if (!shadow) {
      return;
    }
    const inspector = shadow.getElementById(INSPECTOR_ID);
    if (!inspector) {
      return;
    }

    const element = state.selected;
    const health = inspector.querySelector(".wda-inspector-v2__health");
    const parentButton = inspector.querySelector('[data-action="select-parent"]');
    const copyButton = inspector.querySelector('[data-action="copy-selector"]');

    if (!element) {
      setInspectorField(inspector, "tag", "—");
      setInspectorField(inspector, "id", "—");
      setInspectorField(inspector, "classes", "—");
      setInspectorField(inspector, "size", "—");
      setInspectorField(inspector, "position", "—");
      setInspectorField(inspector, "display", "—");
      setInspectorField(inspector, "semantics", "—");
      setInspectorField(inspector, "selector", "—");
      if (health) {
        health.textContent = "sem seleção";
        health.setAttribute("data-health", "missing");
      }
      if (parentButton instanceof HTMLButtonElement) {
        parentButton.disabled = true;
      }
      if (copyButton instanceof HTMLButtonElement) {
        copyButton.disabled = true;
      }
      return;
    }

    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const selectorMatches = safeQuerySelectorAll(state.selector);
    const unique = selectorMatches.length === 1 && selectorMatches[0] === element;
    const semantics = semanticDescription(element);

    setInspectorField(inspector, "tag", element.tagName.toLowerCase());
    setInspectorField(inspector, "id", element.id || "—");
    setInspectorField(
      inspector,
      "classes",
      Array.from(element.classList).slice(0, 6).join(" ") || "—"
    );
    setInspectorField(inspector, "size", `${Math.round(rect.width)} × ${Math.round(rect.height)} px`);
    setInspectorField(inspector, "position", `${Math.round(rect.left)}, ${Math.round(rect.top)} px`);
    setInspectorField(inspector, "display", `${style.display} / ${style.position}`);
    setInspectorField(inspector, "semantics", semantics);
    setInspectorField(inspector, "selector", state.selector || "—");

    if (health) {
      health.textContent = unique ? "único" : "ambíguo";
      health.setAttribute("data-health", unique ? "unique" : "ambiguous");
    }
    if (parentButton instanceof HTMLButtonElement) {
      parentButton.disabled = !isEditableElement(element.parentElement);
    }
    if (copyButton instanceof HTMLButtonElement) {
      copyButton.disabled = !state.selector;
    }
  }

  function setInspectorField(inspector, name, value) {
    const field = inspector.querySelector(`[data-field="${name}"]`);
    if (field) {
      field.textContent = value;
      field.setAttribute("title", value);
    }
  }

  function semanticDescription(element) {
    const role = element.getAttribute("role") || implicitRole(element);
    const label = element.getAttribute("aria-label") || element.getAttribute("alt") || "";
    return [role, label].filter(Boolean).join(" · ") || "—";
  }

  function implicitRole(element) {
    const tag = element.tagName.toLowerCase();
    if (tag === "button") return "button";
    if (tag === "a" && element.hasAttribute("href")) return "link";
    if (/^h[1-6]$/.test(tag)) return "heading";
    if (tag === "img") return "img";
    if (tag === "nav") return "navigation";
    if (tag === "main") return "main";
    if (tag === "header") return "banner";
    if (tag === "footer") return "contentinfo";
    return "";
  }

  async function copySelector() {
    if (!state.selector) {
      return;
    }
    try {
      await navigator.clipboard.writeText(state.selector);
      setCoreStatus("Seletor copiado.", "success");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = state.selector;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      setCoreStatus("Seletor copiado.", "success");
    }
  }

  function selectParent() {
    const parent = state.selected?.parentElement;
    if (!isEditableElement(parent)) {
      return;
    }
    parent.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 1,
        pointerType: "mouse"
      })
    );
    scheduleSync();
  }

  function setCoreStatus(message, kind = "") {
    const status = state.shadow?.querySelector("#wda-status");
    if (status) {
      status.textContent = message;
      status.setAttribute("data-kind", kind);
    }
  }

  function installBridgeRewriter() {
    const wrap = () => {
      let completed = true;
      const emit = editorWindow.__wda_emit;
      if (typeof emit === "function" && !emit[BRIDGE_FLAG]) {
        const wrapped = async (message) => {
          const selector = selectorForCurrentTarget(message?.patch?.selector);
          if (selector && message?.patch) {
            message = {
              ...message,
              patch: { ...message.patch, selector }
            };
          }
          return emit(message);
        };
        wrapped[BRIDGE_FLAG] = true;
        editorWindow.__wda_emit = wrapped;
      } else if (typeof emit !== "function") {
        completed = false;
      }

      const aiEdit = editorWindow.__wda_ai_edit;
      if (typeof aiEdit === "function" && !aiEdit[BRIDGE_FLAG]) {
        const wrappedAi = async (request) => {
          const selector = selectorForCurrentTarget(request?.context?.selector);
          if (selector && request?.context) {
            request = {
              ...request,
              context: { ...request.context, selector }
            };
          }
          return aiEdit(request);
        };
        wrappedAi[BRIDGE_FLAG] = true;
        editorWindow.__wda_ai_edit = wrappedAi;
      } else if (typeof aiEdit !== "function") {
        completed = false;
      }

      if (!completed) {
        state.bridgeTimer = window.setTimeout(wrap, 50);
      }
    };
    wrap();
  }

  function selectorForCurrentTarget(originalSelector) {
    const element = state.selected;
    if (!element || !state.selector) {
      return originalSelector || "";
    }
    const originalTarget = safeQuerySelector(originalSelector || "");
    if (originalTarget === element || !originalTarget) {
      return state.selector;
    }
    return originalSelector || state.selector;
  }

  function exposeApi() {
    editorWindow[API_KEY] = {
      version: "0.2.0",
      getSelectedElement: () => state.selected,
      getSelector: () => state.selector,
      refreshSelection: () => scheduleSync(),
      createStableSelector,
      setStatus: setCoreStatus,
      emitPatch: async (patch) => {
        if (typeof editorWindow.__wda_emit !== "function") {
          return { ok: false, error: "Python bridge unavailable" };
        }
        return editorWindow.__wda_emit({ type: "patch", patch });
      }
    };
  }

  function firstEditableFromPath(path) {
    for (const node of path) {
      if (!isEditableElement(node)) {
        continue;
      }
      if (isForbiddenElement(node) || !isVisible(node)) {
        continue;
      }
      return node;
    }
    return null;
  }

  function isEditableElement(value) {
    return value instanceof HTMLElement || value instanceof SVGElement;
  }

  function isEditorUiEvent(event) {
    return event.composedPath().some((node) => {
      if (!(node instanceof Element)) {
        return false;
      }
      return Boolean(
        node.closest?.(`#${HOST_ID}, [data-wda-editor-ui="true"], .moveable-control-box, .wda-moveable`)
      );
    });
  }

  function isForbiddenElement(element) {
    const tag = element.tagName.toLowerCase();
    return ["html", "head", "script", "style", "meta", "link", "noscript"].includes(tag)
      || element.id === HOST_ID
      || element.hasAttribute("data-wda-editor-ui")
      || Boolean(element.closest(`#${HOST_ID}, .moveable-control-box, .wda-moveable`));
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      return false;
    }
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
  }

  function createStableSelector(element) {
    if (element.hasAttribute("data-wda-id")) {
      const value = element.getAttribute("data-wda-id");
      const candidate = `[data-wda-id="${escapeCssString(value || "")}"]`;
      if (isUniqueSelector(candidate, element)) return candidate;
    }

    if (element.id) {
      const candidate = `#${escapeCss(element.id)}`;
      if (isUniqueSelector(candidate, element)) return candidate;
    }

    for (const attribute of ["data-testid", "data-test", "data-cy", "name"]) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const candidate = `${element.tagName.toLowerCase()}[${attribute}="${escapeCssString(value)}"]`;
      if (isUniqueSelector(candidate, element)) return candidate;
    }

    const ownSegment = selectorSegment(element, false);
    if (isUniqueSelector(ownSegment, element)) {
      return ownSegment;
    }

    const segments = [];
    let current = element;
    while (current && current !== document.documentElement) {
      segments.unshift(selectorSegment(current, true));
      const candidate = segments.join(" > ");
      if (isUniqueSelector(candidate, element)) {
        return candidate;
      }
      if (current.parentElement?.id) {
        const rooted = `#${escapeCss(current.parentElement.id)} > ${candidate}`;
        if (isUniqueSelector(rooted, element)) {
          return rooted;
        }
      }
      current = current.parentElement;
    }

    return segments.join(" > ") || element.tagName.toLowerCase();
  }

  function selectorSegment(element, includeNth) {
    const tag = element.tagName.toLowerCase();
    if (element.id) {
      return `#${escapeCss(element.id)}`;
    }

    const classes = Array.from(element.classList)
      .filter(isStableClassName)
      .slice(0, 4)
      .map((value) => `.${escapeCss(value)}`)
      .join("");
    let segment = `${tag}${classes}`;

    if (includeNth && element.parentElement) {
      const peers = Array.from(element.parentElement.children).filter(
        (sibling) => sibling.tagName === element.tagName
      );
      if (peers.length > 1) {
        segment += `:nth-of-type(${peers.indexOf(element) + 1})`;
      }
    }
    return segment;
  }

  function isStableClassName(value) {
    if (!value || value.length > 80 || value.startsWith("moveable-") || value.startsWith("wda-")) {
      return false;
    }
    const compact = value.replace(/[-_:]/g, "");
    if (/^[a-f0-9]{10,}$/i.test(compact)) {
      return false;
    }
    if (/^(css|sc|jsx|emotion)-?[a-z0-9]{6,}$/i.test(value)) {
      return false;
    }
    return true;
  }

  function isUniqueSelector(selector, element) {
    const matches = safeQuerySelectorAll(selector);
    return matches.length === 1 && matches[0] === element;
  }

  function safeQuerySelector(selector) {
    if (!selector) return null;
    try {
      return document.querySelector(selector);
    } catch {
      return null;
    }
  }

  function safeQuerySelectorAll(selector) {
    if (!selector) return [];
    try {
      return Array.from(document.querySelectorAll(selector));
    } catch {
      return [];
    }
  }

  function escapeCss(value) {
    if (globalThis.CSS?.escape) {
      return globalThis.CSS.escape(value);
    }
    return value.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
  }

  function escapeCssString(value) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
