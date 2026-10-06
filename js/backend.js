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
export const isAdmin =
  !!user?.email &&
  (S.adminEmails || []).map((e) => e.toLowerCase()).includes(user.email.toLowerCase());

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

/* ---------- Modal form ---------- */
// fields: [{ name, label, type: text|email|textarea|select|datetime-local|file|url, required, options, multiple, accept }]
// Resolves with an object of values (files as arrays), or null if cancelled.
export function formModal({ title, fields, submitLabel = "Save", values = {} }) {
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
        submitLabel: "Email me a sign-in link",
        fields: [{ name: "email", label: "Your admin email", type: "email", required: true }],
      });
      if (!r) return;
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
