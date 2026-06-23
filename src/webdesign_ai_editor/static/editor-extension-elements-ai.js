(() => {
  "use strict";
  if (window.__WDA_ELEMENTS_AI_ACTIVE__) return;
  window.__WDA_ELEMENTS_AI_ACTIVE__ = true;
  let attempts = 0;

  function boot() {
    const elements = window.__WDA_ELEMENTS_API__;
    const editor = window.__WDA_EXTENSION_API__;
    const original = window.__wda_ai_edit;
    if (!elements || !editor || typeof original !== "function") {
      attempts += 1;
      if (attempts < 260) window.setTimeout(boot, 25);
      return;
    }
    if (original.__wda_elements_wrapped__) return;

    const wrapped = async (request) => {
      const plan = await original(request);
      const insertions = plan.actions.filter((action) => action.type === "insert_element");
      const edits = plan.actions.filter((action) => action.type !== "insert_element");
      if (insertions.length) await elements.applyActions(insertions, "ai");
      if (edits.length) return { ...plan, actions: edits };

      const selected = editor.getSelectedElement();
      const opacity = selected ? getComputedStyle(selected).opacity || "1" : "1";
      return {
        ...plan,
        summary: `${plan.summary} Inserção aplicada.`,
        actions: [{ type: "set_style", property: "opacity", value: opacity }]
      };
    };
    wrapped.__wda_elements_wrapped__ = true;
    window.__wda_ai_edit = wrapped;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
