(() => {
  "use strict";
  if (window.__WDA_EXPORT_BASE_ACTIVE__) return;
  window.__WDA_EXPORT_BASE_ACTIVE__ = true;
  let attempts = 0;

  function boot() {
    const shadow = document.getElementById("__wda_editor_host__")?.shadowRoot;
    if (!shadow) {
      attempts += 1;
      if (attempts < 240) window.setTimeout(boot, 25);
      return;
    }
    if (shadow.getElementById("__wda_export_styles__")) return;
    const style = document.createElement("style");
    style.id = "__wda_export_styles__";
    style.textContent = `
      .wda-export{margin:0 0 10px;padding:10px;border:1px solid var(--wda-line,rgba(137,177,220,.22));border-radius:11px;background:rgba(17,29,48,.56)}
      .wda-export__title{margin:0 0 4px;color:#a8c8e8;font:750 10px/1.2 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase}
      .wda-export__intro{margin:0 0 10px;color:var(--wda-muted,#91a5bd);font:550 10px/1.5 ui-sans-serif,system-ui,sans-serif}
      .wda-export__actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}
      .wda-export__status{min-height:16px;margin-top:8px;color:var(--wda-muted,#91a5bd);font:550 9px/1.45 ui-sans-serif,system-ui,sans-serif;overflow-wrap:anywhere}
      .wda-export__status[data-kind="error"]{color:#ff9b89}.wda-export__status[data-kind="success"]{color:#6ce7c9}
      .wda-export-preview{display:none;position:fixed;inset:0;z-index:2147483647;place-items:center;padding:18px;background:rgba(1,5,13,.68);backdrop-filter:blur(5px)}
      .wda-export-preview[data-open="true"]{display:grid}
      .wda-export-preview__card{width:min(620px,calc(100vw - 36px));max-height:min(760px,calc(100vh - 36px));overflow:auto;border:1px solid rgba(97,184,255,.34);border-radius:17px;background:#091525;color:#edf5ff;box-shadow:0 34px 110px rgba(0,0,0,.58)}
      .wda-export-preview__head{padding:17px 18px;border-bottom:1px solid rgba(137,177,220,.2);background:linear-gradient(135deg,rgba(97,184,255,.12),transparent 50%)}
      .wda-export-preview__eyebrow{color:#43ddce;font:750 9px/1.2 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase}
      .wda-export-preview__title{margin:6px 0 0;font:760 19px/1.2 ui-sans-serif,system-ui,sans-serif}
      .wda-export-preview__body{padding:16px 18px}.wda-export-preview__summary{margin:0 0 12px;color:#b8cee4;font:550 11px/1.5 ui-sans-serif,system-ui,sans-serif}
      .wda-export-preview__files,.wda-export-preview__warnings{display:grid;gap:6px;margin-top:10px}.wda-export-preview__item{padding:8px 9px;border:1px solid rgba(137,177,220,.18);border-radius:8px;background:rgba(3,9,19,.5);color:#c8d9ea;font:600 10px/1.4 ui-monospace,monospace}
      .wda-export-preview__warnings .wda-export-preview__item{border-color:rgba(255,184,77,.25);color:#ffd48a}
      .wda-export-preview__foot{display:flex;gap:8px;padding:0 18px 18px}.wda-export-preview__foot button{min-height:36px;flex:1}
      @media(max-width:640px){.wda-export__actions{grid-template-columns:1fr}.wda-export-preview__card{max-height:calc(100vh - 20px)}}
    `;
    shadow.appendChild(style);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
