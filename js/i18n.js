// Language switcher (English / Simplified Chinese).
// Translates page text in place using the exact-text dictionary in data/zh.js.
(function () {
  const Z = window.ZH || {};
  const KEY = "jf-lang";
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  let lang = (() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "zh" || saved === "en") return saved;
    } catch (e) { /* ignore */ }
    return (navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en";
  })();

  const norm = (s) => s.replace(/\s+/g, " ").trim();

  function timeZh(h, m, ap) {
    h = Number(h);
    const hour24 = (h % 12) + (ap.toUpperCase() === "PM" ? 12 : 0);
    const part = hour24 < 12 ? "上午" : hour24 < 18 ? "下午" : "晚上";
    return `${part}${h}:${m}`;
  }

  const rules = [
    [/^(\d{1,2}):(\d{2}) ?(AM|PM)$/i, (m) => timeZh(m[1], m[2], m[3])],
    [new RegExp("^(" + DAYS.join("|") + ")s at (\\d{1,2}):(\\d{2}) ?(AM|PM)$", "i"),
      (m) => "每" + Z[m[1]].replace("星期", "周") + " " + timeZh(m[2], m[3], m[4])],
    [/^View on (.+) \u2197$/, (m) => `在 ${translate(m[1]) || m[1]} 查看 \u2197`],
    [/^\+(\d+) more$/, (m) => `还有 ${m[1]} 项`],
  ];

  // Returns the Chinese text for an English string, or null if none.
  function translate(s) {
    const core = norm(s);
    if (!core) return null;
    if (Object.prototype.hasOwnProperty.call(Z, core)) return Z[core];
    for (const [re, fn] of rules) {
      const m = re.exec(core);
      if (m) return fn(m);
    }
    return null;
  }

  const SKIP = "script, style, .lang-btn, [data-no-i18n]";
  const textOrig = new WeakMap();
  const attrOrig = new WeakMap();
  const ATTRS = ["placeholder", "aria-label", "title", "alt"];

  function doText(node) {
    const p = node.parentElement;
    if (!p || p.closest(SKIP)) return;
    const original = textOrig.has(node) ? textOrig.get(node) : node.nodeValue;
    if (lang === "zh") {
      const zh = translate(original);
      if (zh == null) return;
      if (!textOrig.has(node)) textOrig.set(node, original);
      const lead = /^\s*/.exec(original)[0];
      const trail = /\s*$/.exec(original)[0];
      node.nodeValue = lead + zh + trail;
    } else if (textOrig.has(node)) {
      node.nodeValue = textOrig.get(node);
    }
  }

  function doAttrs(elm) {
    if (elm.closest && elm.closest(SKIP)) return;
    for (const a of ATTRS) {
      if (!elm.hasAttribute || !elm.hasAttribute(a)) continue;
      const store = attrOrig.get(elm) || {};
      const original = a in store ? store[a] : elm.getAttribute(a);
      if (lang === "zh") {
        const zh = translate(original);
        if (zh == null) continue;
        store[a] = original;
        attrOrig.set(elm, store);
        elm.setAttribute(a, zh);
      } else if (a in store) {
        elm.setAttribute(a, store[a]);
      }
    }
  }

  function walk(root) {
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1) return;
    doAttrs(root);
    root.querySelectorAll("[placeholder],[aria-label],[title],[alt]").forEach(doAttrs);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (tw.nextNode()) nodes.push(tw.currentNode);
    nodes.forEach(doText);
  }

  const meta = { title: document.title, desc: null };
  function doHead() {
    const d = document.querySelector('meta[name="description"]');
    if (meta.desc == null && d) meta.desc = d.getAttribute("content");
    document.title = lang === "zh" ? translate(meta.title) || meta.title : meta.title;
    if (d) d.setAttribute("content", lang === "zh" ? translate(meta.desc) || meta.desc : meta.desc);
  }

  function updateButtons() {
    document.querySelectorAll(".lang-btn").forEach((b) => {
      const label = lang === "zh" ? "English" : "中文";
      if (b.textContent !== label) b.textContent = label;
    });
  }

  function apply() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    walk(document.body);
    doHead();
    updateButtons();
  }

  function set(next) {
    if (next === lang) return;
    lang = next;
    try { localStorage.setItem(KEY, lang); } catch (e) { /* ignore */ }
    apply();
    window.dispatchEvent(new Event("langchange"));
  }

  window.I18N = {
    get lang() { return lang; },
    locale: () => (lang === "zh" ? "zh-CN" : "en-US"),
    translate,
    set,
  };

  // Translate content added later (header/footer, calendar, gallery, toasts...).
  new MutationObserver((muts) => {
    updateButtons();
    if (lang !== "zh") return;
    for (const m of muts) m.addedNodes.forEach(walk);
  }).observe(document.body, { childList: true, subtree: true });

  document.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest(".lang-btn")) set(lang === "zh" ? "en" : "zh");
  });

  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  if (lang === "zh") apply();
})();
