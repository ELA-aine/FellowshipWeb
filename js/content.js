// Editable page text. Every [data-edit="key"] element can be overridden from the
// Supabase `site_texts` table. Admins get an "Edit text" mode to change them in place.
import { sb, isAdmin, formModal, toast } from "./backend.js";

const els = [...document.querySelectorAll("[data-edit]")];

if (sb && els.length) {
  const I = window.I18N;
  const rows = new Map();          // key -> { en, zh }
  const touched = new WeakSet();   // elements currently showing an override
  const lang = () => (I ? I.lang : "en");

  // Remember each block's original English text (before any translation/override).
  els.forEach((el) => {
    el.dataset.def = I && I.originalText ? I.originalText(el) : el.textContent.trim();
  });

  const pick = (row) => (lang() === "zh" ? row.zh || row.en : row.en);

  function apply(el) {
    const row = rows.get(el.dataset.edit);
    const text = row ? pick(row) : null;
    if (text) {
      if (el.textContent !== text) el.textContent = text;
      touched.add(el);
    } else if (touched.has(el)) {
      el.textContent = el.dataset.def; // back to default (i18n re-translates it if needed)
      touched.delete(el);
    }
  }
  const applyAll = () => els.forEach(apply);

  const { data, error } = await sb.from("site_texts").select("key,en,zh");
  if (error) console.warn("Editable text unavailable (run supabase/003_site_texts.sql?):", error.message);
  else data.forEach((r) => rows.set(r.key, { en: r.en, zh: r.zh }));
  applyAll();
  window.addEventListener("langchange", applyAll);

  /* ---------- Admin: edit mode ---------- */
  if (isAdmin) {
    const bar = document.querySelector(".admin-bar");
    if (bar) {
      const btn = document.createElement("button");
      btn.textContent = "\u270e Edit text";
      btn.addEventListener("click", () => {
        const on = document.body.classList.toggle("edit-mode");
        btn.textContent = on ? "\u2713 Done editing" : "\u270e Edit text";
        if (on) toast("Click any highlighted text to edit it.");
      });
      bar.insertBefore(btn, bar.lastElementChild);
    }

    document.addEventListener("click", (e) => {
      if (!document.body.classList.contains("edit-mode")) return;
      const el = e.target.closest("[data-edit]");
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      edit(el);
    }, true);

    async function edit(el) {
      const key = el.dataset.edit;
      const def = el.dataset.def;
      const row = rows.get(key);
      const defZh = (I && I.translate(def)) || "";
      const r = await formModal({
        title: "Edit text",
        submitLabel: "Save",
        fields: [
          { name: "en", label: "English", type: "textarea", required: true },
          { name: "zh", label: "\u4e2d\u6587 (Chinese) \u2013 update this too if you changed the English", type: "textarea" },
        ],
        values: { en: row?.en ?? def, zh: row?.zh ?? defZh },
      });
      if (!r) return;

      const en = r.en.trim() === def ? null : r.en.trim();
      const zh = r.zh.trim() === defZh ? null : r.zh.trim() || null;

      if (!en && !zh) {
        const { error: e1 } = await sb.from("site_texts").delete().eq("key", key);
        if (e1) return toast("Could not reset: " + e1.message, "err");
        rows.delete(key);
        toast("Back to the default text.");
      } else {
        const { error: e2 } = await sb.from("site_texts").upsert({ key, en, zh, updated_at: new Date().toISOString() });
        if (e2) return toast("Could not save: " + e2.message + " (did you run supabase/003_site_texts.sql?)", "err");
        rows.set(key, { en, zh });
        toast("Saved.");
      }
      apply(el);
    }
  }
}
