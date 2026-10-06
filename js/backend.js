// Shared backend helpers: Supabase client, admin login, toast and modal form.
// If Supabase isn't configured (data/site.js), everything degrades to read-only static data.
const S = window.SITE || {};

export const configured = Boolean(S.supabaseUrl && S.supabaseAnonKey);
export let sb = null;

if (configured) {
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    sb = createClient(S.supabaseUrl, S.supabaseAnonKey);
  } catch (e) {
    console.warn("Could not load Supabase; running in read-only mode.", e);
  }
}

let session = null;
if (sb) {
  const { data } = await sb.auth.getSession();
  session = data.session;
}
export const user = session?.user ?? null;

// Admin status comes from the database (public.is_admin()), so no email is stored in this repo.
// This only decides which buttons to show; the database enforces permissions on every write.
export let isAdmin = false;
if (sb && user) {
  const { data, error } = await sb.rpc("is_admin");
  if (error) console.warn("Could not check admin status (run supabase/005_admins_table.sql?):", error.message);
  else isAdmin = data === true;
}

/* ---------- Toast ---------- */
export function toast(message, type = "ok") {
  let box = document.getElementById("toasts");
  if (!box) {
    box = document.createElement("div");
    box.id = "toasts";
    document.body.append(box);
  }
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.textContent = message;
  box.append(t);
  setTimeout(() => t.remove(), type === "err" ? 6000 : 3500);
}

/* ---------- Image upload (resizes in the browser, stores in the "gallery" bucket) ---------- */
async function shrinkImage(file, max) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return (await new Promise((r) => c.toBlob(r, "image/jpeg", 0.88))) || file;
  } catch {
    return file;
  }
}

export async function uploadImage(file, folder = "", max = 1920) {
  const blob = await shrinkImage(file, max);
  const ext = blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${folder ? folder + "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from("gallery").upload(path, blob, { contentType: blob.type || file.type });
  if (error) throw error;
  const { data } = sb.storage.from("gallery").getPublicUrl(path);
  return { path, url: data.publicUrl };
}

/* ---------- Modal form ---------- */
// fields: [{ name, label, type: text|email|textarea|select|datetime-local|file|url, required, options, multiple, accept }]
// Resolves with an object of values (files as arrays), or null if cancelled.
export function formModal({ title, fields, submitLabel = "Save", values = {}, extra = [] }) {
  return new Promise((resolve) => {
    const dlg = document.createElement("dialog");
    dlg.className = "modal";
    const form = document.createElement("form");
    const h = document.createElement("h3");
    h.textContent = title;
    form.append(h);

    const inputs = {};
    fields.forEach((f) => {
      const id = "f-" + f.name;
      const label = document.createElement("label");
      label.htmlFor = id;
      label.textContent = f.label;
      let input;
      if (f.type === "textarea") input = document.createElement("textarea");
      else if (f.type === "select") {
        input = document.createElement("select");
        (f.options || []).forEach((o) => {
          const opt = document.createElement("option");
          opt.value = opt.textContent = o;
          input.append(opt);
        });
      } else {
        input = document.createElement("input");
        input.type = f.type || "text";
        if (f.multiple) input.multiple = true;
        if (f.accept) input.accept = f.accept;
      }
      input.id = id;
      input.name = f.name;
      if (f.required) input.required = true;
      if (f.placeholder) input.placeholder = f.placeholder;
      if (values[f.name] != null && f.type !== "file") input.value = values[f.name];
      inputs[f.name] = input;
      form.append(label, input);
    });

    const row = document.createElement("div");
    row.className = "modal-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn ghost";
    cancel.textContent = "Cancel";
    const ok = document.createElement("button");
    ok.type = "submit";
    ok.className = "btn";
    ok.textContent = submitLabel;
    row.append(cancel, ok);
    form.append(row);

    // Optional alternative actions shown under the form, e.g. "Continue with GitHub".
    if (extra.length) {
      const box = document.createElement("div");
      box.className = "modal-extra";
      const or = document.createElement("span");
      or.textContent = "or";
      box.append(or);
      extra.forEach((x) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn ghost";
        b.textContent = x.label;
        b.addEventListener("click", () => { done(null); x.run(); });
        box.append(b);
      });
      form.append(box);
    }
    dlg.append(form);
    document.body.append(dlg);

    const done = (v) => {
      dlg.close();
      dlg.remove();
      resolve(v);
    };
    cancel.addEventListener("click", () => done(null));
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); done(null); });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const out = {};
      fields.forEach((f) => {
        const i = inputs[f.name];
        out[f.name] = f.type === "file" ? Array.from(i.files) : i.value;
      });
      done(out);
    });
    dlg.showModal();
    Object.values(inputs)[0]?.focus();
  });
}

/* ---------- Admin UI (login link / admin bar) ---------- */
function setup() {
  if (!sb) return;

  if (user) {
    const bar = document.createElement("div");
    bar.className = "admin-bar" + (isAdmin ? "" : " denied");
    const msg = document.createElement("span");
    msg.textContent = isAdmin
      ? `Admin mode \u00b7 ${user.email}`
      : `Signed in as ${user.email} (no admin access)`;
    const out = document.createElement("button");
    out.textContent = "Sign out";
    out.addEventListener("click", async () => {
      await sb.auth.signOut();
      location.reload();
    });
    bar.append(msg, out);
    document.body.prepend(bar);
  } else {
    const copy = document.querySelector(".site-footer .copy");
    if (!copy) return;
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = "Admin login";
    a.style.marginLeft = "1rem";
    a.addEventListener("click", async (e) => {
      e.preventDefault();
      const r = await formModal({
        title: "Admin sign in",
        submitLabel: "Sign in",
        fields: [
          { name: "email", label: "Your admin email", type: "email", required: true },
          { name: "password", label: "Password (leave blank to get an email link instead)", type: "password" },
        ],
        extra: [{
          label: "Continue with GitHub",
          run: async () => {
            const { error } = await sb.auth.signInWithOAuth({
              provider: "github",
              options: { redirectTo: location.origin + location.pathname },
            });
            if (error) toast(error.message, "err");
          },
        }],
      });
      if (!r) return;
      if (r.password) {
        const { error } = await sb.auth.signInWithPassword({ email: r.email.trim(), password: r.password });
        if (error) toast(error.message, "err");
        else location.reload();
        return;
      }
      const { error } = await sb.auth.signInWithOtp({
        email: r.email.trim(),
        options: { emailRedirectTo: location.origin + location.pathname },
      });
      if (error) toast(error.message, "err");
      else toast("Check your email for the sign-in link.");
    });
    copy.append(a);
  }
}

setup();

// Show sign-in errors that Supabase puts in the URL (e.g. expired link).
{
  const p = new URLSearchParams(location.hash.replace(/^#/, "") || location.search);
  const desc = p.get("error_description");
  if (desc) {
    toast("Sign-in problem: " + desc.replace(/\+/g, " "), "err");
    history.replaceState(null, "", location.pathname);
  }
}
