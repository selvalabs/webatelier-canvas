(() => {
  "use strict";
  if (window.__WDA_ASSETS_BASE__) return;
  window.__WDA_ASSETS_BASE__ = true;
  let attempts = 0;
  function boot() {
    const shadow = document.getElementById("__wda_editor_host__")?.shadowRoot;
    if (!shadow) {
      attempts += 1;
      if (attempts < 240) window.setTimeout(boot, 25);
      return;
    }
    if (shadow.getElementById("__wda_assets_styles__")) return;
    const style = document.createElement("style");
    style.id = "__wda_assets_styles__";
    style.textContent = `
      .wda-assets{margin:0 0 10px;padding:10px;border:1px solid var(--wda-line);border-radius:11px;background:rgba(17,29,48,.56)}.wda-assets__title{margin:0 0 4px;color:#a8c8e8;font:750 10px/1.2 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase}.wda-assets__intro{margin:0 0 10px;color:var(--wda-muted);font:550 10px/1.5 ui-sans-serif,system-ui,sans-serif}.wda-assets__grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.wda-assets__field{display:grid;gap:4px;min-width:0}.wda-assets__field[data-wide=true]{grid-column:1/-1}.wda-assets__field span{color:var(--wda-muted);font:700 9px/1.3 ui-sans-serif,system-ui,sans-serif}.wda-assets__input,.wda-assets__textarea{width:100%;border:1px solid var(--wda-line);border-radius:8px;background:rgba(4,11,23,.72);color:var(--wda-ink);padding:6px 8px;font:600 10px/1.35 ui-sans-serif,system-ui,sans-serif}.wda-assets__input{height:32px}.wda-assets__textarea{min-height:64px;resize:vertical}.wda-assets__preview{display:flex;align-items:center;gap:9px;padding:8px;border:1px dashed rgba(137,177,220,.24);border-radius:9px}.wda-assets__preview img{width:32px;height:32px;object-fit:contain;border-radius:6px;background:#fff}.wda-assets__preview span{color:var(--wda-muted);font:550 9px/1.4 ui-sans-serif,system-ui,sans-serif}.wda-assets__actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.wda-assets__file{display:none}.wda-assets__status{min-height:15px;margin-top:7px;color:var(--wda-muted);font:550 9px/1.4 ui-sans-serif,system-ui,sans-serif}.wda-assets__status[data-kind=error]{color:#ff9b89}.wda-assets__status[data-kind=success]{color:#6ce7c9}
    `;
    shadow.appendChild(style);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
