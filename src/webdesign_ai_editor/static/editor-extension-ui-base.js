(() => {
  "use strict";
  if (window.__WDA_STUDIO_BASE_ACTIVE__) return;
  window.__WDA_STUDIO_BASE_ACTIVE__ = true;
  let attempts = 0;

  function boot() {
    const shadow = document.getElementById("__wda_editor_host__")?.shadowRoot;
    if (!shadow) {
      attempts += 1;
      if (attempts < 200) window.setTimeout(boot, 25);
      return;
    }
    if (shadow.getElementById("__wda_studio_base_styles__")) return;

    const style = document.createElement("style");
    style.id = "__wda_studio_base_styles__";
    style.textContent = `
      :host{--wda-ink:#edf5ff;--wda-muted:#91a5bd;--wda-panel:rgba(8,17,31,.97);--wda-panel2:rgba(17,31,51,.94);--wda-line:rgba(137,177,220,.22);--wda-blue:#61b8ff;--wda-cyan:#43ddce;--wda-coral:#ff816a}
      .wda-panel{top:14px!important;right:14px!important;bottom:14px!important;width:min(354px,calc(100vw - 28px))!important;max-height:none!important;border:1px solid var(--wda-line)!important;border-radius:17px!important;background:var(--wda-panel)!important;color:var(--wda-ink)!important;box-shadow:0 28px 82px rgba(2,8,20,.5),inset 0 1px rgba(255,255,255,.04)!important;overflow:hidden!important;transition:width 160ms ease,transform 160ms ease!important}
      .wda-panel:before{content:"";position:absolute;inset:0 auto 0 0;width:7px;background:repeating-linear-gradient(to bottom,transparent 0 7px,rgba(97,184,255,.5) 7px 8px),linear-gradient(to bottom,rgba(67,221,206,.55),rgba(97,184,255,.1) 42%,rgba(255,129,106,.42));opacity:.72;pointer-events:none}
      .wda-header{min-height:66px!important;padding:12px 12px 12px 20px!important;border-bottom:1px solid var(--wda-line)!important;background:linear-gradient(135deg,rgba(97,184,255,.11),transparent 44%),var(--wda-panel2)!important}
      .wda-brand{display:flex!important;align-items:center!important;gap:9px!important;min-width:0!important;color:var(--wda-ink)!important}
      .wda-brand-mark{display:grid;width:32px;height:32px;place-items:center;border:1px solid rgba(67,221,206,.48);border-radius:9px;background:rgba(67,221,206,.08);color:var(--wda-cyan);font:800 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.06em}
      .wda-brand-copy{display:grid;gap:3px;min-width:0}.wda-brand-name{font:760 12px/1.2 ui-sans-serif,system-ui,sans-serif;letter-spacing:.02em}.wda-brand-meta{color:var(--wda-muted);font:650 8px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase}
      .wda-local-dot{display:inline-block;width:5px;height:5px;margin-right:5px;border-radius:50%;background:var(--wda-cyan);box-shadow:0 0 0 3px rgba(67,221,206,.12)}
      .wda-mode{border-color:rgba(67,221,206,.34)!important;background:rgba(67,221,206,.08)!important;color:var(--wda-cyan)!important;font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important;letter-spacing:.08em!important}
      .wda-content{padding:13px 12px 18px 20px!important;scrollbar-color:rgba(97,184,255,.42) transparent!important}
      .wda-empty{color:var(--wda-muted)!important}.wda-element-label{color:var(--wda-ink)!important;font-size:13px!important}
      .wda-section,.wda-inspector-v2{border:1px solid var(--wda-line)!important;border-radius:11px!important;background:rgba(17,29,48,.56)!important;box-shadow:inset 0 1px rgba(255,255,255,.025)!important}
      .wda-section{margin:0 0 10px!important;padding:10px!important}.wda-section:last-of-type{border-bottom:1px solid var(--wda-line)!important}
      .wda-section-title,.wda-inspector-v2__title{color:#a8c8e8!important;font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important;letter-spacing:.1em!important}
      .wda-field>span,.wda-hint,.wda-status{color:var(--wda-muted)!important}.wda-selector,.wda-inspector-v2__selector{border-color:rgba(97,184,255,.25)!important;background:rgba(2,8,20,.62)!important;color:#addaff!important}
      .wda-input,.wda-select,.wda-textarea{border-color:rgba(137,177,220,.22)!important;background:rgba(4,11,23,.7)!important;color:var(--wda-ink)!important}
      .wda-input:focus,.wda-select:focus,.wda-textarea:focus{border-color:var(--wda-blue)!important;box-shadow:0 0 0 2px rgba(97,184,255,.15)!important}
      .wda-button,.wda-inspector-v2__button{border-color:rgba(137,177,220,.25)!important;background:rgba(24,39,62,.78)!important;color:var(--wda-ink)!important}
      .wda-button:hover:not(:disabled),.wda-inspector-v2__button:hover:not(:disabled){border-color:rgba(97,184,255,.58)!important;background:rgba(32,62,96,.62)!important}
      .wda-button-primary{border-color:rgba(255,129,106,.62)!important;background:linear-gradient(135deg,#ff816a,#e85f56)!important;color:#1c0c09!important;box-shadow:0 8px 22px rgba(255,129,106,.16)!important}
      .wda-button:focus-visible,.wda-inspector-v2__button:focus-visible,.wda-input:focus-visible,.wda-select:focus-visible,.wda-textarea:focus-visible{outline:2px solid var(--wda-blue)!important;outline-offset:2px!important}
      .wda-status[data-kind="error"]{color:#ff9b89!important}.wda-status[data-kind="success"]{color:#6ce7c9!important}
      @media(max-width:720px){.wda-panel{top:auto!important;left:8px!important;right:8px!important;bottom:8px!important;width:auto!important;max-height:54vh!important;border-radius:15px!important}}
      @media(prefers-reduced-motion:reduce){.wda-panel{transition:none!important}}
    `;
    shadow.appendChild(style);

    const brand = shadow.querySelector(".wda-brand");
    if (brand) {
      brand.innerHTML = `<span class="wda-brand-mark" aria-hidden="true">W/A</span><span class="wda-brand-copy"><span class="wda-brand-name">Web Atelier</span><span class="wda-brand-meta"><span class="wda-local-dot"></span>local canvas console</span></span>`;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
