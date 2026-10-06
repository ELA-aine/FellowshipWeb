// Event data helpers shared by the calendar and home page.
import { sb } from "./backend.js";

const S = window.SITE || {};

export const CATEGORIES = ["Fellowship activity", "Church event", "Other"];
export const catClass = (c) =>
  c === "Church event" ? "church" : c === "Weekly" ? "weekly" : c === "Other" ? "other" : "fellowship";

const norm = (r, source) => ({
  id: r.id,
  title: r.title,
  description: r.description || "",
  location: r.location || "",
  category: r.category || "Fellowship activity",
  start: new Date(r.start_at),
  end: r.end_at ? new Date(r.end_at) : null,
  source,
});

export async function loadEvents() {
  if (sb) {
    const { data, error } = await sb.from("events").select("*").order("start_at");
    if (!error) return { events: data.map((r) => norm(r, "db")), live: true };
    console.warn("Events query failed, using sample data:", error.message);
  }
  const rows = (window.EVENTS || []).map((r, i) => norm({ id: "static-" + i, ...r }, "static"));
  return { events: rows, live: false };
}

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
function parseTime(t) {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(t || "");
  if (!m) return [0, 0];
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return [h, Number(m[2])];
}

// Recurring weekly gatherings defined in data/site.js
export function weeklyOn(date) {
  return (S.meetings || [])
    .filter((m) => DAYS.indexOf(String(m.day).toLowerCase()) === date.getDay())
    .map((m) => {
      const [h, mi] = parseTime(m.time);
      return {
        id: `weekly-${m.day}-${date.toDateString()}`,
        title: m.what,
        description: "Our regular weekly gathering. Everyone is welcome.",
        location: S.address || "",
        category: "Weekly",
        start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, mi),
        end: null,
        source: "weekly",
      };
    });
}

// Midnight of the next date (today included) that falls on the given weekday name.
export function nextOccurrence(dayName) {
  const target = DAYS.indexOf(String(dayName).toLowerCase());
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + ((target - d.getDay() + 7) % 7));
  return d;
}

export const sameDay = (a, b) => a.toDateString() === b.toDateString();
export const loc = () => (window.I18N ? window.I18N.locale() : undefined);
export const fmtTime = (d) => d.toLocaleTimeString(loc(), { hour: "numeric", minute: "2-digit" });
export const fmtDate = (d) => d.toLocaleDateString(loc(), { weekday: "long", month: "long", day: "numeric" });
export const fmtShort = (d) => d.toLocaleDateString(loc(), { month: "short", day: "numeric" });

export function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function eventsOn(events, date) {
  return [...events.filter((e) => sameDay(e.start, date)), ...weeklyOn(date)].sort((a, b) => a.start - b.start);
}
