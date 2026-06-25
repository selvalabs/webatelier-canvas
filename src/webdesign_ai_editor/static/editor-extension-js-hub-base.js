(() => {
  "use strict";
  if (window.__WDA_JS_HUB_BASE_ACTIVE__) return;
  window.__WDA_JS_HUB_BASE_ACTIVE__ = true;
  let attempts = 0;

  function boot() {
    const shadow = document.getElementById("__wda_editor_host__")?.shadowRoot;
    if (!shadow) {
      attempts += 1;
      if (attempts < 240) window.setTimeout(boot, 25);
      return;
    }
    if (shadow.getElementById("__wda_js_hub_styles__")) return;
    const style = document.createElement("style");
    style.id = "__wda_js_hub_styles__";
    style.textContent = `
      .wda-js-hub{margin:0 0 10px;padding:10px;border:1px solid var(--wda-line,rgba(137,177,220,.22));border-radius:11px;background:rgba(17,29,48,.56)}
      .wda-js-hub__title{margin:0 0 4px;color:#a8c8e8;font:750 10px/1.2 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase}
      .wda-js-hub__intro{margin:0 0 10px;color:var(--wda-muted,#91a5bd);font:550 10px/1.5 ui-sans-serif,system-ui,sans-serif}
      .wda-js-hub__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.wda-js-hub__tool{min-height:64px;padding:8px;border:1px solid rgba(137,177,220,.2);border-radius:9px;background:rgba(3,9,19,.48);color:var(--wda-ink,#edf5ff);cursor:pointer;text-align:left}.wda-js-hub__tool:hover,.wda-js-hub__tool[data-active="true"]{border-color:rgba(67,221,206,.55);background:rgba(67,221,206,.08)}.wda-js-hub__tool strong{display:block;font:750 10px/1.25 ui-sans-serif,system-ui,sans-serif}.wda-js-hub__tool span{display:block;margin-top:4px;color:var(--wda-muted,#91a5bd);font:520 9px/1.35 ui-sans-serif,system-ui,sans-serif}
      .wda-js-hub__form{display:grid;gap:7px;margin-top:10px}.wda-js-hub__field{display:grid;gap:4px}.wda-js-hub__field span{color:var(--wda-muted,#91a5bd);font:700 9px/1.3 ui-sans-serif,system-ui,sans-serif}.wda-js-hub__input,.wda-js-hub__select{width:100%;height:32px;border:1px solid var(--wda-line,rgba(137,177,220,.22));border-radius:8px;background:rgba(4,11,23,.72);color:var(--wda-ink,#edf5ff);padding:5px 8px;font:600 9px/1.35 ui-sans-serif,system-ui,sans-serif}.wda-js-hub__input:focus,.wda-js-hub__select:focus{outline:2px solid var(--wda-blue,#61b8ff);outline-offset:1px}
      .wda-js-hub__actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.wda-js-hub__status{min-height:16px;margin-top:7px;color:var(--wda-muted,#91a5bd);font:550 9px/1.4 ui-sans-serif,system-ui,sans-serif}.wda-js-hub__status[data-kind="error"]{color:#ff9b89}.wda-js-hub__status[data-kind="success"]{color:#6ce7c9}
      .wda-js-preview{display:none;position:fixed;inset:0;z-index:2147483647;place-items:center;padding:18px;background:rgba(1,5,13,.68);backdrop-filter:blur(5px)}.wda-js-preview[data-open="true"]{display:grid}.wda-js-preview__card{width:min(620px,calc(100vw - 36px));max-height:min(760px,calc(100vh - 36px));overflow:auto;border:1px solid rgba(97,184,255,.34);border-radius:17px;background:#091525;color:#edf5ff;box-shadow:0 34px 110px rgba(0,0,0,.58)}.wda-js-preview__head{padding:17px 18px;border-bottom:1px solid rgba(137,177,220,.2);background:linear-gradient(135deg,rgba(97,184,255,.12),transparent 50%)}.wda-js-preview__title{margin:0;font:760 19px/1.2 ui-sans-serif,system-ui,sans-serif}.wda-js-preview__body{padding:16px 18px}.wda-js-preview__description{margin:0 0 12px;color:#b8cee4;font:550 11px/1.5 ui-sans-serif,system-ui,sans-serif}.wda-js-preview__canvas{min-height:120px;padding:16px;border:1px dashed rgba(137,177,220,.28);border-radius:11px;background:#ffffff;color:#0f172a;overflow:auto}.wda-js-preview__foot{display:flex;gap:8px;padding:0 18px 18px}.wda-js-preview__foot button{min-height:36px;flex:1}
      @media(max-width:640px){.wda-js-hub__grid,.wda-js-hub__actions{grid-template-columns:1fr}.wda-js-preview__card{max-height:calc(100vh - 20px)}}
    `;
    shadow.appendChild(style);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
