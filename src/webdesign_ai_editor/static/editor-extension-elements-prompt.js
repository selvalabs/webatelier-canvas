(() => {
  "use strict";
  if (window.__WDA_ELEMENTS_PROMPT_ACTIVE__) return;
  window.__WDA_ELEMENTS_PROMPT_ACTIVE__ = true;
  let attempts = 0;

  function boot() {
    const shadow = document.getElementById("__wda_editor_host__")?.shadowRoot;
    const panel = shadow?.getElementById("__wda_elements_panel__");
    const corePrompt = shadow?.querySelector("#wda-prompt");
    const coreButton = shadow?.querySelector("#wda-apply-prompt");
    if (!panel || !(corePrompt instanceof HTMLTextAreaElement) || !(coreButton instanceof HTMLButtonElement)) {
      attempts += 1;
      if (attempts < 260) window.setTimeout(boot, 25);
      return;
    }
    if (panel.querySelector("[data-elements-ai-prompt]")) return;

    const section = document.createElement("div");
    section.className = "wda-elements__prompt";
    section.innerHTML = `
      <label class="wda-elements__field" data-wide="true">
        <span>Adicionar com Gemma</span>
        <textarea class="wda-elements__textarea" data-elements-ai-prompt placeholder="Ex.: adicione um card com título, descrição e botão dentro deste container"></textarea>
      </label>
      <button class="wda-button wda-button-primary" type="button" data-elements-ai-submit title="Gera uma inserção estruturada, mostra o preview e só aplica após sua aprovação.">Gerar estrutura com IA</button>
    `;
    panel.appendChild(section);

    section.querySelector("[data-elements-ai-submit]")?.addEventListener("click", () => {
      const value = section.querySelector("[data-elements-ai-prompt]")?.value?.trim() || "";
      if (!value) {
        window.__WDA_EXTENSION_API__?.setStatus("Descreva o elemento que deseja adicionar.", "error");
        return;
      }
      corePrompt.value = value;
      corePrompt.dispatchEvent(new Event("input", { bubbles: true }));
      coreButton.click();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
