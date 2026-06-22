(() => {
  "use strict";

  const FLAG = "__WDA_TRANSFORM_EXTENSION_ACTIVE__";
  const PANEL_ID = "__wda_transform_precision__";
  const editorWindow = window;
  if (editorWindow[FLAG]) return;
  editorWindow[FLAG] = true;

  const state = {
    api: null,
    selected: null,
    step: 1,
    keepRatio: true,
    attempts: 0
  };

  function boot() {
    const api = editorWindow.__WDA_EXTENSION_API__;
    const host = document.getElementById("__wda_editor_host__");
    const shadow = host?.shadowRoot;
    if (!api || !shadow) {
      state.attempts += 1;
      if (state.attempts < 200) window.setTimeout(boot, 25);
      return;
    }

    state.api = api;
    installPanel(shadow);
    window.addEventListener("wda:selection-changed", onSelectionChanged);
    window.addEventListener("keydown", onKeyDown, true);
    state.selected = api.getSelectedElement();
    updatePanel(shadow);
  }

  function installPanel(shadow) {
    if (shadow.getElementById(PANEL_ID)) return;
    const inspector = shadow.getElementById("__wda_selection_inspector__");
    if (!inspector) return;

    const section = document.createElement("section");
    section.id = PANEL_ID;
    section.className = "wda-inspector-v2";
    section.innerHTML = `
      <div class="wda-inspector-v2__header">
        <span class="wda-inspector-v2__title">Precisão</span>
        <span class="wda-inspector-v2__health" data-field="transform-value">0, 0 · 0°</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;align-items:end">
        <label class="wda-field">
          <span>Passo px</span>
          <select class="wda-select" data-control="step">
            <option value="1">1</option>
            <option value="5">5</option>
            <option value="10">10</option>
          </select>
        </label>
        <label class="wda-field" style="display:flex;align-items:center;gap:6px;min-height:34px">
          <input type="checkbox" data-control="ratio" checked>
          <span>Preservar proporção</span>
        </label>
      </div>
      <div class="wda-inspector-v2__actions" style="grid-template-columns:repeat(4,1fr)">
        <button class="wda-inspector-v2__button" type="button" data-nudge="left" title="Seta esquerda">←</button>
        <button class="wda-inspector-v2__button" type="button" data-nudge="up" title="Seta acima">↑</button>
        <button class="wda-inspector-v2__button" type="button" data-nudge="down" title="Seta abaixo">↓</button>
        <button class="wda-inspector-v2__button" type="button" data-nudge="right" title="Seta direita">→</button>
      </div>
      <p class="wda-hint">Setas movem. Shift acelera. Alt+←/→ rotaciona. Ctrl+setas redimensiona.</p>
    `;
    inspector.insertAdjacentElement("afterend", section);

    section.querySelector('[data-control="step"]')?.addEventListener("change", (event) => {
      const value = Number(event.target?.value);
      state.step = Number.isFinite(value) && value > 0 ? value : 1;
    });
    section.querySelector('[data-control="ratio"]')?.addEventListener("change", (event) => {
      state.keepRatio = Boolean(event.target?.checked);
    });
    for (const button of section.querySelectorAll("[data-nudge]")) {
      button.addEventListener("click", () => {
        const direction = button.getAttribute("data-nudge");
        if (direction) void nudge(direction, state.step);
      });
    }
  }

  function onSelectionChanged(event) {
    state.selected = event.detail?.element || null;
    const shadow = document.getElementById("__wda_editor_host__")?.shadowRoot;
    if (shadow) updatePanel(shadow);
  }

  function onKeyDown(event) {
    if (!state.selected || event.defaultPrevented || shouldIgnoreKeyboard(event)) return;
    const key = event.key;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) return;

    const direction = key.replace("Arrow", "").toLowerCase();
    const amount = state.step * (event.shiftKey ? 10 : 1);
    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.altKey && (direction === "left" || direction === "right")) {
      void rotate(direction === "left" ? -amount : amount);
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      void resize(direction, amount);
      return;
    }
    void nudge(direction, amount);
  }

  function shouldIgnoreKeyboard(event) {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
      return true;
    }
    return target instanceof HTMLElement && target.isContentEditable;
  }

  async function nudge(direction, amount) {
    const element = state.selected;
    if (!element || !state.api) return;
    const current = readTranslate(element.style.transform || getComputedStyle(element).transform);
    const delta = {
      left: [-amount, 0],
      right: [amount, 0],
      up: [0, -amount],
      down: [0, amount]
    }[direction];
    if (!delta) return;
    const next = replaceTranslate(element.style.transform, current.x + delta[0], current.y + delta[1]);
    await applyStyle(element, "transform", next);
  }

  async function rotate(delta) {
    const element = state.selected;
    if (!element || !state.api) return;
    const current = readRotation(element.style.transform || getComputedStyle(element).transform);
    const next = replaceRotation(element.style.transform, current + delta);
    await applyStyle(element, "transform", next);
  }

  async function resize(direction, amount) {
    const element = state.selected;
    if (!element || !state.api) return;
    const rect = element.getBoundingClientRect();
    const horizontal = direction === "left" || direction === "right";
    const sign = direction === "left" || direction === "up" ? -1 : 1;
    let width = Math.max(1, rect.width + (horizontal ? sign * amount : 0));
    let height = Math.max(1, rect.height + (horizontal ? 0 : sign * amount));

    if (state.keepRatio && rect.width > 0 && rect.height > 0) {
      const ratio = rect.width / rect.height;
      if (horizontal) height = Math.max(1, width / ratio);
      else width = Math.max(1, height * ratio);
    }

    await applyStyle(element, "width", `${round(width)}px`, false);
    await applyStyle(element, "height", `${round(height)}px`);
  }

  async function applyStyle(element, property, value, refresh = true) {
    const cssProperty = property.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
    const beforeValue = element.style.getPropertyValue(cssProperty);
    const before = beforeValue === "" ? null : beforeValue;
    element.style.setProperty(cssProperty, value);
    const after = element.style.getPropertyValue(cssProperty) || null;
    if (before !== after) {
      await state.api.emitPatch({
        selector: state.api.getSelector(),
        source: "manual",
        action: "set_style",
        property,
        before,
        after
      });
    }
    if (refresh) refreshGeometry();
  }

  function refreshGeometry() {
    state.api?.refreshSelection();
    const shadow = document.getElementById("__wda_editor_host__")?.shadowRoot;
    if (shadow) updatePanel(shadow);
    window.dispatchEvent(new Event("resize"));
  }

  function updatePanel(shadow) {
    const section = shadow.getElementById(PANEL_ID);
    if (!section) return;
    const buttons = section.querySelectorAll("button, select, input");
    for (const control of buttons) control.disabled = !state.selected;
    const value = section.querySelector('[data-field="transform-value"]');
    if (!value) return;
    if (!state.selected) {
      value.textContent = "sem seleção";
      return;
    }
    const transform = state.selected.style.transform || getComputedStyle(state.selected).transform;
    const translation = readTranslate(transform);
    const rotation = readRotation(transform);
    value.textContent = `${round(translation.x)}, ${round(translation.y)} · ${round(rotation)}°`;
  }

  function readTranslate(transform) {
    if (!transform || transform === "none") return { x: 0, y: 0 };
    const direct = transform.match(/translate(?:3d)?\(\s*(-?[\d.]+)px(?:\s*,\s*|\s+)(-?[\d.]+)px/i);
    if (direct) return { x: Number(direct[1]) || 0, y: Number(direct[2]) || 0 };
    try {
      const matrix = new DOMMatrixReadOnly(transform);
      return { x: matrix.e, y: matrix.f };
    } catch {
      return { x: 0, y: 0 };
    }
  }

  function replaceTranslate(transform, x, y) {
    const cleaned = (transform || "")
      .replace(/translate(?:3d|X|Y)?\([^)]*\)/gi, "")
      .trim();
    return `translate(${round(x)}px, ${round(y)}px)${cleaned ? ` ${cleaned}` : ""}`;
  }

  function readRotation(transform) {
    if (!transform || transform === "none") return 0;
    const direct = transform.match(/rotate(?:Z)?\(\s*(-?[\d.]+)deg\s*\)/i);
    if (direct) return Number(direct[1]) || 0;
    try {
      const matrix = new DOMMatrixReadOnly(transform);
      return Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
    } catch {
      return 0;
    }
  }

  function replaceRotation(transform, degrees) {
    const rotation = `rotate(${round(degrees)}deg)`;
    const cleaned = (transform || "").trim();
    if (!cleaned || cleaned === "none") return rotation;
    if (/rotate(?:Z)?\([^)]*\)/i.test(cleaned)) {
      return cleaned.replace(/rotate(?:Z)?\([^)]*\)/i, rotation);
    }
    return `${cleaned} ${rotation}`;
  }

  function round(value) {
    return Math.round(value * 100) / 100;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
