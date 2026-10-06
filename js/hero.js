// Welcome-page hero: cross-fading slideshow of fellowship photos.
// Uses the newest uploaded photos from Supabase; falls back to data/gallery.js.
import { sb } from "./backend.js";

const root = document.getElementById("hero-slides");
if (root) {
  let photos = [];
  if (sb) {
    const { data, error } = await sb
      .from("photos").select("url,caption").order("created_at", { ascending: false }).limit(8);
    if (!error && data?.length) photos = data.map((p) => ({ src: p.url, alt: p.caption || "Fellowship photo" }));
  }
  if (!photos.length) {
    photos = ((window.GALLERY || {}).photos || []).slice(0, 6)
      .map((p) => ({ src: p.src, alt: p.alt || p.caption || "Fellowship photo" }));
  }

  if (!photos.length) {
    document.querySelector(".hero")?.classList.add("hero-solo");
  } else {
    const imgs = photos.map((p, i) => {
      const img = document.createElement("img");
      img.src = p.src;
      img.alt = p.alt;
      img.decoding = "async";
      if (i > 0) img.loading = "lazy";
      root.append(img);
      return img;
    });
    root.removeAttribute("role"); // images carry their own alt text

    let cur = 0;
    let timer = null;
    const dots = [];
    const show = (i) => {
      cur = (i + imgs.length) % imgs.length;
      imgs.forEach((im, k) => im.classList.toggle("active", k === cur));
      dots.forEach((d, k) => d.classList.toggle("active", k === cur));
    };

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
      root.append(bar);
    }
    show(0);

    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stop = () => { clearInterval(timer); timer = null; };
    const start = () => {
      stop();
      if (imgs.length > 1 && !reduce) timer = setInterval(() => { if (!document.hidden) show(cur + 1); }, 5500);
    };
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    start();
  }
}
