(() => {
  "use strict";
  if (window.__WDA_TABS_BASE_ACTIVE__) return;
  window.__WDA_TABS_BASE_ACTIVE__ = true;
  let attempts = 0;

  function boot() {
    const shadow = document.getElementById("__wda_editor_host__")?.shadowRoot;
    const panel = shadow?.querySelector(".wda-panel");
    if (!shadow || !panel) {
      attempts += 1;
      if (attempts < 240) window.setTimeout(boot, 25);
      return;
    }
    if (shadow.getElementById("__wda_tabs_base_styles__")) return;

    const style = document.createElement("style");
    style.id = "__wda_tabs_base_styles__";
    style.textContent = `
      .wda-panel{display:flex!important;flex-direction:column!important;overflow:hidden!important}
      .wda-header{position:relative!important;flex:0 0 auto!important}
      .wda-content{display:flex!important;flex:1 1 auto!important;min-height:0!important;flex-direction:column!important;overflow:hidden!important;padding:0!important}
      .wda-tablist{display:flex;flex:0 0 auto;gap:3px;padding:8px 10px 7px 17px;border-bottom:1px solid var(--wda-line,rgba(137,177,220,.22));background:rgba(4,11,23,.78);overflow-x:auto;scrollbar-width:thin;scrollbar-color:rgba(97,184,255,.36) transparent}
      .wda-tab{min-width:max-content;min-height:30px;padding:0 9px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--wda-muted,#91a5bd);cursor:pointer;font:720 9px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.035em}
      .wda-tab:hover{border-color:rgba(97,184,255,.28);color:var(--wda-ink,#edf5ff);background:rgba(97,184,255,.07)}
      .wda-tab[aria-selected="true"]{border-color:rgba(67,221,206,.42);background:rgba(67,221,206,.1);color:var(--wda-cyan,#43ddce)}
      .wda-tab:focus-visible{outline:2px solid var(--wda-blue,#61b8ff);outline-offset:1px}
      .wda-tab-viewport{position:relative;display:block;flex:1 1 auto;min-height:0;overflow:hidden}
      .wda-tab-view{display:none;height:100%;min-height:0;padding:12px 11px 18px 18px;overflow:auto;scrollbar-gutter:stable;scrollbar-color:rgba(97,184,255,.42) transparent}
      .wda-tab-view[data-active="true"]{display:block}
      .wda-tab-view>[data-wda-tab-moved]{margin-top:0}
      .wda-tab-empty{display:none;min-height:120px;place-items:center;padding:22px;border:1px dashed rgba(137,177,220,.24);border-radius:11px;color:var(--wda-muted,#91a5bd);font:550 11px/1.5 ui-sans-serif,system-ui,sans-serif;text-align:center}
      .wda-tab-view[data-requires-selection="true"][data-selection-active="false"]>.wda-tab-empty{display:grid}
      .wda-tab-view[data-requires-selection="true"][data-selection-active="false"]>[data-wda-tab-moved]{display:none!important}
      .wda-tab-placeholder{padding:18px 14px;border:1px dashed rgba(137,177,220,.24);border-radius:11px;background:rgba(3,9,19,.24);color:var(--wda-muted,#91a5bd);font:550 11px/1.55 ui-sans-serif,system-ui,sans-serif}
      .wda-tab-placeholder strong{display:block;margin-bottom:5px;color:var(--wda-ink,#edf5ff);font:750 11px/1.3 ui-sans-serif,system-ui,sans-serif}
      .wda-panel-status{flex:0 0 auto;padding:7px 12px 9px 18px;border-top:1px solid var(--wda-line,rgba(137,177,220,.22));background:rgba(4,11,23,.82)}
      .wda-panel-status .wda-status{margin:0!important;min-height:14px!important}
      .wda-brand-name{white-space:nowrap}
      @media(max-width:720px){.wda-tab-view{padding:10px 9px 15px 15px}.wda-tablist{padding-left:14px}}
    `;
    shadow.appendChild(style);

    const brandName = shadow.querySelector(".wda-brand-name");
    if (brandName) brandName.textContent = "WebAtelier Canvas";
    const brandMeta = shadow.querySelector(".wda-brand-meta");
    if (brandMeta) brandMeta.innerHTML = '<span class="wda-local-dot"></span>local visual workspace';
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
