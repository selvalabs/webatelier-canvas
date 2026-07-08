(() => {
  "use strict";

  const ACTIVE_FLAG = "__WDA_PANEL_WINDOW_ACTIVE__";
  const HOST_ID = "__wda_editor_host__";
  const STYLE_ID = "__wda_panel_window_styles__";
  const RESET_ID = "__wda_panel_window_reset__";
  const STORAGE_KEY = "wda-panel-window:v4";
  const MAX_BOOT_ATTEMPTS = 280;
  const MIN_WIDTH = 320;
  const MIN_HEIGHT = 260;
  const EDGE_PADDING = 8;
  const KEEP_VISIBLE = 96;
  const DEFAULT_WIDTH = 390;
  const EDGE_HIT_SIZE = 18;
  const HEADER_HIT_HEIGHT = 68;

  if (window[ACTIVE_FLAG]) return;
  window[ACTIVE_FLAG] = true;

  const state = {
    attempts: 0,
    shadow: null,
    panel: null,
    header: null,
    interaction: null,
    saveTimer: 0,
    previousCursor: "",
    previousUserSelect: ""
  };

  function boot() {
    const shadow = document.getElementById(HOST_ID)?.shadowRoot;
    const panel = findPanel(shadow);
    if (!shadow || !panel) {
      state.attempts += 1;
      if (state.attempts < MAX_BOOT_ATTEMPTS) window.setTimeout(boot, 25);
      return;
    }

    state.shadow = shadow;
    state.panel = panel;
    state.header = findHeader(panel);

    installStyles(shadow);
    preparePanel(panel);
    installControls(panel, state.header);
    bindPointerClassifier(shadow, panel);
    restoreWindow(panel);

    window.addEventListener("resize", () => {
      clampPanel(panel);
      scheduleSave(panel);
    }, { passive: true });

    window.__WDA_PANEL_WINDOW__ = {
      reset: () => resetWindow(panel),
      save: () => saveWindow(panel),
      restore: () => restoreWindow(panel)
    };
  }

  function findPanel(shadow) {
    if (!shadow) return null;
    return shadow.querySelector(".wda-panel")
      || shadow.querySelector("aside[aria-label]")
      || shadow.querySelector('[data-wda-editor-ui="true"] aside')
      || shadow.querySelector("aside");
  }

  function findHeader(panel) {
    return panel.querySelector(".wda-header")
      || panel.querySelector("header")
      || panel.firstElementChild;
  }

  function installStyles(shadow) {
    if (shadow.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .wda-panel[data-wda-window-managed="true"] {
        min-width: ${MIN_WIDTH}px !important;
        min-height: ${MIN_HEIGHT}px !important;
        max-width: calc(100vw - ${EDGE_PADDING * 2}px) !important;
        max-height: calc(100vh - ${EDGE_PADDING * 2}px) !important;
        overflow: auto !important;
        resize: none !important;
        scrollbar-width: thin;
        scrollbar-color: rgba(148, 163, 184, 0.34) rgba(15, 23, 42, 0.10);
      }

      .wda-panel[data-wda-window-managed="true"] * {
        scrollbar-width: thin;
        scrollbar-color: rgba(148, 163, 184, 0.30) transparent;
      }

      .wda-panel[data-wda-window-managed="true"]::-webkit-scrollbar,
      .wda-panel[data-wda-window-managed="true"] *::-webkit-scrollbar {
        width: 9px;
        height: 9px;
      }

      .wda-panel[data-wda-window-managed="true"]::-webkit-scrollbar-track,
      .wda-panel[data-wda-window-managed="true"] *::-webkit-scrollbar-track {
        background: rgba(15, 23, 42, 0.08);
        border-radius: 999px;
      }

      .wda-panel[data-wda-window-managed="true"]::-webkit-scrollbar-thumb,
      .wda-panel[data-wda-window-managed="true"] *::-webkit-scrollbar-thumb {
        min-height: 32px;
        border: 2px solid transparent;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.34);
        background-clip: padding-box;
      }

      .wda-panel[data-wda-window-managed="true"]::-webkit-scrollbar-thumb:hover,
      .wda-panel[data-wda-window-managed="true"] *::-webkit-scrollbar-thumb:hover {
        background: rgba(148, 163, 184, 0.52);
        background-clip: padding-box;
      }

      .wda-panel[data-wda-window-managed="true"] .wda-header,
      .wda-panel[data-wda-window-managed="true"] header {
        cursor: grab !important;
        user-select: none;
      }

      .wda-panel[data-wda-window-managed="true"][data-wda-window-dragging="true"] .wda-header,
      .wda-panel[data-wda-window-managed="true"][data-wda-window-dragging="true"] header {
        cursor: grabbing !important;
      }

      .wda-panel[data-wda-window-managed="true"][data-wda-edge-hover="e"],
      .wda-panel[data-wda-window-managed="true"][data-wda-edge-hover="w"] {
        cursor: ew-resize !important;
      }

      .wda-panel[data-wda-window-managed="true"][data-wda-edge-hover="s"] {
        cursor: ns-resize !important;
      }

      .wda-panel[data-wda-window-managed="true"][data-wda-edge-hover="se"] {
        cursor: nwse-resize !important;
      }

      .wda-panel[data-wda-window-managed="true"][data-wda-edge-hover="sw"] {
        cursor: nesw-resize !important;
      }

      .wda-panel-window-reset {
        flex: 0 0 auto;
        min-width: 26px;
        height: 26px;
        border: 1px solid rgba(148, 163, 184, 0.34);
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.08);
        color: inherit;
        cursor: pointer;
        font: 800 12px/1 ui-sans-serif, system-ui, sans-serif;
      }

      .wda-panel-window-reset:hover {
        background: rgba(59, 130, 246, 0.16);
        border-color: rgba(59, 130, 246, 0.55);
      }
    `;
    shadow.appendChild(style);
  }

  function preparePanel(panel) {
    panel.dataset.wdaWindowManaged = "true";
    panel.style.position = "fixed";
    panel.style.boxSizing = "border-box";
    panel.style.pointerEvents = "auto";
    panel.style.maxWidth = `calc(100vw - ${EDGE_PADDING * 2}px)`;
    panel.style.maxHeight = `calc(100vh - ${EDGE_PADDING * 2}px)`;
    panel.style.transform = "none";
  }

  function installControls(panel, header) {
    if (!header || header.querySelector(`#${RESET_ID}`)) return;
    const reset = document.createElement("button");
    reset.id = RESET_ID;
    reset.type = "button";
    reset.className = "wda-panel-window-reset";
    reset.title = "Resetar posição e tamanho do painel";
    reset.textContent = "↺";
    reset.addEventListener("pointerdown", stopPointer, true);
    reset.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      resetWindow(panel);
    });
    header.appendChild(reset);
  }

  function bindPointerClassifier(shadow, panel) {
    if (shadow.__wdaPanelWindowClassifierBound) return;
    shadow.__wdaPanelWindowClassifierBound = true;

    shadow.addEventListener("pointermove", (event) => {
      if (state.interaction) return;
      const kind = classifyPointer(panel, event);
      if (kind?.type === "resize") panel.dataset.wdaEdgeHover = kind.direction;
      else delete panel.dataset.wdaEdgeHover;
    }, true);

    shadow.addEventListener("pointerleave", () => {
      if (!state.interaction) delete panel.dataset.wdaEdgeHover;
    }, true);

    shadow.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const kind = classifyPointer(panel, event);
      if (!kind) return;
      if (kind.type === "drag" && isInteractive(event.target)) return;
      startInteraction(kind, panel, event);
    }, true);
  }

  function classifyPointer(panel, event) {
    if (!(event.target instanceof Node) || !panel.contains(event.target)) return null;
    const rect = panel.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;

    const nearLeft = x - rect.left <= EDGE_HIT_SIZE;
    const nearRight = rect.right - x <= EDGE_HIT_SIZE;
    const nearBottom = rect.bottom - y <= EDGE_HIT_SIZE;

    if (nearLeft && nearBottom) return { type: "resize", direction: "sw" };
    if (nearRight && nearBottom) return { type: "resize", direction: "se" };
    if (nearLeft) return { type: "resize", direction: "w" };
    if (nearRight) return { type: "resize", direction: "e" };
    if (nearBottom) return { type: "resize", direction: "s" };

    const header = state.header;
    const inHeader = header?.contains(event.target) || y - rect.top <= HEADER_HIT_HEIGHT;
    if (inHeader) return { type: "drag", direction: null };
    return null;
  }

  function startInteraction(kind, panel, event) {
    const rect = panel.getBoundingClientRect();
    pinToRect(panel, rect);

    state.interaction = {
      kind: kind.type,
      direction: kind.direction,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    };

    panel.style.transform = "none";
    if (kind.type === "drag") panel.dataset.wdaWindowDragging = "true";
    if (kind.type === "resize") panel.dataset.wdaEdgeHover = kind.direction;
    beginDocumentCapture(cursorForInteraction(kind.type, kind.direction));

    window.addEventListener("pointermove", onWindowPointerMove, true);
    window.addEventListener("pointerup", onWindowPointerEnd, true);
    window.addEventListener("pointercancel", onWindowPointerEnd, true);

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function onWindowPointerMove(event) {
    const current = state.interaction;
    const panel = state.panel;
    if (!current || !panel || event.pointerId !== current.pointerId) return;

    panel.style.transform = "none";
    if (current.kind === "drag") {
      const next = clampMovementRect({
        left: current.left + event.clientX - current.startX,
        top: current.top + event.clientY - current.startY,
        width: current.width,
        height: current.height
      });
      panel.style.left = `${next.left}px`;
      panel.style.top = `${next.top}px`;
    } else {
      const next = resizeRectFromPointer(current, event);
      panel.style.left = `${next.left}px`;
      panel.style.top = `${next.top}px`;
      panel.style.width = `${next.width}px`;
      panel.style.height = `${next.height}px`;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function onWindowPointerEnd(event) {
    const current = state.interaction;
    const panel = state.panel;
    if (!current || !panel || event.pointerId !== current.pointerId) return;

    state.interaction = null;
    delete panel.dataset.wdaWindowDragging;
    delete panel.dataset.wdaEdgeHover;
    panel.style.transform = "none";
    endDocumentCapture();
    window.removeEventListener("pointermove", onWindowPointerMove, true);
    window.removeEventListener("pointerup", onWindowPointerEnd, true);
    window.removeEventListener("pointercancel", onWindowPointerEnd, true);
    clampPanel(panel);
    saveWindow(panel);

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function resizeRectFromPointer(resize, event) {
    const dx = event.clientX - resize.startX;
    const dy = event.clientY - resize.startY;
    const direction = resize.direction;
    const viewportWidth = Math.max(MIN_WIDTH + EDGE_PADDING * 2, window.innerWidth);
    const viewportHeight = Math.max(MIN_HEIGHT + EDGE_PADDING * 2, window.innerHeight);
    const right = resize.left + resize.width;

    let left = resize.left;
    let top = resize.top;
    let width = resize.width;
    let height = resize.height;

    if (direction.includes("e")) {
      width = clamp(resize.width + dx, MIN_WIDTH, viewportWidth - resize.left - EDGE_PADDING);
    }

    if (direction.includes("w")) {
      width = clamp(resize.width - dx, MIN_WIDTH, Math.min(viewportWidth - EDGE_PADDING * 2, right - EDGE_PADDING));
      left = right - width;
    }

    if (direction.includes("s")) {
      height = clamp(resize.height + dy, MIN_HEIGHT, viewportHeight - resize.top - EDGE_PADDING);
    }

    return clampResizeRect({ left, top, width, height });
  }

  function restoreWindow(panel) {
    const stored = loadStoredWindow();
    if (!stored) {
      clampPanel(panel);
      return;
    }
    const next = clampMovementRect(stored);
    panel.style.left = `${next.left}px`;
    panel.style.top = `${next.top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.width = `${next.width}px`;
    panel.style.height = `${next.height}px`;
    panel.style.transform = "none";
  }

  function resetWindow(panel) {
    localStorage.removeItem(STORAGE_KEY);
    panel.style.top = "12px";
    panel.style.right = "12px";
    panel.style.left = "auto";
    panel.style.bottom = "auto";
    panel.style.width = `${DEFAULT_WIDTH}px`;
    panel.style.height = "auto";
    panel.style.transform = "none";
    clampPanel(panel);
  }

  function saveWindow(panel) {
    const rect = panel.getBoundingClientRect();
    const next = clampMovementRect(rect);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      left: Math.round(next.left),
      top: Math.round(next.top),
      width: Math.round(next.width),
      height: Math.round(next.height)
    }));
  }

  function scheduleSave(panel) {
    if (state.saveTimer) window.clearTimeout(state.saveTimer);
    state.saveTimer = window.setTimeout(() => saveWindow(panel), 120);
  }

  function loadStoredWindow() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!value || typeof value !== "object") return null;
      const left = Number(value.left);
      const top = Number(value.top);
      const width = Number(value.width);
      const height = Number(value.height);
      if (![left, top, width, height].every(Number.isFinite)) return null;
      return { left, top, width, height };
    } catch {
      return null;
    }
  }

  function clampPanel(panel) {
    const rect = panel.getBoundingClientRect();
    const next = clampMovementRect(rect);
    panel.style.left = `${next.left}px`;
    panel.style.top = `${next.top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.width = `${next.width}px`;
    if (rect.height >= MIN_HEIGHT || panel.style.height) panel.style.height = `${next.height}px`;
    panel.style.transform = "none";
  }

  function pinToRect(panel, rect) {
    const next = clampMovementRect(rect);
    panel.style.left = `${next.left}px`;
    panel.style.top = `${next.top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.width = `${next.width}px`;
    panel.style.height = `${next.height}px`;
    panel.style.transform = "none";
  }

  function clampResizeRect(rect) {
    const viewportWidth = Math.max(MIN_WIDTH + EDGE_PADDING * 2, window.innerWidth);
    const viewportHeight = Math.max(MIN_HEIGHT + EDGE_PADDING * 2, window.innerHeight);
    const width = clamp(Math.round(rect.width), MIN_WIDTH, viewportWidth - EDGE_PADDING * 2);
    const height = clamp(Math.round(rect.height || MIN_HEIGHT), MIN_HEIGHT, viewportHeight - EDGE_PADDING * 2);
    const left = clamp(Math.round(rect.left), EDGE_PADDING, viewportWidth - width - EDGE_PADDING);
    const top = clamp(Math.round(rect.top), EDGE_PADDING, viewportHeight - Math.min(height, KEEP_VISIBLE) - EDGE_PADDING);
    return { left, top, width, height };
  }

  function clampMovementRect(rect) {
    const viewportWidth = Math.max(MIN_WIDTH + EDGE_PADDING * 2, window.innerWidth);
    const viewportHeight = Math.max(MIN_HEIGHT + EDGE_PADDING * 2, window.innerHeight);
    const width = clamp(Math.round(rect.width || DEFAULT_WIDTH), MIN_WIDTH, viewportWidth - EDGE_PADDING * 2);
    const height = clamp(Math.round(rect.height || MIN_HEIGHT), MIN_HEIGHT, viewportHeight - EDGE_PADDING * 2);
    const left = clamp(Math.round(rect.left), KEEP_VISIBLE - width, viewportWidth - KEEP_VISIBLE);
    const top = clamp(Math.round(rect.top), KEEP_VISIBLE - height, viewportHeight - KEEP_VISIBLE);
    return { left, top, width, height };
  }

  function beginDocumentCapture(cursor) {
    state.previousCursor = document.documentElement.style.cursor;
    state.previousUserSelect = document.documentElement.style.userSelect;
    document.documentElement.style.cursor = cursor;
    document.documentElement.style.userSelect = "none";
  }

  function endDocumentCapture() {
    document.documentElement.style.cursor = state.previousCursor;
    document.documentElement.style.userSelect = state.previousUserSelect;
  }

  function cursorForInteraction(kind, direction) {
    if (kind === "drag") return "grabbing";
    if (direction === "s") return "ns-resize";
    if (direction === "sw") return "nesw-resize";
    if (direction === "se") return "nwse-resize";
    return "ew-resize";
  }

  function isInteractive(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest("button, input, select, textarea, a, label, summary, [role='button'], [contenteditable='true']"));
  }

  function stopPointer(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
