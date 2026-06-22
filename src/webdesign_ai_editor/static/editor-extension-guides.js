(() => {
  "use strict";

  const editorWindow = window;
  if (editorWindow.__WDA_GUIDES_ACTIVE__) return;
  editorWindow.__WDA_GUIDES_ACTIVE__ = true;

  const state = {
    api: null,
    selected: null,
    enabled: true,
    grid: false,
    threshold: 6,
    gridSize: 8,
    overlay: null,
    frame: 0,
    tracking: false,
    attempts: 0
  };

  function boot() {
    const api = editorWindow.__WDA_EXTENSION_API__;
    const shadow = document.getElementById("__wda_editor_host__")?.shadowRoot;
    if (!api || !shadow) {
      state.attempts += 1;
      if (state.attempts < 200) window.setTimeout(boot, 25);
      return;
    }
    state.api = api;
    state.selected = api.getSelectedElement();
    installOverlay();
    installControls(shadow);
    window.addEventListener("wda:selection-changed", (event) => {
      state.selected = event.detail?.element || null;
      schedule();
    });
    window.addEventListener("pointerdown", () => {
      state.tracking = true;
      loop();
    }, true);
    window.addEventListener("pointerup", () => {
      state.tracking = false;
      schedule();
    }, true);
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    schedule();
  }

  function installOverlay() {
    let overlay = document.getElementById("__wda_guides_overlay__");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "__wda_guides_overlay__";
      overlay.dataset.wdaEditorUi = "true";
      overlay.style.cssText = "position:fixed;inset:0;z-index:2147483645;pointer-events:none;overflow:hidden";
      document.documentElement.appendChild(overlay);
    }
    state.overlay = overlay;
  }

  function installControls(shadow) {
    if (shadow.getElementById("__wda_guides_controls__")) return;
    const anchor = shadow.getElementById("__wda_transform_precision__")
      || shadow.getElementById("__wda_selection_inspector__");
    if (!anchor) return;
    const section = document.createElement("section");
    section.id = "__wda_guides_controls__";
    section.className = "wda-inspector-v2";
    section.innerHTML = `
      <div class="wda-inspector-v2__header">
        <span class="wda-inspector-v2__title">Guias</span>
        <span class="wda-inspector-v2__health" data-guide-status>ativo</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
        <label class="wda-field"><span><input type="checkbox" data-guides checked> Alinhamento</span></label>
        <label class="wda-field"><span><input type="checkbox" data-grid> Grid</span></label>
        <label class="wda-field"><span>Threshold</span><select class="wda-select" data-threshold><option>4</option><option selected>6</option><option>8</option><option>12</option></select></label>
        <label class="wda-field"><span>Grid px</span><select class="wda-select" data-grid-size><option>4</option><option selected>8</option><option>10</option><option>16</option><option>24</option></select></label>
      </div>
      <p class="wda-hint">Magenta alinha bordas e centros. Azul mede o vizinho mais próximo.</p>
    `;
    anchor.insertAdjacentElement("afterend", section);
    section.querySelector("[data-guides]")?.addEventListener("change", (event) => {
      state.enabled = Boolean(event.target?.checked);
      schedule();
    });
    section.querySelector("[data-grid]")?.addEventListener("change", (event) => {
      state.grid = Boolean(event.target?.checked);
      schedule();
    });
    section.querySelector("[data-threshold]")?.addEventListener("change", (event) => {
      state.threshold = Number(event.target?.value) || 6;
      schedule();
    });
    section.querySelector("[data-grid-size]")?.addEventListener("change", (event) => {
      state.gridSize = Number(event.target?.value) || 8;
      schedule();
    });
  }

  function loop() {
    if (state.frame) return;
    const tick = () => {
      state.frame = 0;
      render();
      if (state.tracking) state.frame = requestAnimationFrame(tick);
    };
    state.frame = requestAnimationFrame(tick);
  }

  function schedule() {
    if (state.frame) return;
    state.frame = requestAnimationFrame(() => {
      state.frame = 0;
      render();
    });
  }

  function render() {
    const overlay = state.overlay;
    if (!overlay) return;
    overlay.replaceChildren();
    if (state.grid) drawGrid(overlay);
    const selected = state.selected;
    if (!state.enabled || !selected?.isConnected) {
      setStatus(state.enabled ? "ativo" : "pausado", false);
      return;
    }

    const target = selected.getBoundingClientRect();
    const candidates = collectCandidates(selected);
    const vertical = nearestGuide(
      [target.left, target.left + target.width / 2, target.right],
      [window.innerWidth / 2, ...candidates.flatMap((element) => {
        const rect = element.getBoundingClientRect();
        return [rect.left, rect.left + rect.width / 2, rect.right];
      })]
    );
    const horizontal = nearestGuide(
      [target.top, target.top + target.height / 2, target.bottom],
      [window.innerHeight / 2, ...candidates.flatMap((element) => {
        const rect = element.getBoundingClientRect();
        return [rect.top, rect.top + rect.height / 2, rect.bottom];
      })]
    );
    if (vertical !== null) drawLine(overlay, "vertical", vertical);
    if (horizontal !== null) drawLine(overlay, "horizontal", horizontal);
    drawNearestDistance(overlay, target, candidates);
    setStatus(vertical !== null || horizontal !== null ? "alinhado" : "ativo", vertical !== null || horizontal !== null);
  }

  function collectCandidates(selected) {
    const result = [];
    for (const element of document.querySelectorAll("body *")) {
      if (result.length >= 180) break;
      if (!(element instanceof HTMLElement || element instanceof SVGElement)) continue;
      if (element === selected || element.contains(selected) || selected.contains(element)) continue;
      if (element.hasAttribute("data-wda-editor-ui") || element.closest("#__wda_editor_host__, .wda-moveable, .moveable-control-box")) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2 || rect.bottom < -150 || rect.top > innerHeight + 150 || rect.right < -150 || rect.left > innerWidth + 150) continue;
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
      result.push(element);
    }
    return result;
  }

  function nearestGuide(targetValues, guideValues) {
    let best = null;
    let distance = Infinity;
    for (const target of targetValues) {
      for (const guide of guideValues) {
        const next = Math.abs(target - guide);
        if (next < distance) {
          distance = next;
          best = guide;
        }
      }
    }
    return distance <= state.threshold ? best : null;
  }

  function drawGrid(overlay) {
    const layer = document.createElement("div");
    layer.style.cssText = `position:absolute;inset:0;background-image:linear-gradient(rgba(56,189,248,.13) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,.13) 1px,transparent 1px);background-size:${state.gridSize}px ${state.gridSize}px`;
    overlay.appendChild(layer);
  }

  function drawLine(overlay, axis, value) {
    const line = document.createElement("div");
    line.style.cssText = axis === "vertical"
      ? `position:absolute;left:${Math.round(value)}px;top:0;bottom:0;width:1px;background:#f472b6`
      : `position:absolute;top:${Math.round(value)}px;left:0;right:0;height:1px;background:#f472b6`;
    overlay.appendChild(line);
  }

  function drawNearestDistance(overlay, target, candidates) {
    let best = null;
    for (const candidate of candidates) {
      const rect = candidate.getBoundingClientRect();
      const overlap = Math.min(target.bottom, rect.bottom) - Math.max(target.top, rect.top);
      if (overlap <= 0) continue;
      const leftGap = target.left - rect.right;
      const rightGap = rect.left - target.right;
      const gap = leftGap >= 0 ? leftGap : rightGap >= 0 ? rightGap : -1;
      if (gap < 0 || gap > 160 || (best && gap >= best.gap)) continue;
      best = {
        gap,
        from: leftGap >= 0 ? rect.right : target.right,
        to: leftGap >= 0 ? target.left : rect.left,
        y: Math.max(target.top, rect.top) + overlap / 2
      };
    }
    if (!best) return;
    const line = document.createElement("div");
    line.style.cssText = `position:absolute;left:${best.from}px;top:${best.y}px;width:${best.to - best.from}px;height:1px;background:#38bdf8`;
    const label = document.createElement("span");
    label.textContent = `${Math.round(best.gap)} px`;
    label.style.cssText = `position:absolute;left:${(best.from + best.to) / 2}px;top:${best.y}px;transform:translate(-50%,-50%);padding:2px 5px;border-radius:999px;background:#082f49;color:#e0f2fe;font:700 10px/1.4 ui-monospace,monospace`;
    overlay.append(line, label);
  }

  function setStatus(text, aligned) {
    const status = document.getElementById("__wda_editor_host__")?.shadowRoot?.querySelector("[data-guide-status]");
    if (!status) return;
    status.textContent = text;
    status.setAttribute("data-health", aligned ? "unique" : "");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
