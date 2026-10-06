// Keeps page headings (h1/h2/h3) on a single line.
// CSS stops them wrapping; if one is wider than its box, shrink the font just enough.
// If it still can't fit at the minimum size, let it wrap instead of being cut off.
(function () {
  document.documentElement.classList.add("js-fit");
  const SEL = "main h1, main h2, main h3";
  const MIN_SCALE = 0.6;

  function fit(el) {
    el.style.fontSize = "";
    el.style.whiteSpace = "";
    const avail = el.clientWidth;
    const need = el.scrollWidth;
    if (!avail || need <= avail + 1) return;

    const base = parseFloat(getComputedStyle(el).fontSize);
    const scale = Math.max(MIN_SCALE, (avail / need) * 0.98);
    el.style.fontSize = base * scale + "px";
    if (el.scrollWidth > el.clientWidth + 1) {
      el.style.fontSize = "";
      el.style.whiteSpace = "normal"; // last resort: wrap rather than clip
    }
  }

  let queued = false;
  function fitAll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      document.querySelectorAll(SEL).forEach(fit);
    });
  }

  fitAll();
  window.addEventListener("load", fitAll);
  window.addEventListener("resize", fitAll);
  window.addEventListener("langchange", fitAll);
  window.addEventListener("textchange", fitAll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
  new MutationObserver(fitAll).observe(document.body, { childList: true, subtree: true, characterData: true });
})();
