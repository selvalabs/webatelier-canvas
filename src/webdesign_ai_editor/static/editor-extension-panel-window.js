(() => {
  "use strict";

  const ACTIVE_FLAG = "__WDA_PANEL_WINDOW_ACTIVE__";
  const HOST_ID = "__wda_editor_host__";
  const STYLE_ID = "__wda_panel_window_styles__";
  const RESET_ID = "__wda_panel_window_reset__";
  const HANDLE_CLASS = "wda-panel-window-handle";
  const STORAGE_KEY = "wda-panel-window:v3";
  const MAX_BOOT_ATTEMPTS = 280;
  const MIN_WIDTH = 320;
  const MIN_HEIGHT = 260;
  const EDGE_PADDING = 8;
  const KEEP_VISIBLE = 84;
  const DEFAULT_WIDTH = 380;
  const HANDLE_DIRECTIONS = ["w", "e", "s", "sw", "se"];

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
    bindDrag(panel, state.header);
    bindResize(panel);
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
        cursor: grab;
        user-select: none;
      }

      .wda-panel[data-wda-window-managed="true"][data-wda-window-dragging="true"] .wda-header,
      .wda-panel[data-wda-window-managed="true"][data-wda-window-dragging="true"] header {
        cursor: grabbing;
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

      .${HANDLE_CLASS} {
        position: absolute;
        z-index: 2147483647;
        display: block;
        pointer-events: auto;
        touch-action: none;
      }

      .${HANDLE_CLASS}[data-wda-window-resize="e"] {
        top: 40px;
        right: 0;
        bottom: 22px;
        width: 12px;
        cursor: ew-resize;
      }

      .${HANDLE_CLASS}[data-wda-window-resize="w"] {
        top: 40px;
        left: 0;
        bottom: 22px;
        width: 12px;
        cursor: ew-resize;
      }

      .${HANDLE_CLASS}[data-wda-window-resize="s"] {
        left: 24px;
        right: 24px;
        bottom: 0;
        height: 12px;
        cursor: ns-resize;
      }

      .${HANDLE_CLASS}[data-wda-window-resize="se"],
      .${HANDLE_CLASS}[data-wda-window-resize="sw"] {
        bottom: 0;
        width: 24px;
        height: 24px;
        cursor: nwse-resize;
      }

      .${HANDLE_CLASS}[data-wda-window-resize="se"] { right: 0; }
      .${HANDLE_CLASS}[data-wda-window-resize="sw"] { left: 0; cursor: nesw-resize; }

      .${HANDLE_CLASS}[data-wda-window-resize="e"]::before,
      .${HANDLE_CLASS}[data-wda-window-resize="w"]::before {
        content: "";
        position: absolute;
        top: 14px;
        bottom: 14px;
        width: 2px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0);
        transition: background 120ms ease;
      }

      .${HANDLE_CLASS}[data-wda-window-resize="e"]::before { right: 4px; }
      .${HANDLE_CLASS}[data-wda-window-resize="w"]::before { left: 4px; }

      .${HANDLE_CLASS}[data-wda-window-resize="s"]::before {
        content: "";
        position: absolute;
        right: 18px;
        bottom: 4px;
        left: 18px;
        height: 2px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0);
        transition: background 120ms ease;
      }

      .${HANDLE_CLASS}[data-wda-window-resize="se"]::before,
      .${HANDLE_CLASS}[data-wda-window-resize="sw"]::before {
        content: "";
        position: absolute;
        bottom: 6px;
        width: 10px;
        height: 10px;
        opacity: 0.76;
      }

      .${HANDLE_CLASS}[data-wda-window-resize="se"]::before {
        right: 6px;
        border-right: 2px solid rgba(148, 163, 184, 0.76);
        border-bottom: 2px solid rgba(148, 163, 184, 0.76);
      }

      .${HANDLE_CLASS}[data-wda-window-resize="sw"]::before {
        left: 6px;
        border-left: 2px solid rgba(148, 163, 184, 0.76);
        border-bottom: 2px solid rgba(148, 163, 184, 0.76);
      }

      .${HANDLE_CLASS}:hover::before,
      .${HANDLE_CLASS}[data-active="true"]::before {
        background: rgba(96, 165, 250, 0.72) !important;
        border-color: rgba(96, 165, 250, 0.92) !important;
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
  }

  function installControls(panel, header) {
    if (header && !header.querySelector(`#${RESET_ID}`)) {
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

    for (const direction of HANDLE_DIRECTIONS) {
      if (panel.querySelector(`.${HANDLE_CLASS}[data-wda-window-resize="${direction}"]`)) continue;
      const handle = document.createElement("div");
      handle.className = HANDLE_CLASS;
      handle.dataset.wdaWindowResize = direction;
      handle.setAttribute("role", "separator");
      handle.setAttribute("aria-label", labelForDirection(direction));
      panel.appendChild(handle);
    }
  }

  function bindDrag(panel, header) {
    if (!header || header.dataset.wdaWindowDragBound === "true") return;
    header.dataset.wdaWindowDragBound = "true";

    header.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || isInteractive(event.target)) return;
      startInteraction("drag", panel, event, null);
    }, true);
  }

  function bindResize(panel) {
    for (const handle of panel.querySelectorAll(`.${HANDLE_CLASS}`)) {
      if (handle.dataset.wdaWindowResizeBound === "true") continue;
      handle.dataset.wdaWindowResizeBound = "true";

      handle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        startInteraction("resize", panel, event, handle.dataset.wdaWindowResize || "se", handle);
      }, true);
    }
  }

  function startInteraction(kind, panel, event, direction, handle = null) {
    const rect = panel.getBoundingClientRect();
    pinToRect(panel, rect);

    state.interaction = {
      kind,
      direction,
      handle,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    };

    if (kind === "drag") panel.dataset.wdaWindowDragging = "true";
    if (handle) handle.dataset.active = "true";
    beginDocumentCapture(cursorForInteraction(kind, direction));

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
    if (current.handle) delete current.handle.dataset.active;
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
      const maxWidth = viewportWidth - resize.left - EDGE_PADDING;
      width = clamp(resize.width + dx, MIN_WIDTH, maxWidth);
    }

    if (direction.includes("w")) {
      const maxWidth = Math.min(viewportWidth - EDGE_PADDING * 2, right - EDGE_PADDING);
      width = clamp(resize.width - dx, MIN_WIDTH, maxWidth);
      left = right - width;
    }

    if (direction.includes("s")) {
      const maxHeight = viewportHeight - resize.top - EDGE_PADDING;
      height = clamp(resize.height + dy, MIN_HEIGHT, maxHeight);
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
  }

  function resetWindow(panel) {
    localStorage.removeItem(STORAGE_KEY);
    panel.style.top = "12px";
    panel.style.right = "12px";
    panel.style.left = "auto";
    panel.style.bottom = "auto";
    panel.style.width = `${DEFAULT_WIDTH}px`;
    panel.style.height = "auto";
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
  }

  function pinToRect(panel, rect) {
    const next = clampMovementRect(rect);
    panel.style.left = `${next.left}px`;
    panel.style.top = `${next.top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.width = `${next.width}px`;
    panel.style.height = `${next.height}px`;
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

  function labelForDirection(direction) {
    if (direction === "e") return "Ajustar largura pela direita";
    if (direction === "w") return "Ajustar largura pela esquerda";
    if (direction === "s") return "Ajustar altura";
    if (direction === "sw") return "Ajustar largura e altura pelo canto inferior esquerdo";
    return "Ajustar largura e altura pelo canto inferior direito";
  }

  function isInteractive(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest("button, input, select, textarea, a, label, summary, [role='button'], [contenteditable='true'], ." + HANDLE_CLASS));
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
