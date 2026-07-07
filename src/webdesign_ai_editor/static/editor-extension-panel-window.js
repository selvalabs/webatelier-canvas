(() => {
  "use strict";

  const ACTIVE_FLAG = "__WDA_PANEL_WINDOW_ACTIVE__";
  const HOST_ID = "__wda_editor_host__";
  const STYLE_ID = "__wda_panel_window_styles__";
  const RESET_ID = "__wda_panel_window_reset__";
  const HANDLE_ID = "__wda_panel_window_resize__";
  const STORAGE_KEY = "wda-panel-window:v1";
  const MAX_BOOT_ATTEMPTS = 280;
  const MIN_WIDTH = 320;
  const MIN_HEIGHT = 260;
  const EDGE_PADDING = 8;

  if (window[ACTIVE_FLAG]) return;
  window[ACTIVE_FLAG] = true;

  const state = {
    attempts: 0,
    shadow: null,
    panel: null,
    header: null,
    drag: null,
    resize: null,
    saveTimer: 0
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

      .wda-panel-window-resize {
        position: sticky;
        right: 0;
        bottom: 0;
        z-index: 10;
        display: block;
        float: right;
        width: 18px;
        height: 18px;
        margin-top: -18px;
        cursor: nwse-resize;
        pointer-events: auto;
      }

      .wda-panel-window-resize::before {
        content: "";
        position: absolute;
        right: 4px;
        bottom: 4px;
        width: 9px;
        height: 9px;
        border-right: 2px solid rgba(148, 163, 184, 0.76);
        border-bottom: 2px solid rgba(148, 163, 184, 0.76);
      }

      .wda-panel-window-resize:hover::before {
        border-color: rgba(59, 130, 246, 0.92);
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
      reset.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        resetWindow(panel);
      });
      header.appendChild(reset);
    }

    if (!panel.querySelector(`#${HANDLE_ID}`)) {
      const handle = document.createElement("div");
      handle.id = HANDLE_ID;
      handle.className = "wda-panel-window-resize";
      handle.setAttribute("role", "separator");
      handle.setAttribute("aria-label", "Redimensionar painel");
      panel.appendChild(handle);
    }
  }

  function bindDrag(panel, header) {
    if (!header || header.dataset.wdaWindowDragBound === "true") return;
    header.dataset.wdaWindowDragBound = "true";

    header.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || isInteractive(event.target)) return;

      const rect = panel.getBoundingClientRect();
      pinToRect(panel, rect);
      state.drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      };

      panel.dataset.wdaWindowDragging = "true";
      header.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    }, true);

    header.addEventListener("pointermove", (event) => {
      const drag = state.drag;
      if (!drag || event.pointerId !== drag.pointerId) return;

      const next = clampRect({
        left: drag.left + event.clientX - drag.startX,
        top: drag.top + event.clientY - drag.startY,
        width: drag.width,
        height: drag.height
      });

      panel.style.left = `${next.left}px`;
      panel.style.top = `${next.top}px`;
      event.preventDefault();
      event.stopPropagation();
    }, true);

    const endDrag = (event) => {
      const drag = state.drag;
      if (!drag || event.pointerId !== drag.pointerId) return;
      state.drag = null;
      delete panel.dataset.wdaWindowDragging;
      try { header.releasePointerCapture?.(event.pointerId); } catch {}
      clampPanel(panel);
      saveWindow(panel);
      event.preventDefault();
      event.stopPropagation();
    };

    header.addEventListener("pointerup", endDrag, true);
    header.addEventListener("pointercancel", endDrag, true);
  }

  function bindResize(panel) {
    const handle = panel.querySelector(`#${HANDLE_ID}`);
    if (!handle || handle.dataset.wdaWindowResizeBound === "true") return;
    handle.dataset.wdaWindowResizeBound = "true";

    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const rect = panel.getBoundingClientRect();
      pinToRect(panel, rect);
      state.resize = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      };
      handle.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    }, true);

    handle.addEventListener("pointermove", (event) => {
      const resize = state.resize;
      if (!resize || event.pointerId !== resize.pointerId) return;
      const maxWidth = Math.max(MIN_WIDTH, window.innerWidth - resize.left - EDGE_PADDING);
      const maxHeight = Math.max(MIN_HEIGHT, window.innerHeight - resize.top - EDGE_PADDING);
      const width = clamp(resize.width + event.clientX - resize.startX, MIN_WIDTH, maxWidth);
      const height = clamp(resize.height + event.clientY - resize.startY, MIN_HEIGHT, maxHeight);
      panel.style.width = `${Math.round(width)}px`;
      panel.style.height = `${Math.round(height)}px`;
      event.preventDefault();
      event.stopPropagation();
    }, true);

    const endResize = (event) => {
      const resize = state.resize;
      if (!resize || event.pointerId !== resize.pointerId) return;
      state.resize = null;
      try { handle.releasePointerCapture?.(event.pointerId); } catch {}
      clampPanel(panel);
      saveWindow(panel);
      event.preventDefault();
      event.stopPropagation();
    };

    handle.addEventListener("pointerup", endResize, true);
    handle.addEventListener("pointercancel", endResize, true);
  }

  function restoreWindow(panel) {
    const stored = loadStoredWindow();
    if (!stored) {
      clampPanel(panel);
      return;
    }
    const next = clampRect(stored);
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
    panel.style.width = "326px";
    panel.style.height = "auto";
    clampPanel(panel);
  }

  function saveWindow(panel) {
    const rect = panel.getBoundingClientRect();
    const next = clampRect(rect);
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
    const next = clampRect(rect);
    panel.style.left = `${next.left}px`;
    panel.style.top = `${next.top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.width = `${next.width}px`;
    if (rect.height >= MIN_HEIGHT || panel.style.height) panel.style.height = `${next.height}px`;
  }

  function pinToRect(panel, rect) {
    const next = clampRect(rect);
    panel.style.left = `${next.left}px`;
    panel.style.top = `${next.top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.width = `${next.width}px`;
    panel.style.height = `${next.height}px`;
  }

  function clampRect(rect) {
    const viewportWidth = Math.max(MIN_WIDTH + EDGE_PADDING * 2, window.innerWidth);
    const viewportHeight = Math.max(MIN_HEIGHT + EDGE_PADDING * 2, window.innerHeight);
    const width = clamp(Math.round(rect.width), MIN_WIDTH, viewportWidth - EDGE_PADDING * 2);
    const height = clamp(Math.round(rect.height || MIN_HEIGHT), MIN_HEIGHT, viewportHeight - EDGE_PADDING * 2);
    const left = clamp(Math.round(rect.left), EDGE_PADDING, viewportWidth - width - EDGE_PADDING);
    const top = clamp(Math.round(rect.top), EDGE_PADDING, viewportHeight - height - EDGE_PADDING);
    return { left, top, width, height };
  }

  function isInteractive(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest("button, input, select, textarea, a, label, summary, [role='button'], [contenteditable='true'], .wda-panel-window-resize"));
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
