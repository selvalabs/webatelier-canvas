(() => {
  "use strict";
  if (window.__WDA_CSS_LEARNING_BASE__) return;
  window.__WDA_CSS_LEARNING_BASE__ = true;
  let attempts = 0;
  function boot() {
    const shadow = document.getElementById("__wda_editor_host__")?.shadowRoot;
    if (!shadow) {
      attempts += 1;
      if (attempts < 240) window.setTimeout(boot, 25);
      return;
    }
    if (shadow.getElementById("__wda_css_learning_styles__")) return;
    const style = document.createElement("style");
    style.id = "__wda_css_learning_styles__";
    style.textContent = `
      .wda-css-learning{margin:0 0 10px;padding:10px;border:1px solid var(--wda-line);border-radius:11px;background:rgba(17,29,48,.56)}
      .wda-css-learning__head{display:grid;gap:7px;margin-bottom:10px}.wda-css-learning__title,.wda-css-group__title{color:#a8c8e8;font:750 10px/1.2 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase}.wda-css-learning__intro,.wda-css-control__help{margin:0;color:var(--wda-muted);font:550 9px/1.5 ui-sans-serif,system-ui,sans-serif}
      .wda-css-learning__search,.wda-css-control__input,.wda-css-control__select{width:100%;height:31px;border:1px solid var(--wda-line);border-radius:8px;background:rgba(4,11,23,.72);color:var(--wda-ink);padding:5px 8px;font:600 9px/1 ui-monospace,monospace}.wda-css-learning__search:focus,.wda-css-control__input:focus,.wda-css-control__select:focus{outline:2px solid var(--wda-blue);outline-offset:1px}
      .wda-css-group{margin:0 0 9px}.wda-css-group__title{margin:0 0 6px;color:var(--wda-cyan)}.wda-css-control{display:grid;gap:6px;margin:0 0 7px;padding:9px;border:1px solid rgba(137,177,220,.16);border-radius:9px;background:rgba(3,9,19,.48)}.wda-css-control[hidden]{display:none}.wda-css-control__top{display:flex;justify-content:space-between;gap:8px}.wda-css-control__name{color:#addaff;font:720 10px/1.3 ui-monospace,monospace}.wda-css-control__reset{border:0;background:transparent;color:var(--wda-muted);cursor:pointer;font:700 9px/1 ui-sans-serif,system-ui,sans-serif}.wda-css-control__reset:hover{color:var(--wda-ink)}
      .wda-css-control__example,.wda-css-control__meta{color:#7890aa;font:500 8px/1.35 ui-monospace,monospace}.wda-css-control__values{display:grid;grid-template-columns:1fr 88px;gap:7px;align-items:center}.wda-css-control__range{width:100%;accent-color:var(--wda-cyan)}.wda-css-control__meta{display:flex;justify-content:space-between;gap:8px}.wda-css-learning__empty{padding:14px;color:var(--wda-muted);text-align:center;font:550 10px/1.5 ui-sans-serif,system-ui,sans-serif}
    `;
    shadow.appendChild(style);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
