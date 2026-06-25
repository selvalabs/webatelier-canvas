(() => {
  "use strict";
  if (window.__WDA_HELP_MODAL_ACTIVE__) return;
  window.__WDA_HELP_MODAL_ACTIVE__ = true;

  const HOST_ID = "__wda_editor_host__";
  const ONBOARDING_KEY = "wda-onboarding-dismissed-v1";
  let attempts = 0;
  let shadow = null;

  function boot() {
    shadow = document.getElementById(HOST_ID)?.shadowRoot;
    if (!shadow) {
      attempts += 1;
      if (attempts < 240) window.setTimeout(boot, 25);
      return;
    }
    createModal();
    createButton();
    createOnboarding();
    window.addEventListener("keydown", onKeyDown, true);
  }

  function createModal() {
    if (shadow.getElementById("__wda_help_modal__")) return;
    const modal = document.createElement("div");
    modal.id = "__wda_help_modal__";
    modal.className = "wda-help-modal";
    modal.dataset.open = "false";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "__wda_help_title__");
    modal.innerHTML = `
      <article class="wda-help-card">
        <header class="wda-help-head">
          <div><div class="wda-help-eyebrow">WebAtelier Canvas</div><h2 class="wda-help-title" id="__wda_help_title__">Instruções e hotkeys</h2></div>
          <button class="wda-help-close" type="button" data-help-close title="Fechar instruções. Atalho: Esc." aria-label="Fechar instruções">×</button>
        </header>
        <div class="wda-help-body">
          <section class="wda-help-section"><h3>Selecionar</h3><p>Clique em um elemento para editar. Clique em outro para trocar. Use Pai/Filho para navegar e <kbd>Esc</kbd> para desmarcar.</p></section>
          <section class="wda-help-section"><h3>Mover e transformar</h3><p>Arraste a seleção, use os cantos para redimensionar e o handle superior para rotacionar.</p></section>
          <section class="wda-help-section"><h3>Modos</h3><p><kbd>Alt+E</kbd> alterna Editar/Interagir. <kbd>Alt+P</kbd> recolhe o painel.</p></section>
          <section class="wda-help-section"><h3>Guias</h3><p>Magenta indica alinhamento; azul mede distâncias. Grid e threshold não alteram o código.</p></section>
          <section class="wda-help-section"><h3>Histórico</h3><p><kbd>Ctrl+Z</kbd> desfaz e <kbd>Ctrl+Shift+Z</kbd> refaz. Timeline registra a origem dos patches.</p></section>
          <section class="wda-help-section"><h3>IA local</h3><p>O prompt vai ao Ollama local. Toda resposta é validada e exige aprovação no preview.</p></section>
          <section class="wda-help-section"><h3>Atalhos</h3><ul><li><kbd>Esc</kbd> desmarcar/fechar</li><li><kbd>Alt+E</kbd> editar/interagir</li><li><kbd>Alt+P</kbd> painel</li><li><kbd>Ctrl+Z</kbd> desfazer</li><li><kbd>Ctrl+Y</kbd> refazer</li></ul></section>
          <section class="wda-help-section"><h3>Segurança</h3><p>Somente propriedades, atributos e estruturas allowlisted são aplicados.</p></section>
        </div>
        <p class="wda-help-foot">Passe o mouse ou foque um controle para ver a explicação contextual.</p>
      </article>
    `;
    shadow.appendChild(modal);
    modal.querySelector("[data-help-close]")?.addEventListener("click", closeHelp);
    modal.addEventListener("pointerdown", (event) => {
      if (event.target === modal) closeHelp();
    });
  }

  function createButton() {
    const header = shadow.querySelector(".wda-header-tools, .wda-header");
    if (!header || header.querySelector("[data-open-help]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "wda-help-button";
    button.dataset.openHelp = "true";
    button.textContent = "i";
    button.title = "Abrir instruções, modos e hotkeys do editor.";
    button.setAttribute("aria-label", "Abrir instruções e hotkeys");
    button.addEventListener("click", openHelp);
    header.appendChild(button);
  }

  function createOnboarding() {
    if (localStorage.getItem(ONBOARDING_KEY) === "true") return;
    const content = shadow.querySelector(".wda-content");
    if (!content || content.querySelector("[data-wda-onboarding]")) return;
    const card = document.createElement("section");
    card.className = "wda-onboarding";
    card.dataset.wdaOnboarding = "true";
    card.dataset.wdaTab = "select";
    card.innerHTML = `<strong>Comece selecionando um elemento</strong><p>Clique para selecionar, arraste para mover e use o painel para editar.</p><div class="wda-onboarding-actions"><button type="button" data-onboarding-help>Abrir guia</button><button type="button" data-onboarding-dismiss>Entendi</button></div>`;
    content.prepend(card);
    card.querySelector("[data-onboarding-help]")?.addEventListener("click", openHelp);
    card.querySelector("[data-onboarding-dismiss]")?.addEventListener("click", () => {
      localStorage.setItem(ONBOARDING_KEY, "true");
      card.remove();
    });
  }

  function openHelp() {
    const modal = shadow?.getElementById("__wda_help_modal__");
    if (!modal) return;
    modal.dataset.open = "true";
    modal.querySelector("[data-help-close]")?.focus();
  }

  function closeHelp() {
    const modal = shadow?.getElementById("__wda_help_modal__");
    if (modal) modal.dataset.open = "false";
  }

  function onKeyDown(event) {
    if (event.key === "Escape") closeHelp();
    if (event.key === "?" && event.shiftKey && !isTyping(event.target)) {
      event.preventDefault();
      openHelp();
    }
  }

  function isTyping(target) {
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable);
  }

  window.__WDA_OPEN_HELP__ = openHelp;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
