(() => {
  "use strict";
  if (window.__WDA_AI_PREVIEW_ACTIVE__) return;
  window.__WDA_AI_PREVIEW_ACTIVE__ = true;

  const state = { attempts: 0, pending: null };

  function boot() {
    const shadow = document.getElementById("__wda_editor_host__")?.shadowRoot;
    const original = window.__wda_ai_edit;
    if (!shadow || typeof original !== "function") {
      state.attempts += 1;
      if (state.attempts < 240) window.setTimeout(boot, 25);
      return;
    }
    if (original.__wda_preview_wrapped__) return;
    installStyles(shadow);
    installDialog(shadow);

    const wrapped = async (request) => {
      try {
        const plan = await original(request);
        validatePlan(plan);
        return await requestApproval(plan, request);
      } catch (error) {
        if (error?.name === "WdaPlanDiscarded") throw error;
        const message = readableError(error);
        throw new Error(`${message} Verifique Ollama, o modelo configurado e tente novamente.`);
      }
    };
    wrapped.__wda_preview_wrapped__ = true;
    window.__wda_ai_edit = wrapped;
  }

  function installStyles(shadow) {
    if (shadow.getElementById("__wda_ai_preview_styles__")) return;
    const style = document.createElement("style");
    style.id = "__wda_ai_preview_styles__";
    style.textContent = `
      .wda-ai-preview{display:none;position:fixed;inset:0;z-index:2147483647;place-items:center;padding:18px;background:rgba(1,5,13,.62);backdrop-filter:blur(5px)}.wda-ai-preview[data-open=true]{display:grid}.wda-ai-preview__card{width:min(520px,calc(100vw - 36px));max-height:min(720px,calc(100vh - 36px));overflow:auto;border:1px solid rgba(97,184,255,.35);border-radius:16px;background:#091525;color:#edf5ff;box-shadow:0 35px 100px rgba(0,0,0,.55)}.wda-ai-preview__head{padding:16px 18px;border-bottom:1px solid rgba(137,177,220,.2);background:linear-gradient(135deg,rgba(97,184,255,.12),transparent 52%)}.wda-ai-preview__eyebrow{color:#43ddce;font:750 9px/1.2 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase}.wda-ai-preview__title{margin:6px 0 0;color:#edf5ff;font:760 18px/1.2 ui-sans-serif,system-ui,sans-serif}.wda-ai-preview__body{padding:16px 18px}.wda-ai-preview__prompt{margin:0 0 12px;padding:9px 10px;border-left:2px solid #61b8ff;background:rgba(97,184,255,.07);color:#bcd9f5;font:550 11px/1.45 ui-sans-serif,system-ui,sans-serif}.wda-ai-preview__actions{display:grid;gap:7px}.wda-ai-preview__action{padding:9px 10px;border:1px solid rgba(137,177,220,.18);border-radius:9px;background:rgba(3,9,19,.52)}.wda-ai-preview__action strong{display:block;color:#edf5ff;font:700 10px/1.3 ui-monospace,monospace}.wda-ai-preview__action span{display:block;margin-top:3px;color:#91a5bd;font:500 10px/1.4 ui-monospace,monospace;overflow-wrap:anywhere}.wda-ai-preview__warnings{margin:12px 0 0;padding:9px 10px;border:1px solid rgba(255,184,77,.25);border-radius:9px;background:rgba(255,184,77,.07);color:#ffd48a;font:600 10px/1.45 ui-sans-serif,system-ui,sans-serif}.wda-ai-preview__foot{display:flex;gap:8px;padding:13px 18px 17px}.wda-ai-preview__button{min-height:36px;flex:1;border:1px solid rgba(137,177,220,.28);border-radius:9px;background:rgba(24,39,62,.8);color:#edf5ff;cursor:pointer;font:750 11px/1 ui-sans-serif,system-ui,sans-serif}.wda-ai-preview__button[data-primary=true]{border-color:rgba(255,129,106,.6);background:linear-gradient(135deg,#ff816a,#e85f56);color:#1c0c09}.wda-ai-preview__button:focus-visible{outline:2px solid #61b8ff;outline-offset:2px}
    `;
    shadow.appendChild(style);
  }

  function installDialog(shadow) {
    if (shadow.getElementById("__wda_ai_preview__")) return;
    const dialog = document.createElement("div");
    dialog.id = "__wda_ai_preview__";
    dialog.className = "wda-ai-preview";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "__wda_ai_preview_title__");
    dialog.innerHTML = `
      <article class="wda-ai-preview__card">
        <header class="wda-ai-preview__head"><div class="wda-ai-preview__eyebrow">Plano local · aprovação obrigatória</div><h2 class="wda-ai-preview__title" id="__wda_ai_preview_title__">Revisar alterações da Gemma</h2></header>
        <div class="wda-ai-preview__body"><p class="wda-ai-preview__prompt"></p><div class="wda-ai-preview__actions"></div><div class="wda-ai-preview__warnings" hidden></div></div>
        <footer class="wda-ai-preview__foot"><button class="wda-ai-preview__button" type="button" data-decision="discard">Descartar</button><button class="wda-ai-preview__button" type="button" data-decision="approve" data-primary="true">Aplicar plano</button></footer>
      </article>
    `;
    shadow.appendChild(dialog);
    dialog.querySelector('[data-decision="approve"]')?.addEventListener("click", () => settle(true));
    dialog.querySelector('[data-decision="discard"]')?.addEventListener("click", () => settle(false));
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        settle(false);
      }
    });
  }

  function requestApproval(plan, request) {
    if (state.pending) {
      const error = new Error("Outro plano já está aguardando aprovação.");
      error.name = "WdaPlanDiscarded";
      return Promise.reject(error);
    }
    renderPlan(plan, request);
    const dialog = currentDialog();
    if (!dialog) return Promise.resolve(plan);
    dialog.dataset.open = "true";
    dialog.querySelector('[data-decision="approve"]')?.focus();
    return new Promise((resolve, reject) => {
      state.pending = { plan, resolve, reject };
    });
  }

  function renderPlan(plan, request) {
    const dialog = currentDialog();
    if (!dialog) return;
    const prompt = dialog.querySelector(".wda-ai-preview__prompt");
    const actions = dialog.querySelector(".wda-ai-preview__actions");
    const warnings = dialog.querySelector(".wda-ai-preview__warnings");
    if (prompt) prompt.textContent = request?.prompt || plan.summary;
    if (actions) {
      actions.replaceChildren();
      for (const action of plan.actions) {
        const item = document.createElement("div");
        item.className = "wda-ai-preview__action";
        const title = document.createElement("strong");
        title.textContent = actionLabel(action);
        const value = document.createElement("span");
        value.textContent = actionValue(action);
        item.append(title, value);
        actions.appendChild(item);
      }
    }
    if (warnings) {
      const list = Array.isArray(plan.warnings) ? plan.warnings.filter(Boolean) : [];
      warnings.hidden = list.length === 0;
      warnings.textContent = list.length ? `Avisos: ${list.join(" · ")}` : "";
    }
    const title = dialog.querySelector(".wda-ai-preview__title");
    if (title) title.textContent = plan.summary || "Revisar alterações da Gemma";
  }

  function settle(approved) {
    const pending = state.pending;
    const dialog = currentDialog();
    if (dialog) dialog.dataset.open = "false";
    state.pending = null;
    if (!pending) return;
    if (approved) {
      pending.resolve(pending.plan);
    } else {
      const error = new Error("Plano descartado pelo usuário; nenhuma ação de IA foi aplicada.");
      error.name = "WdaPlanDiscarded";
      pending.reject(error);
    }
  }

  function validatePlan(plan) {
    if (!plan || !Array.isArray(plan.actions) || plan.actions.length === 0 || plan.actions.length > 20) {
      throw new Error("O modelo retornou um plano vazio ou fora dos limites.");
    }
    for (const action of plan.actions) {
      if (!action || !["set_style", "set_text", "set_attribute"].includes(action.type)) {
        throw new Error("O modelo retornou um tipo de ação não permitido.");
      }
    }
  }

  function actionLabel(action) {
    if (action.type === "set_style") return `Estilo · ${action.property}`;
    if (action.type === "set_attribute") return `Atributo · ${action.name}`;
    return "Texto";
  }

  function actionValue(action) {
    return String(action.value ?? "").slice(0, 500);
  }

  function readableError(error) {
    return error instanceof Error ? error.message : String(error);
  }

  function currentDialog() {
    return document.getElementById("__wda_editor_host__")?.shadowRoot?.getElementById("__wda_ai_preview__");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
