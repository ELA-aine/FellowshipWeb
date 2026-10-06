import { sb, isAdmin, formModal, toast } from "./backend.js";
import { loadEvents, eventsOn, sameDay, catClass, CATEGORIES, fmtTime, fmtDate, toLocalInput, loc } from "./events.js";

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

let events = [];
let live = false;
let month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selected = new Date();
const canEdit = () => isAdmin && sb && live;

async function refresh() {
  ({ events, live } = await loadEvents());
  render();
}

function render() {
  $("cal-title").textContent = month.toLocaleDateString(loc(), { month: "long", year: "numeric" });
  const grid = $("cal-grid");
  grid.innerHTML = "";

  const first = new Date(month);
  first.setDate(1 - first.getDay());
  const today = new Date();

  for (let i = 0; i < 42; i++) {
    const d = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
    const list = eventsOn(events, d);
    const cell = el("button", "day");
    cell.type = "button";
    if (d.getMonth() !== month.getMonth()) cell.classList.add("dim");
    if (sameDay(d, today)) cell.classList.add("today");
    if (sameDay(d, selected)) cell.classList.add("selected");
    cell.setAttribute("aria-label", `${fmtDate(d)}, ${list.length} events`);
    cell.append(el("span", "num", String(d.getDate())));
    list.slice(0, 3).forEach((e) => cell.append(el("span", "ev " + catClass(e.category), e.title)));
    if (list.length > 3) cell.append(el("span", "more", `+${list.length - 3} more`));
    cell.addEventListener("click", () => { selected = d; render(); });
    grid.append(cell);
  }

  renderPanel();
  renderUpcoming();
}

function eventCard(e, withEdit) {
  const card = el("div", "ev-card " + catClass(e.category));
  card.append(el("span", "tag " + catClass(e.category), e.category));
  card.append(el("h4", "", e.title));
  const when = fmtTime(e.start) + (e.end && sameDay(e.start, e.end) ? " \u2013 " + fmtTime(e.end) : "");
  const meta = el("p", "ev-meta");
  meta.append(el("span", "", when));
  if (e.location) meta.append(document.createTextNode(" \u00b7 "), el("span", "", e.location));
  card.append(meta);
  if (e.description) card.append(el("p", "", e.description));
  if (withEdit && canEdit() && e.source === "db") {
    const row = el("div", "ev-actions");
    const ed = el("button", "link-btn", "Edit");
    const del = el("button", "link-btn danger", "Delete");
    ed.addEventListener("click", () => editEvent(e));
    del.addEventListener("click", () => removeEvent(e));
    row.append(ed, del);
    card.append(row);
  }
  return card;
}

function renderPanel() {
  const panel = $("day-panel");
  panel.innerHTML = "";
  panel.append(el("h3", "", fmtDate(selected)));
  const list = eventsOn(events, selected);
  if (!list.length) panel.append(el("p", "empty", "Nothing scheduled this day."));
  list.forEach((e) => panel.append(eventCard(e, true)));
  if (canEdit()) {
    const add = el("button", "btn", "+ Add event on this day");
    add.addEventListener("click", () => editEvent(null));
    panel.append(add);
  }
}

function renderUpcoming() {
  const box = $("upcoming-list");
  box.innerHTML = "";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const next = events.filter((e) => e.start >= now).sort((a, b) => a.start - b.start).slice(0, 8);
  if (!next.length) box.append(el("p", "empty", "No upcoming events yet. Check back soon!"));
  next.forEach((e) => {
    const row = el("button", "up-row");
    row.type = "button";
    const date = el("span", "up-date");
    date.append(el("b", "", String(e.start.getDate())), document.createTextNode(e.start.toLocaleDateString(loc(), { month: "short" })));
    const info = el("span", "up-info");
    const small = el("small");
    small.append(el("span", "", fmtTime(e.start)));
    if (e.location) small.append(document.createTextNode(" \u00b7 "), el("span", "", e.location));
    info.append(el("strong", "", e.title), small);
    row.append(date, info, el("span", "dot " + catClass(e.category)));
    row.addEventListener("click", () => {
      selected = e.start;
      month = new Date(e.start.getFullYear(), e.start.getMonth(), 1);
      render();
      $("day-panel").scrollIntoView({ behavior: "smooth", block: "center" });
    });
    box.append(row);
  });
}

async function editEvent(ev) {
  const base = ev ? ev.start : new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 18, 0);
  const r = await formModal({
    title: ev ? "Edit event" : "Add event",
    submitLabel: ev ? "Save changes" : "Add event",
    fields: [
      { name: "title", label: "Title", required: true },
      { name: "category", label: "Type", type: "select", options: CATEGORIES },
      { name: "start", label: "Starts", type: "datetime-local", required: true },
      { name: "end", label: "Ends (optional)", type: "datetime-local" },
      { name: "location", label: "Location (optional)" },
      { name: "description", label: "Details (optional)", type: "textarea" },
    ],
    values: {
      title: ev?.title || "",
      category: ev?.category || CATEGORIES[0],
      start: toLocalInput(base),
      end: ev?.end ? toLocalInput(ev.end) : "",
      location: ev?.location || "",
      description: ev?.description || "",
    },
  });
  if (!r) return;
  const start = new Date(r.start);
  const end = r.end ? new Date(r.end) : null;
  if (end && end < start) return toast("End time must be after the start time.", "err");

  const row = {
    title: r.title.trim(),
    category: r.category,
    start_at: start.toISOString(),
    end_at: end ? end.toISOString() : null,
    location: r.location.trim() || null,
    description: r.description.trim() || null,
  };
  const { error } = ev
    ? await sb.from("events").update(row).eq("id", ev.id)
    : await sb.from("events").insert(row);
  if (error) return toast("Could not save: " + error.message, "err");
  toast(ev ? "Event updated." : "Event added.");
  selected = start;
  month = new Date(start.getFullYear(), start.getMonth(), 1);
  await window.addEventListener("langchange", render);
refresh();
}

async function removeEvent(ev) {
  if (!confirm(`Delete "${ev.title}"?`)) return;
  const { error } = await sb.from("events").delete().eq("id", ev.id);
  if (error) return toast("Could not delete: " + error.message, "err");
  toast("Event deleted.");
  await refresh();
}

$("cal-prev").addEventListener("click", () => { month = new Date(month.getFullYear(), month.getMonth() - 1, 1); render(); });
$("cal-next").addEventListener("click", () => { month = new Date(month.getFullYear(), month.getMonth() + 1, 1); render(); });
$("cal-today").addEventListener("click", () => {
  selected = new Date();
  month = new Date(selected.getFullYear(), selected.getMonth(), 1);
  render();
});

refresh();
