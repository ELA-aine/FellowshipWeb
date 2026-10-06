// Welcome page "This week's event": next Friday's date and times, the weekly poster,
// and the order-food box. Poster is uploaded by the admin each week.
import { sb, isAdmin, formModal, toast, uploadImage } from "./backend.js";
import { nextOccurrence, fmtDate, toLocalInput } from "./events.js";

const S = window.SITE || {};
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const ymd = (d) => toLocalInput(d).slice(0, 10);

const first = (S.meetings || [])[0];
const when = first ? nextOccurrence(first.day) : new Date();

/* ---- date + times ---- */
const dateEl = $("weekly-date");
const drawDate = () => { dateEl.textContent = fmtDate(when); };
drawDate();
window.addEventListener("langchange", drawDate);

const times = $("weekly-times");
(S.meetings || [])
  .filter((m) => first && m.day === first.day)
  .forEach((m) => {
    const li = el("li");
    li.append(el("b", "", m.time), el("span", "", m.what));
    times.append(li);
  });

/* ---- order food ---- */
if (S.orderUrl) {
  $("order-btn").href = S.orderUrl;
  $("order-card").hidden = false;
}

/* ---- poster ---- */
let current = null;

async function loadPoster() {
  current = null;
  if (sb) {
    const { data, error } = await sb.from("posters").select("*").gte("week_of", ymd(new Date())).order("week_of").limit(1);
    if (error) console.warn("Poster query failed (run supabase/002_weekly_poster.sql?):", error.message);
    else current = data[0] || null;
  }
  const link = $("poster");
  link.hidden = !current;
  $("weekly-grid").classList.toggle("has-poster", !!current);
  if (current) {
    link.href = current.url;
    link.querySelector("img").src = current.url;
  }
  drawAdmin();
}

/* ---- admin tools ---- */
function drawAdmin() {
  const box = $("poster-admin");
  if (!isAdmin || !sb) return;
  box.hidden = false;
  box.innerHTML = "";
  const up = el("button", "btn ghost", current ? "Replace poster" : "\u2191 Upload this week's poster");
  up.addEventListener("click", uploadPoster);
  box.append(up);
  if (current) {
    const rm = el("button", "btn ghost", "Remove poster");
    rm.addEventListener("click", removePoster);
    box.append(rm);
  }
}

async function dropPoster(row) {
  await sb.storage.from("gallery").remove([row.path]);
  await sb.from("posters").delete().eq("id", row.id);
}

async function uploadPoster() {
  const r = await formModal({
    title: "Upload this week's poster",
    submitLabel: "Upload",
    fields: [
      { name: "file", label: "Poster image", type: "file", accept: "image/*", required: true },
      { name: "week", label: "For which date? (the Friday)", type: "date", required: true },
    ],
    values: { week: ymd(when) },
  });
  if (!r || !r.file[0]) return;
  toast("Uploading poster\u2026");
  try {
    const { data: old } = await sb.from("posters").select("*").eq("week_of", r.week);
    const { path, url } = await uploadImage(r.file[0], "posters", 1600);
    const { error } = await sb.from("posters").insert({ path, url, week_of: r.week });
    if (error) throw error;
    for (const o of old || []) await dropPoster(o);
    toast("Poster updated.");
    await loadPoster();
  } catch (e) {
    toast("Could not save poster: " + e.message + " (did you run supabase/002_weekly_poster.sql?)", "err");
  }
}

async function removePoster() {
  if (!confirm("Remove this week's poster?")) return;
  await dropPoster(current);
  toast("Poster removed.");
  await loadPoster();
}

loadPoster();
