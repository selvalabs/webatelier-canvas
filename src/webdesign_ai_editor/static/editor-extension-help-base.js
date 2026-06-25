(() => {
  "use strict";
  if (window.__WDA_HELP_BASE_ACTIVE__) return;
  window.__WDA_HELP_BASE_ACTIVE__ = true;
  let attempts = 0;

  function boot() {
    const shadow = document.getElementById("__wda_editor_host__")?.shadowRoot;
    if (!shadow) {
      attempts += 1;
      if (attempts < 240) window.setTimeout(boot, 25);
      return;
    }
    if (shadow.getElementById("__wda_help_styles__")) return;
    const style = document.createElement("style");
    style.id = "__wda_help_styles__";
    style.textContent = `
      .wda-help-button{display:grid;width:30px;height:30px;place-items:center;border:1px solid var(--wda-line,rgba(137,177,220,.22));border-radius:8px;background:rgba(6,12,24,.62);color:var(--wda-muted,#91a5bd);cursor:pointer;font:800 12px/1 ui-monospace,monospace}.wda-help-button:hover{border-color:var(--wda-blue,#61b8ff);color:var(--wda-ink,#edf5ff)}.wda-help-button:focus-visible{outline:2px solid var(--wda-blue,#61b8ff);outline-offset:2px}
      .wda-help-modal{display:none;position:fixed;inset:0;z-index:2147483647;place-items:center;padding:18px;background:rgba(1,5,13,.66);backdrop-filter:blur(5px);pointer-events:auto}.wda-help-modal[data-open="true"]{display:grid}.wda-help-card{width:min(720px,calc(100vw - 36px));max-height:min(760px,calc(100vh - 36px));overflow:auto;border:1px solid rgba(97,184,255,.34);border-radius:17px;background:#091525;color:#edf5ff;box-shadow:0 34px 110px rgba(0,0,0,.58)}.wda-help-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px;border-bottom:1px solid rgba(137,177,220,.2);background:linear-gradient(135deg,rgba(97,184,255,.12),transparent 48%)}.wda-help-eyebrow{color:#43ddce;font:750 9px/1.2 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase}.wda-help-title{margin:6px 0 0;font:760 20px/1.2 ui-sans-serif,system-ui,sans-serif}.wda-help-close{width:34px;height:34px;border:1px solid rgba(137,177,220,.25);border-radius:9px;background:rgba(24,39,62,.78);color:#edf5ff;cursor:pointer;font:800 15px/1 ui-monospace,monospace}.wda-help-close:focus-visible{outline:2px solid #61b8ff;outline-offset:2px}.wda-help-body{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:18px}.wda-help-section{padding:12px;border:1px solid rgba(137,177,220,.18);border-radius:11px;background:rgba(3,9,19,.48)}.wda-help-section h3{margin:0 0 8px;color:#addaff;font:750 11px/1.2 ui-monospace,monospace;letter-spacing:.07em;text-transform:uppercase}.wda-help-section p,.wda-help-section li{color:#b6c8dc;font:550 11px/1.5 ui-sans-serif,system-ui,sans-serif}.wda-help-section ul{margin:0;padding-left:18px}.wda-help-section kbd{padding:2px 5px;border:1px solid rgba(67,221,206,.32);border-radius:5px;background:rgba(67,221,206,.08);color:#83f2df;font:700 9px/1.4 ui-monospace,monospace}.wda-help-foot{padding:0 18px 18px;color:#91a5bd;font:550 10px/1.45 ui-sans-serif,system-ui,sans-serif}
      .wda-tooltip{position:fixed;z-index:2147483647;max-width:280px;padding:7px 9px;border:1px solid rgba(97,184,255,.28);border-radius:8px;background:#06101f;color:#dcecff;box-shadow:0 12px 34px rgba(0,0,0,.38);font:600 10px/1.4 ui-sans-serif,system-ui,sans-serif;pointer-events:none;opacity:0;transform:translateY(3px);transition:opacity 90ms ease,transform 90ms ease}.wda-tooltip[data-open="true"]{opacity:1;transform:translateY(0)}
      .wda-onboarding{margin:0 0 10px;padding:11px;border:1px solid rgba(67,221,206,.24);border-radius:11px;background:linear-gradient(135deg,rgba(67,221,206,.08),rgba(97,184,255,.04));color:#c7d8ea}.wda-onboarding strong{display:block;margin-bottom:5px;color:#edf5ff;font:750 11px/1.3 ui-sans-serif,system-ui,sans-serif}.wda-onboarding p{margin:0;color:#a9bdd2;font:550 10px/1.5 ui-sans-serif,system-ui,sans-serif}.wda-onboarding-actions{display:flex;gap:6px;margin-top:8px}.wda-onboarding-actions button{min-height:29px;flex:1;border:1px solid rgba(137,177,220,.24);border-radius:7px;background:rgba(24,39,62,.7);color:#edf5ff;cursor:pointer;font:700 9px/1 ui-sans-serif,system-ui,sans-serif}
      @media(max-width:640px){.wda-help-body{grid-template-columns:1fr}.wda-help-card{max-height:calc(100vh - 20px)}}@media(prefers-reduced-motion:reduce){.wda-tooltip{transition:none}}
    `;
    shadow.appendChild(style);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
