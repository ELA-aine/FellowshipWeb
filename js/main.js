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
    ["calendar", "calendar.html", "Calendar"],
    ["gallery", "gallery.html", "Gallery"],
    ["contact", "contact.html", "Contact"],
  ];

  const header = document.getElementById("site-header");
  if (header) {
    header.className = "site-header";
    header.innerHTML = `
      <div class="container nav">
        <a class="brand" href="index.html"><span class="brand-mark"></span><span data-site="name"></span></a>
        <div class="nav-right">
          <ul class="nav-links">
            ${links.map(([id, href, label]) =>
              `<li><a href="${href}"${id === page ? ' aria-current="page"' : ""}>${label}</a></li>`).join("")}
          </ul>
          <button class="lang-btn" type="button" title="Switch language / 切换语言">中文</button>
          <button class="menu-btn" aria-label="Toggle menu" aria-expanded="false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
          </button>
        </div>
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
            <p class="affil"><span>Part of</span> <span data-site="church"></span> (<span data-site="churchShort"></span>)</p>
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
        el("span", {}, [
          el("b", { text: m.day }),
          document.createTextNode(" \u00b7 "),
          el("span", { text: m.what }),
        ]),
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
