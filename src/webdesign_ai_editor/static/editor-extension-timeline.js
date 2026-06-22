(() => {
  "use strict";
  if (window.__WDA_TIMELINE_ACTIVE__) return;
  window.__WDA_TIMELINE_ACTIVE__ = true;

  const state = { api: null, sessionId: "", patches: [], attempts: 0 };
  const allowedActions = new Set(["set_style", "set_text", "set_attribute"]);

  function boot() {
    const api = window.__WDA_EXTENSION_API__;
    const shadow = document.getElementById("__wda_editor_host__")?.shadowRoot;
    if (!api || !shadow || typeof window.__wda_session_state !== "function") {
      state.attempts += 1;
      if (state.attempts < 240) window.setTimeout(boot, 25);
      return;
    }
    state.api = api;
    installStyles(shadow);
    installPanel(shadow);
    wrapEmitter();
    void refreshFromDisk();
  }

  function installStyles(shadow) {
    if (shadow.getElementById("__wda_timeline_styles__")) return;
    const style = document.createElement("style");
    style.id = "__wda_timeline_styles__";
    style.textContent = `
      .wda-timeline{margin:0 0 10px;padding:10px;border:1px solid var(--wda-line,rgba(148,163,184,.24));border-radius:11px;background:rgba(17,29,48,.56)}.wda-timeline__head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.wda-timeline__title{color:#a8c8e8;font:700 10px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase}.wda-timeline__count{color:var(--wda-muted);font:700 9px/1 ui-monospace,monospace}.wda-timeline__list{display:grid;gap:5px;max-height:180px;overflow:auto}.wda-timeline__item{display:grid;grid-template-columns:auto 1fr;gap:7px;padding:7px;border:1px solid rgba(137,177,220,.16);border-radius:8px;background:rgba(3,9,19,.5)}.wda-timeline__source{align-self:start;padding:2px 5px;border-radius:999px;background:rgba(97,184,255,.12);color:#addaff;font:700 8px/1.4 ui-monospace,monospace;text-transform:uppercase}.wda-timeline__body{min-width:0}.wda-timeline__action{color:var(--wda-ink,#edf5ff);font:700 9px/1.3 ui-monospace,monospace}.wda-timeline__selector{overflow:hidden;color:var(--wda-muted);font:500 9px/1.35 ui-monospace,monospace;text-overflow:ellipsis;white-space:nowrap}.wda-timeline__empty{padding:9px;color:var(--wda-muted);font:500 10px/1.4 ui-sans-serif,system-ui,sans-serif;text-align:center}.wda-timeline__tools{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.wda-timeline__name{grid-column:1/-1}.wda-timeline__file{display:none}
    `;
    shadow.appendChild(style);
  }

  function installPanel(shadow) {
    if (shadow.getElementById("__wda_timeline_panel__")) return;
    const selected = shadow.querySelector("#wda-selected");
    const actions = shadow.querySelector(".wda-actions");
    if (!selected) return;

    const panel = document.createElement("section");
    panel.id = "__wda_timeline_panel__";
    panel.className = "wda-timeline";
    panel.innerHTML = `
      <div class="wda-timeline__head"><span class="wda-timeline__title">Timeline</span><span class="wda-timeline__count">0 patches</span></div>
      <div class="wda-timeline__list"></div>
      <div class="wda-timeline__tools">
        <input class="wda-input wda-timeline__name" type="text" placeholder="Nome da sessão" data-session-name>
        <button class="wda-button" type="button" data-timeline-action="refresh">Atualizar</button>
        <button class="wda-button" type="button" data-timeline-action="export">Exportar</button>
        <button class="wda-button" type="button" data-timeline-action="import">Importar</button>
        <button class="wda-button" type="button" data-timeline-action="clear">Limpar log</button>
        <input class="wda-timeline__file" type="file" accept="application/json,.json" data-import-file>
      </div>
    `;
    if (actions) selected.insertBefore(panel, actions);
    else selected.appendChild(panel);

    panel.querySelector('[data-timeline-action="refresh"]')?.addEventListener("click", () => void refreshFromDisk());
    panel.querySelector('[data-timeline-action="export"]')?.addEventListener("click", exportTimeline);
    panel.querySelector('[data-timeline-action="import"]')?.addEventListener("click", () => panel.querySelector("[data-import-file]")?.click());
    panel.querySelector('[data-timeline-action="clear"]')?.addEventListener("click", () => void clearTimeline());
    panel.querySelector("[data-import-file]")?.addEventListener("change", (event) => void importTimeline(event));
    panel.querySelector("[data-session-name]")?.addEventListener("change", (event) => saveSessionName(event.target?.value || ""));
  }

  function wrapEmitter() {
    const original = window.__wda_emit;
    if (typeof original !== "function" || original.__wda_timeline_wrapped__) return;
    const wrapped = async (message) => {
      const result = await original(message);
      if (result?.ok && message?.patch) {
        state.patches.push({ ...message.patch, id: result.record_id, created_at: new Date().toISOString() });
        render();
      }
      return result;
    };
    wrapped.__wda_timeline_wrapped__ = true;
    window.__wda_emit = wrapped;
  }

  async function refreshFromDisk() {
    try {
      const payload = await window.__wda_session_state();
      state.sessionId = payload.session_id || "";
      state.patches = Array.isArray(payload.patches) ? payload.patches : [];
      loadSessionName();
      render();
    } catch (error) {
      state.api?.setStatus(`Falha ao carregar sessão: ${messageOf(error)}`, "error");
    }
  }

  function render() {
    const shadow = document.getElementById("__wda_editor_host__")?.shadowRoot;
    const panel = shadow?.getElementById("__wda_timeline_panel__");
    if (!panel) return;
    const count = panel.querySelector(".wda-timeline__count");
    const list = panel.querySelector(".wda-timeline__list");
    if (count) count.textContent = `${state.patches.length} patches`;
    if (!list) return;
    list.replaceChildren();
    if (!state.patches.length) {
      const empty = document.createElement("div");
      empty.className = "wda-timeline__empty";
      empty.textContent = "Nenhuma alteração persistida nesta sessão.";
      list.appendChild(empty);
      return;
    }
    for (const patch of state.patches.slice(-60).reverse()) {
      const item = document.createElement("article");
      item.className = "wda-timeline__item";
      const source = document.createElement("span");
      source.className = "wda-timeline__source";
      source.textContent = patch.source || "manual";
      const body = document.createElement("div");
      body.className = "wda-timeline__body";
      const action = document.createElement("div");
      action.className = "wda-timeline__action";
      action.textContent = patch.property ? `${patch.action} · ${patch.property}` : patch.action;
      const selector = document.createElement("div");
      selector.className = "wda-timeline__selector";
      selector.textContent = patch.selector || "—";
      selector.title = selector.textContent;
      body.append(action, selector);
      item.append(source, body);
      list.appendChild(item);
    }
  }

  function exportTimeline() {
    const name = sessionName() || `wda-session-${state.sessionId || "export"}`;
    const payload = { version: 1, session_id: state.sessionId, name, exported_at: new Date().toISOString(), patches: state.patches };
    const blob = new Blob([JSON.stringify(payload, null, 2) + "\n"], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${slug(name)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    state.api?.setStatus("Timeline exportada.", "success");
  }

  async function importTimeline(event) {
    const file = event.target?.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const patches = Array.isArray(parsed) ? parsed : parsed.patches;
      if (!Array.isArray(patches)) throw new Error("arquivo não contém patches");
      if (typeof window.__wda_clear_session === "function") await window.__wda_clear_session();
      state.patches = [];
      for (const raw of patches.slice(0, 2000)) {
        const patch = normalizePatch(raw);
        if (!patch) continue;
        applyPatchToDom(patch);
        await window.__wda_emit({ type: "patch", patch: { ...patch, source: "system" } });
      }
      if (parsed.name) saveSessionName(String(parsed.name));
      await refreshFromDisk();
      state.api?.refreshSelection();
      state.api?.setStatus("Timeline importada e reaplicada.", "success");
    } catch (error) {
      state.api?.setStatus(`Falha ao importar: ${messageOf(error)}`, "error");
    } finally {
      event.target.value = "";
    }
  }

  async function clearTimeline() {
    if (typeof window.__wda_clear_session !== "function") return;
    await window.__wda_clear_session();
    state.patches = [];
    render();
    state.api?.setStatus("Log da sessão limpo; o DOM atual não foi revertido.", "success");
  }

  function normalizePatch(raw) {
    if (!raw || !allowedActions.has(raw.action) || typeof raw.selector !== "string") return null;
    return { selector: raw.selector, source: "system", action: raw.action, property: raw.property ?? null, before: raw.before ?? null, after: raw.after ?? null };
  }

  function applyPatchToDom(patch) {
    const target = safeQuery(patch.selector);
    if (!(target instanceof HTMLElement || target instanceof SVGElement)) return;
    if (patch.action === "set_style" && patch.property) {
      const name = patch.property.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
      if (patch.after === null) target.style.removeProperty(name);
      else target.style.setProperty(name, String(patch.after));
    } else if (patch.action === "set_text") {
      target.textContent = patch.after ?? "";
    } else if (patch.action === "set_attribute" && patch.property) {
      if (patch.after === null) target.removeAttribute(patch.property);
      else target.setAttribute(patch.property, String(patch.after));
    }
  }

  function safeQuery(selector) {
    try { return document.querySelector(selector); } catch { return null; }
  }

  function sessionName() {
    const input = document.getElementById("__wda_editor_host__")?.shadowRoot?.querySelector("[data-session-name]");
    return input?.value?.trim() || "";
  }

  function saveSessionName(value) {
    if (!state.sessionId) return;
    localStorage.setItem(`wda-session-name:${state.sessionId}`, value.trim());
  }

  function loadSessionName() {
    const input = document.getElementById("__wda_editor_host__")?.shadowRoot?.querySelector("[data-session-name]");
    if (input && state.sessionId) input.value = localStorage.getItem(`wda-session-name:${state.sessionId}`) || "";
  }

  function slug(value) {
    return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "wda-session";
  }

  function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
