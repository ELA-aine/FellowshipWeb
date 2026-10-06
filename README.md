# Joshua Fellowship Website (约书亚团契)

Website for **Joshua Fellowship**, a fellowship of **Kitchener-Waterloo Chinese Alliance Church (KWCAC, 活泉华人宣道会)**.
Meets Fridays at **612 Erb Street West, Waterloo, Ontario, Canada** (6:15 PM dinner, 7:00 PM gathering).

Static site: plain HTML/CSS/JavaScript, **no build step, no npm, no framework**. Hosted on GitHub Pages; the only backend is Supabase (login, database, photo storage) called straight from the browser.

Goals: clean, warm, friendly UI; general fellowship info only (no personal info or names of individuals on the public site); bilingual (English + Simplified Chinese); admin-only photo upload and calendar editing.

## Run locally

```bash
cd ~/Personal/FellowshipWeb
python3 -m http.server 8000      # then open http://localhost:8000/
```

- Use **http://localhost:8000** (typed manually). Do not use an IDE preview server (e.g. JetBrains port 63343) or `file://`: the Supabase login redirect only allows `localhost:8000`.
- There is no JS runtime (Node etc.) on the author's machine, so there are no tests or linters. Verify changes by loading pages in a browser and checking the console.

## File map

| Path | Purpose |
|---|---|
| `index.html` `about.html` `calendar.html` `gallery.html` `contact.html` | The 5 pages. Header and footer are **injected by JS**: each page has empty `<header id="site-header">` / `<footer id="site-footer">`. |
| `css/styles.css` | Entire design system (CSS variables at the top: cream/terracotta/gold/sage palette). Mobile breakpoint 860px. |
| `data/site.js` | **Main settings**: name, tagline, church name, address, weekly meetings, contact email, form endpoint, Supabase URL + publishable key, admin emails, social links. |
| `data/gallery.js` | Static albums (cloud links) and photos. Currently placeholder samples. |
| `data/events.js` | Sample calendar events, shown only when Supabase is unreachable. Real events live in Supabase. |
| `data/zh.js` | Simplified Chinese dictionary (see Translation). |
| `js/main.js` | Classic script: injects header/footer, fills `data-site` fields, weekly meeting lists, scroll reveal, contact form. |
| `js/i18n.js` | Language toggle and in-place translator. |
| `js/backend.js` | **ES module**: Supabase client, admin login UI, `toast()`, `formModal()` helpers. Exports `sb`, `isAdmin`, `user`. |
| `js/events.js` | Event loading and date helpers (locale-aware). Generates recurring weekly meetings from `SITE.meetings`. |
| `js/content.js` | Editable text: every `data-edit="page.slug"` element can be overridden from the `site_texts` table; admin "Edit text" mode edits them in place (English + Chinese). |
| `js/photos.js` | Shared admin "upload photos to the gallery" flow (Gallery page and Welcome hero). |
| `js/slots.js` | Single-photo slots: any element with `data-photo="key"` gets an admin upload/replace/remove button; stored in `site_photos`. Currently the About page photo block. |
| `js/hero.js` | Welcome hero slideshow (newest gallery photos, blended into the right of the header). |
| `js/weekly.js` | Welcome "This week's event": next Friday's date/times, weekly poster (admin uploads it), order-food box (`orderUrl` in `data/site.js`; hidden while empty). |
| `js/calendar.js` / `js/home.js` / `js/gallery.js` | Page logic (modules). Calendar month grid and admin event CRUD; home "upcoming" cards; gallery with lightbox plus admin upload/delete. |
| `supabase/setup.sql`, `supabase/002_weekly_poster.sql`, `supabase/003_site_texts.sql`, `supabase/004_site_photos.sql` | Tables, RLS policies, storage bucket. Run `setup.sql` first, then `002_weekly_poster.sql` (weekly poster) and `003_site_texts.sql` (editable text) and `004_site_photos.sql` (photo slots), once each in the Supabase SQL editor. |
| `images/gallery/` | Placeholder SVGs for the gallery samples. |

Script order on each page matters: `data/site.js` → `data/zh.js` → `js/i18n.js` → `js/main.js` (classic), then modules (`js/calendar.js` etc.). `js/backend.js` loads through those modules, or directly on pages without one.

## Content conventions

- Edit site-wide facts in `data/site.js` (the `data-site="..."` attributes in HTML are filled from it). Do not hardcode the address, email or meeting times in HTML.
- Placeholder content still to be replaced by the real fellowship: `[bracketed]` text on `about.html` (story), the beliefs wording, `email: "hello@example.com"`, and the sample gallery images/albums/events.
- Avoid external dependencies. Current external loads: Google Fonts and `esm.sh` (Supabase client). If `esm.sh` fails, the site degrades to read-only sample data on purpose.
- Build DOM with `textContent`/`createElement` (not `innerHTML` with data) for anything that comes from the database.

## Editable text

- Static text blocks in `<main>` (h1-h4, p, strong, eyebrow spans) carry `data-edit="<page>.<first-words-slug>"`. Keys are derived from the English text, so rewording a block in HTML orphans any saved override (harmless; the HTML text shows).
- When adding new plain-text blocks, add `data-edit` with a unique key. Don't put it on elements containing child tags, links, or JS-filled text.
- Overrides apply on load and on language switch; if only English is edited, Chinese mode shows that English until a Chinese version is entered.

## Translation (English / 简体中文)

- A header button toggles language; choice is saved in `localStorage` (`jf-lang`); defaults from the browser language.
- **No `data-i18n` attributes.** `js/i18n.js` walks text nodes and matches the **exact English text** against keys in `data/zh.js` (whitespace-normalized). A `MutationObserver` also translates content added later (calendar, gallery, header/footer, toasts).
- **When you add or change any English text, add or update the same English string as a key in `data/zh.js`**, otherwise that line stays English. Also covered: `placeholder`, `aria-label`, `title`, `alt`, `<title>`, and the meta description.
- Pattern rules in `i18n.js` handle times (`6:15 PM` → `晚上6:15`), `Fridays at ...`, `View on X ↗`, `+N more`.
- Build text so each translatable phrase is its own text node (e.g. `<b>Friday</b> · <span>Dinner</span>`), not one concatenated string.
- Dates/times use `I18N.locale()` (`zh-CN` or `en-US`); modules re-render on the `langchange` window event.
- Not translated: admin UI, and event titles/descriptions entered through the admin tools (stored in the language typed).
- Chinese copy was machine-written; have a Chinese speaker review it, especially the beliefs section.

## Backend: Supabase

- Project URL and **publishable key** are in `data/site.js`. They are public by design; security is enforced by Row Level Security.
- Tables: `events`, `photos`, `albums`, `posters` (weekly poster, one per Friday; only the poster for today or later is shown), `site_texts` (admin text overrides keyed by `data-edit`), `site_photos` (admin photo slots keyed by `data-photo`). Storage bucket: `gallery` (public read). Everything is public-read; **writes allowed only if `public.is_admin()`**, which checks the JWT email against a hard-coded list in `supabase/setup.sql`.
- **Admins:** `elianm040511@gmail.com`. To add one, add the email to the array in `is_admin()` in `supabase/setup.sql` (re-run the function) **and** to `adminEmails` in `data/site.js`. The JS check only controls which buttons show; the database is the real gate.
- Admin sign-in: footer "Admin login" → email + password (preferred), or leave password blank for an emailed magic link. Supabase's built-in email sender is limited to a couple of emails/hour on the free tier ("email rate limit exceeded"), so use password sign-in; the admin user was created in the Supabase dashboard (Authentication > Users > Add user, "Auto Confirm User" ticked).
- Admin features: calendar add/edit/delete; gallery photo upload (images are resized to 1920px JPEG in the browser), photo delete, cloud-album links.
- Supabase **Authentication > URL Configuration** must list the site URL(s) for magic links: `http://localhost:8000/**` and, once live, `https://ela-aine.github.io/FellowshipWeb/**`. Password login needs no redirect.
- Free Supabase projects pause after about 7 days of inactivity (restore from the dashboard).

## Security rules (important)

- **Never commit** the Supabase `service_role` key, the database password, any admin password, or any `#access_token=...` / refresh token. Only the publishable key may appear in the repo.
- Never paste session URLs or tokens into chats or issues.
- Do not weaken the RLS policies or make the admin check client-side only.

## Contact form

Without configuration it opens the visitor's mail app (`mailto:`). To send directly, create a free form at formspree.io and put its URL in `formEndpoint` in `data/site.js`.

## Git and deployment

- Repo: `https://github.com/ELA-aine/FellowshipWeb` (personal account **ELA-aine**; `origin` already set). Branch `main`.
- Local git identity is repo-level: `elianm040511@gmail.com`. Do **not** use any work (Ford) account or credentials for this repo.
- The remote already contains one commit (created with the GitHub repo) that is unrelated to local history, so the first sync needs:
  `git pull origin main --rebase --allow-unrelated-histories` then `git push -u origin main` (after `gh auth login` as ELA-aine).
- Hosting: GitHub Pages (Settings > Pages > Deploy from branch `main`, `/ (root)`). Free Pages needs a public repo. Site URL will be `https://ela-aine.github.io/FellowshipWeb/`. All paths in the site are relative, so project-page hosting works.
- Content added through admin tools lives in Supabase, not git. Code and text changes need commit and push.

## Known gaps / ideas

- Replace placeholders (see Content conventions); remove sample gallery items once real photos are uploaded.
- Optional: bilingual event title/description fields in Supabase, Traditional Chinese, custom SMTP for Supabase email, link the KWCAC name to the church site, a favicon and social-share image.
