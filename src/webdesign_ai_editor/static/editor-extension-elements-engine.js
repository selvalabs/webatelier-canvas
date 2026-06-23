(() => {
  "use strict";
  if (window.__WDA_ELEMENTS_ENGINE_ACTIVE__) return;
  window.__WDA_ELEMENTS_ENGINE_ACTIVE__ = true;

  const tags = new Set("a article button div h1 h2 h3 img li ol p section span ul".split(" "));
  const attributes = new Set("alt aria-label class href loading rel role src target title type".split(" "));
  const positions = new Set(["inside_start", "inside_end", "before", "after"]);
  const state = { api: null, selected: null, undo: [], redo: [], attempts: 0 };

  function boot() {
    const api = window.__WDA_EXTENSION_API__;
    if (!api) {
      state.attempts += 1;
      if (state.attempts < 240) window.setTimeout(boot, 25);
      return;
    }
    state.api = api;
    state.selected = api.getSelectedElement();
    window.addEventListener("wda:selection-changed", (event) => {
      state.selected = event.detail?.element || null;
      announceHistory();
    });
    expose();
  }

  async function insert(raw, position = "inside_end", source = "manual") {
    const target = state.selected;
    if (!target) throw new Error("Selecione um elemento de referência.");
    if (!positions.has(position)) throw new Error("Posição de inserção inválida.");
    const spec = normalize(raw, 1, { count: 0 });
    const node = createNode(spec);
    place(target, node, position);
    const record = { selector: state.api.getSelector(), position, spec, node };
    state.undo.push(record);
    state.redo = [];
    await state.api.emitPatch({
      selector: record.selector,
      source,
      action: "insert_element",
      property: position,
      before: null,
      after: JSON.stringify(spec)
    });
    selectNode(node);
    state.api.setStatus("Elemento inserido.", "success");
    announceHistory();
    return node;
  }

  async function applyActions(actions, source = "ai") {
    for (const action of actions || []) {
      if (action?.type === "insert_element") {
        await insert(action.element, action.position || "inside_end", source);
      }
    }
  }

  async function undo() {
    const record = state.undo.pop();
    if (!record) return false;
    record.node?.remove();
    state.redo.push(record);
    state.api.refreshSelection();
    announceHistory();
    return true;
  }

  async function redo() {
    const record = state.redo.pop();
    if (!record) return false;
    const target = query(record.selector);
    if (!target) {
      state.redo.push(record);
      throw new Error("O elemento de referência não existe mais.");
    }
    record.node = createNode(record.spec);
    place(target, record.node, record.position);
    state.undo.push(record);
    selectNode(record.node);
    announceHistory();
    return true;
  }

  function normalize(raw, depth, counter) {
    if (!raw || typeof raw !== "object" || depth > 4) throw new Error("Estrutura inválida.");
    counter.count += 1;
    if (counter.count > 40) throw new Error("Estrutura grande demais.");
    const tag = String(raw.tag || "").toLowerCase();
    if (!tags.has(tag)) throw new Error(`Tag não permitida: ${tag}`);
    const attrs = {};
    for (const [name, value] of Object.entries(raw.attributes || {})) {
      if (attributes.has(name) && !name.startsWith("on")) attrs[name] = String(value).slice(0, 5000);
    }
    const styles = {};
    for (const [name, value] of Object.entries(raw.styles || {})) {
      const text = String(value).slice(0, 500);
      if (!/[<>]/.test(text)) styles[name] = text;
    }
    const children = Array.isArray(raw.children)
      ? raw.children.slice(0, 12).map((child) => normalize(child, depth + 1, counter))
      : [];
    return { tag, text: String(raw.text || "").slice(0, 5000), attributes: attrs, styles, children };
  }

  function createNode(spec) {
    const node = document.createElement(spec.tag);
    node.dataset.wdaId = crypto.randomUUID?.() || `wda-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    for (const [name, value] of Object.entries(spec.attributes)) node.setAttribute(name, value);
    for (const [name, value] of Object.entries(spec.styles)) node.style.setProperty(kebab(name), value);
    if (spec.text && spec.tag !== "img") node.textContent = spec.text;
    for (const child of spec.children) node.appendChild(createNode(child));
    return node;
  }

  function place(target, node, position) {
    if (position === "inside_start") target.prepend(node);
    else if (position === "inside_end") target.appendChild(node);
    else if (position === "before") target.before(node);
    else target.after(node);
  }

  function selectNode(node) {
    if (typeof window.__WDA_FORCE_SELECT__ === "function") return window.__WDA_FORCE_SELECT__(node);
    node.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, composed: true, pointerId: 8123, pointerType: "mouse", button: 0, buttons: 1 }));
    state.api.refreshSelection();
  }

  function announceHistory() {
    window.dispatchEvent(new CustomEvent("wda:insertion-history", { detail: { canUndo: state.undo.length > 0, canRedo: state.redo.length > 0 } }));
  }

  function query(selector) { try { return document.querySelector(selector); } catch { return null; } }
  function kebab(value) { return value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`); }
  function expose() { window.__WDA_ELEMENTS_API__ = { insert, applyActions, undo, redo, normalize: (value) => normalize(value, 1, { count: 0 }) }; }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
