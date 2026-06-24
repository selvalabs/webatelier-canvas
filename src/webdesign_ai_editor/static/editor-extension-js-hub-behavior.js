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
    if (accordion instanceof HTMLButton