(() => {
  "use strict";
  if (window.__WDA_JS_HUB_BEHAVIOR_ACTIVE__) return;
  window.__WDA_JS_HUB_BEHAVIOR_ACTIVE__ = true;

  const revealObserver = "IntersectionObserver" in window
    ? new IntersectionObserver(onReveal, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 })
    : null;

  function boot() {
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    observeReveals(document);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element) observeReveals(node);
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function onClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const accordion = target.closest(".wda-tool-accordion-trigger");
    if (accordion instanceof HTMLButtonElement) {
      event.preventDefault();
      const panel = accordion.nextElementSibling;
      if (panel instanceof HTMLElement && panel.classList.contains("wda-tool-accordion-panel")) {
        const open = panel.style.display !== "none";
        panel.style.display = open ? "none" : "block";
        accordion.setAttribute("aria-expanded", String(!open));
      }
      return;
    }

    const tab = target.closest(".wda-tool-tab-button");
    if (tab instanceof HTMLButtonElement) {
      event.preventDefault();
      const root = tab.closest(".wda-tool-tabs");
      if (!root) return;
      const buttons = Array.from(root.querySelectorAll(".wda-tool-tab-button"));
      const panels = Array.from(root.querySelectorAll(".wda-tool-tab-panel"));
      const activeIndex = buttons.indexOf(tab);
      buttons.forEach((button, index) => {
        button.setAttribute("aria-selected", String(index === activeIndex));
        if (button instanceof HTMLElement) button.style.backgroundColor = index === activeIndex ? "#e2e8f0" : "";
      });
      panels.forEach((panel, index) => {
        if (panel instanceof HTMLElement) panel.style.display = index === activeIndex ? "block" : "none";
      });
      return;
    }

    const modalOpen = target.closest(".wda-tool-modal-open");
    if (modalOpen instanceof HTMLButtonElement) {
      event.preventDefault();
      const layer = modalOpen.closest(".wda-tool-modal-widget")?.querySelector(".wda-tool-modal-layer");
      if (layer instanceof HTMLElement) layer.style.display = "block";
      return;
    }

    const modalClose = target.closest(".wda-tool-modal-close");
    if (modalClose instanceof HTMLButtonElement) {
      event.preventDefault();
      const layer = modalClose.closest(".wda-tool-modal-layer");
      if (layer instanceof HTMLElement) layer.style.display = "none";
      return;
    }

    if (target.classList.contains("wda-tool-modal-layer")) {
      target.style.display = "none";
      return;
    }

    const menuToggle = target.closest(".wda-tool-menu-toggle");
    if (menuToggle instanceof HTMLButtonElement) {
      event.preventDefault();
      const list = menuToggle.nextElementSibling;
      if (list instanceof HTMLElement && list.classList.contains("wda-tool-menu-list")) {
        const open = list.style.display !== "none";
        list.style.display = open ? "none" : "block";
        menuToggle.setAttribute("aria-expanded", String(!open));
      }
    }
  }

  function onKeyDown(event) {
    if (event.key !== "Escape") return;
    for (const layer of document.querySelectorAll(".wda-tool-modal-layer")) {
      if (layer instanceof HTMLElement) layer.style.display = "none";
    }
    for (const menu of document.querySelectorAll(".wda-tool-menu-list")) {
      if (menu instanceof HTMLElement) menu.style.display = "none";
    }
  }

  function observeReveals(root) {
    const candidates = [];
    if (root.matches?.(".wda-tool-reveal")) candidates.push(root);
    candidates.push(...root.querySelectorAll?.(".wda-tool-reveal") || []);
    for (const element of candidates) {
      if (!(element instanceof HTMLElement) || element.dataset.wdaRevealObserved === "true") continue;
      element.dataset.wdaRevealObserved = "true";
      if (revealObserver) revealObserver.observe(element);
      else revealElement(element);
    }
  }

  function onReveal(entries) {
    for (const entry of entries) {
      if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue;
      revealElement(entry.target);
      revealObserver?.unobserve(entry.target);
    }
  }

  function revealElement(element) {
    element.style.opacity = "1";
    element.style.transform = "none";
  }

  window.__WDA_JS_HUB_BEHAVIOR__ = {
    refresh: () => observeReveals(document)
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
