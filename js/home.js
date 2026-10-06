import { loadEvents, catClass, fmtTime, fmtShort } from "./events.js";

const box = document.getElementById("upcoming");
if (box) {
  const { events } = await loadEvents();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const next = events.filter((e) => e.start >= start).sort((a, b) => a.start - b.start).slice(0, 3);
  if (!next.length) {
    box.closest("section").hidden = true;
  } else {
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
      p.textContent = `${fmtShort(e.start)} \u00b7 ${fmtTime(e.start)}${e.location ? " \u00b7 " + e.location : ""}`;
      card.append(tag, h, p);
      box.append(card);
    });
  }
}
