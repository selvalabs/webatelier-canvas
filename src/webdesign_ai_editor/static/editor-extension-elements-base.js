(() => {
  "use strict";
  if (window.__WDA_ELEMENTS_BASE__) return;
  window.__WDA_ELEMENTS_BASE__ = true;
  let attempts = 0;
  function boot() {
    const shadow = document.getElementById("__wda_editor_host__")?.shadowRoot;
    if (!shadow) {
      attempts += 1;
      if (attempts < 240) window.setTimeout(boot, 25);
      return;
    }
    if (shadow.getElementById("__wda_elements_styles__")) return;
    const style = document.createElement("style");
    style.id = "__wda_elements_styles__";
    style.textContent = `
      .wda-elements{margin:0 0 10px;padding:10px;border:1px solid var(--wda-line);border-radius:11px;background:rgba(17,29,48,.56)}.wda-elements__title{margin:0 0 4px;color:#a8c8e8;font:750 10px/1.2 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase}.wda-elements__intro{margin:0 0 9px;color:var(--wda-muted);font:550 10px/1.5 ui-sans-serif,system-ui,sans-serif}.wda-elements__palette{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.wda-elements__card{min-height:50px;padding:6px;border:1px solid var(--wda-line);border-radius:8px;background:rgba(3,9,19,.48);color:var(--wda-ink);cursor:pointer;font:700 9px/1.3 ui-sans-serif,system-ui,sans-serif}.wda-elements__card:hover,.wda-elements__card[data-active=true]{border-color:var(--wda-cyan);color:var(--wda-cyan)}.wda-elements__form{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.wda-elements__field{display:grid;gap:4px}.wda-elements__field[data-wide=true]{grid-column:1/-1}.wda-elements__field span{color:var(--wda-muted);font:700 9px/1.3 ui-sans-serif,system-ui,sans-serif}.wda-elements__input,.wda-elements__select,.wda-elements__textarea{width:100%;border:1px solid var(--wda-line);border-radius:8px;background:rgba(4,11,23,.72);color:var(--wda-ink);padding:5px 7px;font:600 9px/1.35 ui-sans-serif,system-ui,sans-serif}.wda-elements__input,.wda-elements__select{height:31px}.wda-elements__textarea{min-height:58px;resize:vertical}.wda-elements__actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.wda-elements__prompt{margin-top:10px;padding-top:9px;border-top:1px solid var(--wda-line)}.wda-elements__status{min-height:15px;margin-top:7px;color:var(--wda-muted);font:550 9px/1.4 ui-sans-serif,system-ui,sans-serif}
    `;
    shadow.appendChild(style);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
