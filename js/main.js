(function () {
  const S = window.SITE || {};
  const page = document.body.dataset.page || "";

  const el = (tag, attrs = {}, children = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else n.setAttribute(k, v);
    }
    [].concat(children).forEach((c) => n.append(c));
    return n;
  };

  /* ---------- Shared header & footer ---------- */
  const links = [
    ["home", "index.html", "Welcome"],
    ["about", "about.html", "About Us"],
    ["gallery", "gallery.html", "Gallery"],
    ["contact", "contact.html", "Contact"],
  ];

  const header = document.getElementById("site-header");
  if (header) {
    header.className = "site-header";
    header.innerHTML = `
      <div class="container nav">
        <a class="brand" href="index.html"><span class="brand-mark"></span><span data-site="name"></span></a>
        <button class="menu-btn" aria-label="Toggle menu" aria-expanded="false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
        <ul class="nav-links">
          ${links.map(([id, href, label]) =>
            `<li><a href="${href}"${id === page ? ' aria-current="page"' : ""}>${label}</a></li>`).join("")}
        </ul>
      </div>`;
    const btn = header.querySelector(".menu-btn");
    const list = header.querySelector(".nav-links");
    btn.addEventListener("click", () => {
      const open = list.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
  }

  const footer = document.getElementById("site-footer");
  if (footer) {
    footer.className = "site-footer";
    const social = (S.social || [])
      .map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.label}</a></li>`).join("");
    footer.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div>
            <h3 data-site="name"></h3>
            <p data-site="tagline"></p>
          </div>
          <div>
            <h3>Explore</h3>
            <ul>${links.map(([, href, label]) => `<li><a href="${href}">${label}</a></li>`).join("")}</ul>
          </div>
          <div>
            <h3>Connect</h3>
            <ul>
              <li><a data-site-mailto></a></li>
              ${social}
            </ul>
          </div>
        </div>
        <div class="copy">&copy; <span id="year"></span> <span data-site="name"></span>. All rights reserved.</div>
      </div>`;
    footer.querySelector("#year").textContent = new Date().getFullYear();
  }

  /* ---------- Fill in site config ---------- */
  document.querySelectorAll("[data-site]").forEach((n) => {
    const v = S[n.dataset.site];
    if (typeof v === "string") n.textContent = v;
  });
  document.querySelectorAll("[data-site-mailto]").forEach((a) => {
    a.href = "mailto:" + (S.email || "");
    a.textContent = S.email || "";
  });
  const meetings = document.querySelectorAll("[data-meetings]");
  meetings.forEach((ul) => {
    (S.meetings || []).forEach((m) => {
      ul.append(el("li", {}, [
        el("span", { html: `<b>${m.day}</b> &middot; ${m.what}` }),
        el("span", { text: m.time }),
      ]));
    });
  });
  const firstMeeting = (S.meetings || [])[0];
  document.querySelectorAll("[data-next-meeting]").forEach((n) => {
    if (firstMeeting) n.textContent = `${firstMeeting.day}s at ${firstMeeting.time}`;
  });

  /* ---------- Scroll reveal ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    reveals.forEach((r) => io.observe(r));
  } else reveals.forEach((r) => r.classList.add("in"));

  /* ---------- Gallery ---------- */
  const G = window.GALLERY;
  const albumBox = document.getElementById("albums");
  const photoBox = document.getElementById("photos");
  if (G && photoBox) {
    if (albumBox) {
      (G.albums || []).forEach((a) => {
        const card = el("a", { class: "album", href: a.url, target: "_blank", rel: "noopener" }, [
          el("img", { src: a.cover, alt: a.title, loading: "lazy" }),
          el("div", { class: "album-body" }, [
            el("h3", { text: a.title }),
            el("p", { text: a.description || "" }),
            el("span", { class: "album-link", text: `View on ${a.provider || "the web"} \u2197` }),
          ]),
        ]);
        albumBox.append(card);
      });
      if (!(G.albums || []).length) albumBox.closest("section")?.remove();
    }

    const photos = G.photos || [];
    const cats = ["All", ...new Set(photos.map((p) => p.category).filter(Boolean))];
    const filterBox = document.getElementById("filters");
    let visible = photos;

    const lb = document.getElementById("lightbox");
    const lbImg = lb.querySelector("img");
    const lbCap = lb.querySelector("p");
    let idx = 0;
    const show = (i) => {
      idx = (i + visible.length) % visible.length;
      lbImg.src = visible[idx].src;
      lbImg.alt = visible[idx].alt || "";
      lbCap.textContent = visible[idx].caption || "";
    };
    const close = () => lb.classList.remove("open");

    const render = (cat) => {
      visible = cat === "All" ? photos : photos.filter((p) => p.category === cat);
      photoBox.innerHTML = "";
      if (!visible.length) photoBox.append(el("p", { class: "empty", text: "No photos yet." }));
      visible.forEach((p, i) => {
        const b = el("button", { class: "photo", "aria-label": "Open photo: " + (p.alt || p.caption || "") }, [
          el("img", { src: p.src, alt: p.alt || "", loading: "lazy" }),
          el("span", { text: p.caption || "" }),
        ]);
        b.addEventListener("click", () => { show(i); lb.classList.add("open"); });
        photoBox.append(b);
      });
    };

    if (filterBox && cats.length > 2) {
      cats.forEach((c, i) => {
        const chip = el("button", { class: "chip" + (i === 0 ? " active" : ""), text: c });
        chip.addEventListener("click", () => {
          filterBox.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
          chip.classList.add("active");
          render(c);
        });
        filterBox.append(chip);
      });
    }
    render("All");

    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector(".lb-prev").addEventListener("click", () => show(idx - 1));
    lb.querySelector(".lb-next").addEventListener("click", () => show(idx + 1));
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
  }

  /* ---------- Contact form ---------- */
  const form = document.getElementById("contact-form");
  if (form) {
    const status = document.getElementById("form-status");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      if (data.get("website")) return; // honeypot
      const set = (msg, cls) => { status.textContent = msg; status.className = "form-status " + cls; };

      if (S.formEndpoint) {
        try {
          const res = await fetch(S.formEndpoint, {
            method: "POST", body: data, headers: { Accept: "application/json" },
          });
          if (!res.ok) throw new Error();
          form.reset();
          set("Thank you! Your message has been sent. We'll be in touch soon.", "ok");
        } catch {
          set("Sorry, something went wrong. Please email us directly instead.", "err");
        }
      } else {
        const subject = encodeURIComponent("Message from " + data.get("name"));
        const body = encodeURIComponent(`${data.get("message")}\n\n- ${data.get("name")} (${data.get("email")})`);
        window.location.href = `mailto:${S.email}?subject=${subject}&body=${body}`;
        set("Opening your email app\u2026", "ok");
      }
    });
  }
})();
