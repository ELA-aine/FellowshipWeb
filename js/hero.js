// Welcome-page hero: cross-fading slideshow of fellowship photos.
// Uses the newest uploaded photos from Supabase; falls back to data/gallery.js.
// Admins get an "Upload photos" button right on the hero.
import { sb, isAdmin } from "./backend.js";
import { uploadPhotosFlow } from "./photos.js";

const root = document.getElementById("hero-slides");
if (root) {
  const visual = root.parentElement;
  const hero = document.querySelector(".hero");
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let timer = null;
  let cur = 0;
  let imgs = [];
  let dots = [];

  const stop = () => { clearInterval(timer); timer = null; };
  const show = (i) => {
    cur = (i + imgs.length) % imgs.length;
    imgs.forEach((im, k) => im.classList.toggle("active", k === cur));
    dots.forEach((d, k) => d.classList.toggle("active", k === cur));
  };
  const start = () => {
    stop();
    if (imgs.length > 1 && !reduce) timer = setInterval(() => { if (!document.hidden) show(cur + 1); }, 5500);
  };

  async function loadPhotos() {
    if (sb) {
      const { data, error } = await sb
        .from("photos").select("url,caption").order("created_at", { ascending: false }).limit(8);
      if (!error && data?.length) return data.map((p) => ({ src: p.url, alt: p.caption || "Fellowship photo" }));
    }
    return ((window.GALLERY || {}).photos || []).slice(0, 6)
      .map((p) => ({ src: p.src, alt: p.alt || p.caption || "Fellowship photo" }));
  }

  async function build() {
    stop();
    root.innerHTML = "";
    visual.querySelector(".hero-dots")?.remove();
    imgs = [];
    dots = [];
    const photos = await loadPhotos();
    hero?.classList.toggle("hero-solo", !photos.length && !isAdmin);
    if (!photos.length) return;

    imgs = photos.map((p, i) => {
      const img = document.createElement("img");
      img.src = p.src;
      img.alt = p.alt;
      img.decoding = "async";
      if (i > 0) img.loading = "lazy";
      root.append(img);
      return img;
    });
    root.removeAttribute("role"); // images carry their own alt text

    if (imgs.length > 1) {
      const bar = document.createElement("div");
      bar.className = "hero-dots";
      imgs.forEach((_, i) => {
        const d = document.createElement("button");
        d.type = "button";
        d.setAttribute("aria-label", "Show photo");
        d.addEventListener("click", () => { show(i); start(); });
        dots.push(d);
        bar.append(d);
      });
      visual.append(bar);
    }
    show(0);
    start();
  }

  visual.addEventListener("mouseenter", stop);
  visual.addEventListener("mouseleave", start);

  if (isAdmin && sb) {
    const tools = document.createElement("div");
    tools.className = "slot-tools hero-tools";
    const up = document.createElement("button");
    up.type = "button";
    up.textContent = "\ud83d\udcf7 Upload photos";
    up.addEventListener("click", async () => { if (await uploadPhotosFlow()) await build(); });
    tools.append(up);
    visual.append(tools);
  }

  await build();
}
