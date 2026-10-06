import { loadEvents, catClass, fmtTime, fmtShort } from "./events.js";

const box = document.getElementById("upcoming");
if (box) {
  const { events } = await loadEvents();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const next = events.filter((e) => e.start >= start).sort((a, b) => a.start - b.start).slice(0, 3);

  const draw = () => {
    box.innerHTML = "";
    next.forEach((e) => {
      const card = document.createElement("a");
      card.href = "calendar.html";
      card.className = "card up-card reveal in";
      const tag = document.createElement("span");
      tag.className = "tag " + catClass(e.category);
      tag.textContent = e.category;
      const h = document.createElement("h3");
      h.textContent = e.title;
      const p = document.createElement("p");
      const when = document.createElement("span");
      when.textContent = `${fmtShort(e.start)} \u00b7 ${fmtTime(e.start)}`;
      p.append(when);
      if (e.location) {
        const loc = document.createElement("span");
        loc.textContent = e.location;
        p.append(document.createTextNode(" \u00b7 "), loc);
      }
      card.append(tag, h, p);
      box.append(card);
    });
  };

  if (!next.length) box.closest("section").hidden = true;
  else {
    draw();
    window.addEventListener("langchange", draw);
  }
}
