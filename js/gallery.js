import { sb, isAdmin, formModal, toast } from "./backend.js";

const G = window.GALLERY || { albums: [], photos: [] };
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const PHOTO_CATS = ["Worship", "Community", "Study", "Service", "Events", "Other"];
let dbPhotos = [];
let dbAlbums = [];

async function loadDb() {
  if (!sb) return;
  const [p, a] = await Promise.all([
    sb.from("photos").select("*").order("created_at", { ascending: false }),
    sb.from("albums").select("*").order("created_at", { ascending: false }),
  ]);
  if (!p.error) dbPhotos = p.data;
  if (!a.error) dbAlbums = a.data;
}

/* ---------- Lightbox ---------- */
const lb = $("lightbox");
const lbImg = lb.querySelector("img");
const lbCap = lb.querySelector("p");
let visible = [];
let idx = 0;
const show = (i) => {
  idx = (i + visible.length) % visible.length;
  lbImg.src = visible[idx].src;
  lbImg.alt = visible[idx].alt || "";
  lbCap.textContent = visible[idx].caption || "";
};
const closeLb = () => lb.classList.remove("open");
lb.querySelector(".lb-close").addEventListener("click", closeLb);
lb.querySelector(".lb-prev").addEventListener("click", () => show(idx - 1));
lb.querySelector(".lb-next").addEventListener("click", () => show(idx + 1));
lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
document.addEventListener("keydown", (e) => {
  if (!lb.classList.contains("open")) return;
  if (e.key === "Escape") closeLb();
  if (e.key === "ArrowLeft") show(idx - 1);
  if (e.key === "ArrowRight") show(idx + 1);
});

/* ---------- Render ---------- */
let currentCat = "All";

function renderAlbums() {
  const box = $("albums");
  const section = $("albums-section");
  box.innerHTML = "";
  const all = [
    ...dbAlbums.map((a) => ({ ...a, db: true })),
    ...(G.albums || []).map((a) => ({ ...a, cover_url: a.cover, db: false })),
  ];
  section.hidden = !all.length;
  all.forEach((a) => {
    const wrap = el("div", "album-wrap");
    const card = el("a", "album");
    card.href = a.url;
    card.target = "_blank";
    card.rel = "noopener";
    const img = el("img");
    img.src = a.cover_url || "images/gallery/sample-1.svg";
    img.alt = a.title;
    img.loading = "lazy";
    const body = el("div", "album-body");
    body.append(el("h3", "", a.title), el("p", "", a.description || ""), el("span", "album-link", `View on ${a.provider || "the web"} \u2197`));
    card.append(img, body);
    wrap.append(card);
    if (isAdmin && a.db) {
      const del = el("button", "del-btn", "\u00d7");
      del.title = "Remove this album link";
      del.addEventListener("click", async () => {
        if (!confirm(`Remove album "${a.title}"?`)) return;
        const { error } = await sb.from("albums").delete().eq("id", a.id);
        if (error) return toast(error.message, "err");
        await reload();
      });
      wrap.append(del);
    }
    box.append(wrap);
  });
}

function renderPhotos() {
  const all = [
    ...dbPhotos.map((p) => ({ id: p.id, path: p.path, src: p.url, alt: p.caption || "Fellowship photo", caption: p.caption || "", category: p.category || "Other", db: true })),
    ...(G.photos || []).map((p) => ({ ...p, db: false })),
  ];
  const cats = ["All", ...new Set(all.map((p) => p.category).filter(Boolean))];
  if (!cats.includes(currentCat)) currentCat = "All";

  const filterBox = $("filters");
  filterBox.innerHTML = "";
  if (cats.length > 2) {
    cats.forEach((c) => {
      const chip = el("button", "chip" + (c === currentCat ? " active" : ""), c);
      chip.addEventListener("click", () => { currentCat = c; renderPhotos(); });
      filterBox.append(chip);
    });
  }

  visible = currentCat === "All" ? all : all.filter((p) => p.category === currentCat);
  const box = $("photos");
  box.innerHTML = "";
  if (!visible.length) box.append(el("p", "empty", "No photos yet."));
  visible.forEach((p, i) => {
    const wrap = el("div", "photo-wrap");
    const b = el("button", "photo");
    b.setAttribute("aria-label", "Open photo: " + (p.alt || p.caption || ""));
    const img = el("img");
    img.src = p.src;
    img.alt = p.alt || "";
    img.loading = "lazy";
    b.append(img, el("span", "", p.caption || ""));
    b.addEventListener("click", () => { show(i); lb.classList.add("open"); });
    wrap.append(b);
    if (isAdmin && p.db) {
      const del = el("button", "del-btn", "\u00d7");
      del.title = "Delete this photo";
      del.addEventListener("click", () => deletePhoto(p));
      wrap.append(del);
    }
    box.append(wrap);
  });
}

async function reload() {
  await loadDb();
  renderAlbums();
  renderPhotos();
}

/* ---------- Admin actions ---------- */
async function shrink(file, max = 1920) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
    return blob || file;
  } catch {
    return file;
  }
}

async function uploadFile(file) {
  const blob = await shrink(file);
  const ext = blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from("gallery").upload(path, blob, { contentType: blob.type || file.type });
  if (error) throw error;
  const { data } = sb.storage.from("gallery").getPublicUrl(path);
  return { path, url: data.publicUrl };
}

async function uploadPhotos() {
  const r = await formModal({
    title: "Upload photos",
    submitLabel: "Upload",
    fields: [
      { name: "files", label: "Choose photos", type: "file", multiple: true, accept: "image/*", required: true },
      { name: "category", label: "Category", type: "select", options: PHOTO_CATS },
      { name: "caption", label: "Caption (optional, applied to all)" },
    ],
  });
  if (!r || !r.files.length) return;
  toast(`Uploading ${r.files.length} photo(s)\u2026`);
  let ok = 0;
  for (const f of r.files) {
    try {
      const { path, url } = await uploadFile(f);
      const { error } = await sb.from("photos").insert({ path, url, caption: r.caption.trim() || null, category: r.category });
      if (error) throw error;
      ok++;
    } catch (e) {
      toast(`${f.name}: ${e.message}`, "err");
    }
  }
  if (ok) toast(`${ok} photo(s) uploaded.`);
  await reload();
}

async function deletePhoto(p) {
  if (!confirm("Delete this photo permanently?")) return;
  await sb.storage.from("gallery").remove([p.path]);
  const { error } = await sb.from("photos").delete().eq("id", p.id);
  if (error) return toast(error.message, "err");
  toast("Photo deleted.");
  await reload();
}

async function addAlbum() {
  const r = await formModal({
    title: "Add a cloud album link",
    submitLabel: "Add album",
    fields: [
      { name: "title", label: "Album title", required: true },
      { name: "url", label: "Album link (share URL)", type: "url", required: true, placeholder: "https://photos.app.goo.gl/..." },
      { name: "provider", label: "Where is it?", type: "select", options: ["Google Photos", "iCloud", "Google Drive", "OneDrive", "Dropbox", "Flickr", "Other"] },
      { name: "description", label: "Short description (optional)" },
      { name: "cover", label: "Cover photo (optional)", type: "file", accept: "image/*" },
    ],
  });
  if (!r) return;
  try {
    let cover_url = null;
    if (r.cover[0]) cover_url = (await uploadFile(r.cover[0])).url;
    const { error } = await sb.from("albums").insert({
      title: r.title.trim(), url: r.url.trim(), provider: r.provider,
      description: r.description.trim() || null, cover_url,
    });
    if (error) throw error;
    toast("Album added.");
    await reload();
  } catch (e) {
    toast(e.message, "err");
  }
}

if (isAdmin && sb) {
  const bar = $("admin-tools");
  bar.hidden = false;
  const up = el("button", "btn", "\u2191 Upload photos");
  const al = el("button", "btn ghost", "+ Add cloud album link");
  up.addEventListener("click", uploadPhotos);
  al.addEventListener("click", addAlbum);
  bar.append(up, al);
}

reload();
