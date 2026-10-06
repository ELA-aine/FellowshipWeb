// Single-photo slots: any element with data-photo="key" can get a photo from the admin.
// The photo is stored in Supabase (`site_photos`) and shown as the element's background.
import { sb, isAdmin, formModal, toast, uploadImage } from "./backend.js";

const slots = [...document.querySelectorAll("[data-photo]")];

if (sb && slots.length) {
  const rows = new Map();
  const { data, error } = await sb.from("site_photos").select("*");
  if (error) console.warn("Photo slots unavailable (run supabase/004_site_photos.sql?):", error.message);
  else data.forEach((r) => rows.set(r.key, r));

  const btn = (label, fn) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", fn);
    return b;
  };

  function draw(el) {
    const key = el.dataset.photo;
    const row = rows.get(key);
    el.classList.toggle("has-photo", !!row);
    el.style.backgroundImage = row ? `url("${row.url}")` : "";
    if (!isAdmin) return;

    el.querySelector(":scope > .slot-tools")?.remove();
    const tools = document.createElement("div");
    tools.className = "slot-tools";
    tools.append(btn(row ? "\ud83d\udcf7 Replace photo" : "\ud83d\udcf7 Upload photo", () => upload(el)));
    if (row) tools.append(btn("Remove", () => remove(el)));
    el.append(tools);
  }

  async function dropStorage(row) {
    if (row) await sb.storage.from("gallery").remove([row.path]);
  }

  async function upload(el) {
    const key = el.dataset.photo;
    const r = await formModal({
      title: "Upload photo",
      submitLabel: "Upload",
      fields: [{ name: "file", label: "Choose a photo", type: "file", accept: "image/*", required: true }],
    });
    if (!r || !r.file[0]) return;
    toast("Uploading\u2026");
    try {
      const old = rows.get(key);
      const { path, url } = await uploadImage(r.file[0], "slots", 1600);
      const row = { key, url, path, updated_at: new Date().toISOString() };
      const { error: e } = await sb.from("site_photos").upsert(row);
      if (e) throw e;
      await dropStorage(old);
      rows.set(key, row);
      draw(el);
      toast("Photo saved.");
    } catch (e) {
      toast("Could not save photo: " + e.message + " (did you run supabase/004_site_photos.sql?)", "err");
    }
  }

  async function remove(el) {
    const key = el.dataset.photo;
    if (!confirm("Remove this photo?")) return;
    const old = rows.get(key);
    const { error: e } = await sb.from("site_photos").delete().eq("key", key);
    if (e) return toast(e.message, "err");
    await dropStorage(old);
    rows.delete(key);
    draw(el);
    toast("Photo removed.");
  }

  slots.forEach(draw);
}
