// Edit this file to change the details shown across the whole site.
window.SITE = {
  name: "Joshua Fellowship",
  tagline: "A warm place to belong, grow, and walk together.",
  email: "hello@example.com",
  phone: "",
  church: "Kitchener-Waterloo Chinese Alliance Church",
  churchShort: "KWCAC",
  churchUrl: "https://www.kwcac.ca/",
  // Link where people order Friday dinner. The "Order food" box on the Welcome
  // page stays hidden until this is filled in.
  orderUrl: "",
  address: "612 Erb Street West, Waterloo, Ontario, Canada",
  meetings: [
    { day: "Friday", time: "6:15 PM", what: "Fellowship Dinner" },
    { day: "Friday", time: "7:00 PM", what: "Fellowship Gathering" }
  ],
  // Contact form: create a free form at https://formspree.io and paste its
  // endpoint here (looks like "https://formspree.io/f/abcdwxyz").
  // Leave empty to have the form open the visitor's email app instead.
  formEndpoint: "",

  // ---- Admin tools (photo upload, calendar editing) ----
  // Create a free project at https://supabase.com, run supabase/setup.sql,
  // then paste the Project URL and the public "anon" key here (see README).
  // The anon key is safe to publish; security is enforced by the database.
  supabaseUrl: "https://zhgtbyttdcicsgzbrffc.supabase.co",
  supabaseAnonKey: "sb_publishable_zBCSaGnTLGn8Ri3xRie6MA_YC7XdpkA",
  social: [
    // { label: "Instagram", url: "https://instagram.com/yourpage" },
    // { label: "YouTube", url: "https://youtube.com/@yourchannel" }
  ]
};
