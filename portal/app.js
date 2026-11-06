// Gaydonne CRM dashboard. Static SPA with hash routing, Supabase JS client,
// no build step. Phone-first.

// Escape hatch: visiting /portal/?reset wipes every Supabase localStorage key
// and reloads. Use when the browser is stuck on an invalid session and nav
// stops responding ("blank page with nav at the top").
if (new URLSearchParams(location.search).has("reset")) {
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("sb-") || k.includes("supabase")) localStorage.removeItem(k);
    }
  } catch (_) {}
  location.replace(location.pathname);
  throw new Error("resetting");
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

const view = document.getElementById("view");
const signOutBtn = document.getElementById("signout");
const toastEl = document.getElementById("toast");
const navEl = document.querySelector(".tabs");

// --- helpers --------------------------------------------------------------

const h = (tag, attrs = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
};

const esc = (s) => (s ?? "").toString();

const initialsOf = (l) => {
  const a = (l?.first_name || "").trim()[0] || "";
  const b = (l?.last_name  || "").trim()[0] || "";
  return (a + b).toUpperCase() || "?";
};

// Resize an image file to a max square and re-encode as JPEG so the upload
// is small regardless of what the user picked. Returns a Blob.
async function resizeImage(file, max = 480, quality = 0.85) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width  * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  return new Promise((res, rej) => {
    canvas.toBlob((b) => b ? res(b) : rej(new Error("encode failed")),
                  "image/jpeg", quality);
  });
}

const fmtDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
};

const fmtDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
};

const todayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (toastEl.hidden = true), 1800);
}

const STATUSES = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["showing", "Showing"],
  ["offer", "Offer"],
  ["under_contract", "Under contract"],
  ["closed", "Closed"],
  ["nurture", "Nurture"],
  ["lost", "Lost"],
];
const TYPES = [
  ["buyer", "Buyer"], ["seller", "Seller"], ["both", "Both"],
  ["investor", "Investor"], ["renter", "Renter"], ["other", "Other"],
];
const label = (pairs, key) => pairs.find((p) => p[0] === key)?.[1] ?? key;

// --- routing --------------------------------------------------------------

const routes = [
  [/^$/,                 renderToday],
  [/^\/$/,               renderToday],
  [/^\/leads$/,          renderLeads],
  [/^\/new$/,            renderNewLead],
  [/^\/newsletter$/,     renderNewsletter],
  [/^\/newsletter\/(.+)$/, renderNewsletterDetail],
  [/^\/settings$/,       renderSettings],
  [/^\/lead\/(.+)$/,     renderLeadDetail],
];

async function route() {
  // getSession reads from localStorage — effectively instant, no need to
  // race it against a timeout.
  const { data: { session } } = await sb.auth.getSession();

  // If the stored token is close to expiry, nudge a refresh but DON'T
  // force sign-out on network failure. Supabase's autoRefreshToken is
  // already watching this in the background; a bad wifi moment shouldn't
  // kick Gaydonne out — she'll try again in a second.
  if (session && session.expires_at && session.expires_at * 1000 < Date.now() + 30000) {
    try { await sb.auth.refreshSession(); } catch (_) { /* leave existing session */ }
  }

  const live = (await sb.auth.getSession()).data.session;
  signOutBtn.hidden = !live;
  navEl.hidden = !live;
  if (!live) return renderSignIn();

  const hash = location.hash.replace(/^#/, "");
  for (const [re, fn] of routes) {
    const m = hash.match(re);
    if (m) {
      view.replaceChildren();
      try {
        await fn(...m.slice(1));
      } catch (e) {
        console.error(e);
        view.replaceChildren(h("p", { class: "muted" },
          "Couldn't load that page. Check your connection and try again."));
      }
      updateTabs();
      return;
    }
  }
  location.hash = "#/";
}

function updateTabs() {
  const hash = location.hash || "#/";
  for (const a of document.querySelectorAll(".tabs a")) {
    a.classList.toggle("active", a.getAttribute("href") === hash);
  }
}

window.addEventListener("hashchange", route);

// Only re-route on real sign-in-state changes. TOKEN_REFRESHED and
// USER_UPDATED fire during normal background work and shouldn't tear down
// and re-render the page.
sb.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "INITIAL_SESSION") {
    route();
  }
});
function hardSignOut() {
  // Clear every supabase-js auth key, synchronous and uncancellable.
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("sb-") || k.includes("supabase")) localStorage.removeItem(k);
    }
  } catch (_) {}
  // Kick off the SDK sign-out too, but don't wait for it.
  try { sb.auth.signOut({ scope: "local" }); } catch (_) {}
  // Force a top-level navigation (not just a hash change) to the portal root.
  location.href = location.pathname;
}
signOutBtn.addEventListener("click", hardSignOut);

// --- views ----------------------------------------------------------------

function renderSignIn() {
  view.replaceChildren();
  const email = h("input", {
    type: "email", placeholder: "Email", autocomplete: "username", required: true,
  });
  const password = h("input", {
    type: "password", placeholder: "Password",
    autocomplete: "current-password", required: true,
  });
  const err = h("p", { class: "muted", style: "color:#b00020;min-height:1.1em" });
  const form = h(
    "form",
    {
      class: "stack",
      onsubmit: async (e) => {
        e.preventDefault();
        err.textContent = "";
        const { error } = await sb.auth.signInWithPassword({
          email: email.value.trim(),
          password: password.value,
        });
        if (error) {
          err.textContent = error.message;
          console.error("sign-in failed", error);
        }
      },
    },
    h("h1", {}, "Sign in"),
    email,
    password,
    err,
    h("button", { class: "btn block", type: "submit" }, "Sign in"),
  );
  view.append(h("div", { class: "signin" }, form));
}

async function renderToday() {
  view.append(h("h1", {}, "Today"));

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const { data: dueToday } = await sb
    .from("leads")
    .select("id, first_name, last_name, phone, email, status, next_follow_up_at, next_follow_up_note")
    .eq("archived", false)
    .gte("next_follow_up_at", new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
    .lte("next_follow_up_at", endOfToday.toISOString())
    .order("next_follow_up_at", { ascending: true });

  const { data: overdue } = await sb
    .from("leads")
    .select("id, first_name, last_name, phone, email, status, next_follow_up_at, next_follow_up_note")
    .eq("archived", false)
    .lt("next_follow_up_at", new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
    .order("next_follow_up_at", { ascending: true });

  view.append(h("h2", {}, "Due today"));
  if (!dueToday?.length) {
    view.append(h("p", { class: "muted" }, "Nothing due today."));
  } else {
    for (const l of dueToday) view.append(leadCard(l));
  }

  view.append(h("h2", {}, "Overdue"));
  if (!overdue?.length) {
    view.append(h("p", { class: "muted" }, "Nothing overdue."));
  } else {
    for (const l of overdue) view.append(leadCard(l, { overdue: true }));
  }

  // Upcoming dates (30 days: birthdays, anniversaries, closings) ------
  const upcoming = await fetchUpcomingDates(30);
  if (upcoming.length) {
    view.append(h("h2", {}, "Dates coming up"));
    for (const u of upcoming) {
      view.append(h("a", { class: "card", href: `#/lead/${u.lead_id}` },
        h("span", { class: "badge" }, u.kind),
        h("span", { class: "name" }, u.name),
        h("div", { class: "meta" }, u.when),
      ));
    }
  }

  view.append(h("h2", {}, "New & recent"));
  const { data: recent } = await sb
    .from("leads")
    .select("id, first_name, last_name, phone, email, status, created_at")
    .eq("archived", false)
    .order("created_at", { ascending: false })
    .limit(10);
  for (const l of recent ?? []) view.append(leadCard(l));
}

async function fetchUpcomingDates(daysAhead) {
  const [{ data: leads }, { data: people }] = await Promise.all([
    sb.from("leads").select("id, first_name, last_name, birthday, anniversary, closing_date").eq("archived", false),
    sb.from("people").select("lead_id, name, relationship, birthday"),
  ]);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + daysAhead * 86400000);
  const items = [];
  const nameOf = (l) => [l.first_name, l.last_name].filter(Boolean).join(" ");
  const leadById = new Map((leads ?? []).map((l) => [l.id, l]));

  const addRecurring = (dateStr, kind, leadId, display) => {
    if (!dateStr) return;
    const [, m, d] = dateStr.split("-").map(Number);
    for (let yr = start.getFullYear(); yr <= end.getFullYear(); yr++) {
      const occ = new Date(yr, m - 1, d);
      if (occ >= start && occ <= end) {
        items.push({ when: occ, display: fmtDate(occ.toISOString()), kind, lead_id: leadId, name: display });
        return;
      }
    }
  };
  const addOnce = (dateStr, kind, leadId, display) => {
    if (!dateStr) return;
    const occ = new Date(dateStr + "T00:00:00");
    if (occ >= start && occ <= end) {
      items.push({ when: occ, display: fmtDate(occ.toISOString()), kind, lead_id: leadId, name: display });
    }
  };

  for (const l of leads ?? []) {
    addRecurring(l.birthday,    "BIRTHDAY",    l.id, nameOf(l));
    addRecurring(l.anniversary, "ANNIVERSARY", l.id, nameOf(l));
    addOnce(l.closing_date,     "CLOSING",     l.id, nameOf(l));
  }
  for (const p of people ?? []) {
    const l = leadById.get(p.lead_id);
    if (!l) continue;
    const label = `${p.name}${p.relationship ? " (" + p.relationship + ")" : ""} — ${nameOf(l)}`;
    addRecurring(p.birthday, "BIRTHDAY", l.id, label);
  }
  items.sort((a, b) => a.when - b.when);
  return items.map((i) => ({ ...i, when: i.display }));
}

function leadCard(l, { overdue = false } = {}) {
  const name = [l.first_name, l.last_name].filter(Boolean).join(" ");
  const meta = [
    l.phone, l.email,
    l.next_follow_up_at ? `Follow up ${fmtDateTime(l.next_follow_up_at)}` :
      l.created_at ? `Added ${fmtDate(l.created_at)}` : null,
  ].filter(Boolean).join(" · ");
  return h(
    "a",
    { class: "card" + (overdue ? " overdue" : ""), href: `#/lead/${l.id}` },
    h("span", { class: "badge" }, label(STATUSES, l.status)),
    h("span", { class: "name" }, name),
    h("div", { class: "meta" }, meta),
    l.next_follow_up_note ? h("div", { class: "meta" }, l.next_follow_up_note) : null,
  );
}

// Compact square card for the grid view on /leads.
function leadTile(l) {
  const name = [l.first_name, l.last_name].filter(Boolean).join(" ") || "—";
  const bits = [];
  if (l.next_follow_up_at) bits.push(`Follow up ${fmtDate(l.next_follow_up_at)}`);
  else if (l.updated_at) bits.push(`Updated ${fmtDate(l.updated_at)}`);
  else if (l.created_at) bits.push(`Added ${fmtDate(l.created_at)}`);
  const avatar = l.photo_url
    ? h("span", { class: "tile-avatar" },
        h("img", { src: l.photo_url, alt: "", loading: "lazy" }))
    : h("span", { class: "tile-avatar placeholder" }, initialsOf(l));
  return h(
    "a",
    { class: "tile", href: `#/lead/${l.id}` },
    h("div", { class: "tile-head" },
      h("span", { class: "badge" }, label(STATUSES, l.status)),
      avatar,
    ),
    h("div", { class: "tile-name" }, name),
    l.phone ? h("div", { class: "tile-line" }, l.phone) : null,
    l.email ? h("div", { class: "tile-line truncate" }, l.email) : null,
    h("div", { class: "tile-foot" }, bits.join(" · ")),
  );
}

// --- persistent view prefs for /leads ------------------------------------

const LEADS_VIEW_KEY = "gaydonneCRM.leadsView.v1";
const SORT_OPTIONS = [
  ["updated_desc",    "Recently updated",      { col: "updated_at", asc: false }],
  ["created_desc",    "Newest added",          { col: "created_at", asc: false }],
  ["created_asc",     "Oldest added",          { col: "created_at", asc: true }],
  ["last_name_asc",   "Last name A → Z",       { col: "last_name", asc: true,  nullsFirst: false }],
  ["last_name_desc",  "Last name Z → A",       { col: "last_name", asc: false, nullsFirst: false }],
  ["first_name_asc",  "First name A → Z",      { col: "first_name", asc: true, nullsFirst: false }],
  ["followup_asc",    "Follow-up soonest",     { col: "next_follow_up_at", asc: true, nullsFirst: false }],
];

function loadLeadsView() {
  try {
    const raw = localStorage.getItem(LEADS_VIEW_KEY);
    if (!raw) return {};
    const v = JSON.parse(raw);
    return (v && typeof v === "object") ? v : {};
  } catch { return {}; }
}
function saveLeadsView(v) {
  try { localStorage.setItem(LEADS_VIEW_KEY, JSON.stringify(v)); } catch {}
}

async function renderLeads() {
  const prefs = {
    sort:   "updated_desc",
    status: "",
    type:   "",
    search: "",
    ...loadLeadsView(),
  };

  view.append(h("h1", {}, "Leads"));

  const search = h("input", {
    placeholder: "Search name, email, phone",
    value: prefs.search,
  });
  const statusSel = h("select", {},
    h("option", { value: "" }, "All statuses"),
    ...STATUSES.map(([v, t]) => h("option", { value: v }, t)));
  const typeSel = h("select", {},
    h("option", { value: "" }, "All types"),
    ...TYPES.map(([v, t]) => h("option", { value: v }, t)));
  const sortSel = h("select", {},
    ...SORT_OPTIONS.map(([v, t]) => h("option", { value: v }, t)));
  statusSel.value = prefs.status;
  typeSel.value   = prefs.type;
  sortSel.value   = prefs.sort;

  const grid = h("div", { class: "tiles" });
  const countLine = h("p", { class: "muted", style: "margin:0 0 0.75rem" }, "");

  async function refresh() {
    const sortDef = (SORT_OPTIONS.find((o) => o[0] === sortSel.value)
                  ?? SORT_OPTIONS[0])[2];
    let q = sb.from("leads")
      .select("id, first_name, last_name, phone, email, status, created_at, updated_at, next_follow_up_at, photo_url")
      .eq("archived", false)
      .order(sortDef.col, {
        ascending: sortDef.asc,
        nullsFirst: sortDef.nullsFirst ?? !sortDef.asc,
      })
      .limit(500);
    if (statusSel.value) q = q.eq("status", statusSel.value);
    if (typeSel.value)   q = q.eq("type", typeSel.value);
    const term = search.value.trim();
    if (term) {
      const t = term.replace(/[%,]/g, "");
      q = q.or(
        `first_name.ilike.%${t}%,last_name.ilike.%${t}%,email.ilike.%${t}%,phone.ilike.%${t}%`,
      );
    }
    const { data } = await q;
    grid.replaceChildren();
    if (!data?.length) {
      countLine.textContent = "";
      grid.append(h("p", { class: "muted" }, "No leads match."));
    } else {
      countLine.textContent = `${data.length} lead${data.length === 1 ? "" : "s"}`;
      for (const l of data) grid.append(leadTile(l));
    }
  }

  function persist() {
    saveLeadsView({
      sort:   sortSel.value,
      status: statusSel.value,
      type:   typeSel.value,
      search: search.value,
    });
  }

  const bar = h("div", { class: "toolbar" }, search, sortSel, statusSel, typeSel);
  const actions = h(
    "div",
    { class: "toolbar" },
    h("a", { class: "btn outline", href: "#/new" }, "Add lead"),
    h("button", {
      class: "btn outline",
      onclick: () => exportCsv(),
    }, "Export CSV"),
  );
  view.append(bar, actions, countLine, grid);

  const onChange = () => { persist(); refresh(); };
  search.addEventListener("input", debounce(onChange, 200));
  statusSel.addEventListener("change", onChange);
  typeSel.addEventListener("change", onChange);
  sortSel.addEventListener("change", onChange);
  refresh();
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

async function exportCsv() {
  const [{ data: leads }, { data: acts }] = await Promise.all([
    sb.from("leads").select("*"),
    sb.from("activities").select("*").order("created_at", { ascending: true }),
  ]);
  const toCSV = (rows) => {
    if (!rows?.length) return "";
    const cols = Object.keys(rows[0]);
    const esc = (v) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  };
  const blob = new Blob(
    [
      "# leads\n", toCSV(leads), "\n\n# activities\n", toCSV(acts), "\n",
    ],
    { type: "text/csv" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gaydonne-crm-${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function renderNewLead() {
  view.append(h("h1", {}, "New lead"));
  const f = {
    first_name: h("input", { required: true }),
    last_name:  h("input"),
    email:      h("input", { type: "email" }),
    phone:      h("input", { type: "tel" }),
    type:       h("select", {}, ...TYPES.map(([v, t]) => h("option", { value: v }, t))),
    source:     h("input", { placeholder: "e.g. open house, sign call, referral" }),
    interest:   h("input", { placeholder: "Property or area" }),
    price_min:  h("input", { type: "number", min: "0" }),
    price_max:  h("input", { type: "number", min: "0" }),
    preapproved:h("select", {},
                  h("option", { value: "" }, "Unknown"),
                  h("option", { value: "true" }, "Yes"),
                  h("option", { value: "false" }, "No")),
    timeline:   h("input", { placeholder: "e.g. 30-60 days" }),
    street:     h("input", { autocomplete: "street-address" }),
    city:       h("input", { autocomplete: "address-level2" }),
    state:      h("input", { autocomplete: "address-level1", maxlength: 2 }),
    zip:        h("input", { autocomplete: "postal-code", inputmode: "numeric" }),
    notes:      h("textarea", { placeholder: "Notes" }),
  };
  const field = (lbl, el) => h("div", {}, h("label", {}, lbl), el);
  const form = h(
    "form",
    {
      class: "stack",
      onsubmit: async (e) => {
        e.preventDefault();
        if (!f.first_name.value.trim()) return;
        if (!f.email.value.trim() && !f.phone.value.trim()) {
          toast("Need an email or phone");
          return;
        }
        const payload = {
          first_name: f.first_name.value.trim(),
          last_name:  f.last_name.value.trim() || null,
          email:      f.email.value.trim().toLowerCase() || null,
          phone:      f.phone.value.trim() || null,
          type:       f.type.value,
          source:     f.source.value.trim() || null,
          interest:   f.interest.value.trim() || null,
          price_min:  f.price_min.value ? Number(f.price_min.value) : null,
          price_max:  f.price_max.value ? Number(f.price_max.value) : null,
          preapproved: f.preapproved.value === "" ? null : f.preapproved.value === "true",
          timeline:   f.timeline.value.trim() || null,
          street:     f.street.value.trim() || null,
          city:       f.city.value.trim()   || null,
          state:      f.state.value.trim().toUpperCase() || null,
          zip:        f.zip.value.trim()    || null,
        };
        const { data, error } = await sb.from("leads").insert(payload).select("id").single();
        if (error) { toast(error.message); return; }
        if (f.notes.value.trim()) {
          await sb.from("activities").insert({ lead_id: data.id, kind: "note", body: f.notes.value.trim() });
        }
        location.hash = `#/lead/${data.id}`;
      },
    },
    field("First name *", f.first_name),
    field("Last name",    f.last_name),
    field("Email",        f.email),
    field("Phone",        f.phone),
    field("Type",         f.type),
    field("Source",       f.source),
    field("Interest",     f.interest),
    field("Price min",    f.price_min),
    field("Price max",    f.price_max),
    field("Pre-approved", f.preapproved),
    field("Timeline",     f.timeline),
    h("h3", { style: "margin-top:1rem" }, "Current address"),
    field("Street", f.street),
    field("City",   f.city),
    field("State",  f.state),
    field("ZIP",    f.zip),
    field("Notes",  f.notes),
    h("button", { class: "btn block", type: "submit" }, "Save lead"),
  );
  view.append(form);
}

// --- newsletter -----------------------------------------------------------

async function renderNewsletter() {
  view.append(h("h1", {}, "Newsletter"));

  // Load eligible leads (email on file, not opted out, not archived).
  const { data: leads } = await sb.from("leads")
    .select("id, first_name, last_name, email, status, type, email_opt_out")
    .eq("archived", false)
    .not("email", "is", null)
    .order("created_at", { ascending: false });
  const eligible = (leads ?? []).filter((l) => !l.email_opt_out);

  view.append(h("p", { class: "muted" },
    `${eligible.length} lead${eligible.length === 1 ? "" : "s"} with email on file`
    + ((leads?.length ?? 0) - eligible.length > 0
      ? ` · ${(leads?.length ?? 0) - eligible.length} opted out`
      : "")));

  // --- compose form ---------------------------------------------------
  const subject = h("input", { placeholder: "Subject line", required: true });
  const bodyText = h("textarea", {
    placeholder: "Message body. Use {{name}} to insert the recipient's name.",
    required: true, style: "min-height:10rem",
  });

  // Recipient mode radios -----------------------------------------
  const modeAll = h("input", { type: "radio", name: "mode", value: "all", checked: true });
  const modeFilter = h("input", { type: "radio", name: "mode", value: "filter" });
  const modePick = h("input", { type: "radio", name: "mode", value: "selected" });

  const statusSel = h("select", { disabled: true },
    h("option", { value: "" }, "Any status"),
    ...STATUSES.map(([v, t]) => h("option", { value: v }, t)));
  const typeSel = h("select", { disabled: true },
    h("option", { value: "" }, "Any type"),
    ...TYPES.map(([v, t]) => h("option", { value: v }, t)));

  const pickList = h("div", { style: "max-height:16rem;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:0.5rem;display:none" });
  const checkboxes = new Map();
  for (const l of eligible) {
    const cb = h("input", { type: "checkbox", value: l.id, style: "margin-right:0.5rem" });
    checkboxes.set(l.id, cb);
    const name = [l.first_name, l.last_name].filter(Boolean).join(" ") || "(no name)";
    pickList.append(h("label", {
      style: "display:flex;align-items:center;padding:0.3rem 0;text-transform:none;letter-spacing:0;font-size:0.9rem;color:var(--text)",
    }, cb, h("span", {}, `${name} — ${l.email}`)));
  }

  const countMsg = h("p", { class: "muted hint" }, `Will send to ${eligible.length}`);

  const updateCount = () => {
    const mode = [modeAll, modeFilter, modePick].find((r) => r.checked)?.value;
    let n;
    if (mode === "all") {
      n = eligible.length;
    } else if (mode === "filter") {
      n = eligible.filter((l) =>
        (!statusSel.value || l.status === statusSel.value) &&
        (!typeSel.value   || l.type   === typeSel.value)
      ).length;
    } else {
      n = [...checkboxes.values()].filter((cb) => cb.checked).length;
    }
    countMsg.textContent = `Will send to ${n}`;
  };

  const applyMode = () => {
    const mode = [modeAll, modeFilter, modePick].find((r) => r.checked)?.value;
    statusSel.disabled = typeSel.disabled = mode !== "filter";
    pickList.style.display = mode === "selected" ? "block" : "none";
    updateCount();
  };
  [modeAll, modeFilter, modePick].forEach((r) => r.addEventListener("change", applyMode));
  [statusSel, typeSel].forEach((s) => s.addEventListener("change", updateCount));
  pickList.addEventListener("change", updateCount);

  const sendBtn = h("button", { class: "btn block", type: "submit" }, "Send newsletter");
  const errMsg = h("p", { style: "min-height:1.1em;color:#b00020" });

  const form = h("form", {
    class: "stack",
    onsubmit: async (e) => {
      e.preventDefault();
      errMsg.textContent = "";
      const mode = [modeAll, modeFilter, modePick].find((r) => r.checked)?.value;
      const payload = {
        subject: subject.value.trim(),
        body_text: bodyText.value.trim(),
        recipients: { mode },
      };
      if (!payload.subject || !payload.body_text) {
        errMsg.textContent = "Subject and body are required.";
        return;
      }
      if (mode === "selected") {
        payload.recipients.ids = [...checkboxes.entries()]
          .filter(([, cb]) => cb.checked).map(([id]) => id);
        if (!payload.recipients.ids.length) {
          errMsg.textContent = "Pick at least one lead.";
          return;
        }
      } else if (mode === "filter") {
        payload.recipients.filter = {};
        if (statusSel.value) payload.recipients.filter.status = statusSel.value;
        if (typeSel.value)   payload.recipients.filter.type   = typeSel.value;
      }

      const match = /Will send to (\d+)/.exec(countMsg.textContent);
      const willSend = match ? Number(match[1]) : 0;
      if (willSend === 0) {
        errMsg.textContent = "No recipients match.";
        return;
      }
      if (!confirm(`Send "${payload.subject}" to ${willSend} ${willSend === 1 ? "person" : "people"}?`)) return;

      sendBtn.disabled = true;
      sendBtn.textContent = "Sending…";
      try {
        const { data: { session } } = await sb.auth.getSession();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-newsletter`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result.error || `send failed (${res.status})`);
        toast(`Sent ${result.sent} / ${result.attempted}`);
        location.hash = `#/newsletter/${result.campaign_id}`;
      } catch (err) {
        errMsg.textContent = err.message || "Send failed.";
        sendBtn.disabled = false;
        sendBtn.textContent = "Send newsletter";
      }
    },
  },
    h("h2", {}, "Compose"),
    h("label", {}, "Subject"), subject,
    h("label", {}, "Body"), bodyText,
    h("p", { class: "muted hint" }, "{{name}} will be replaced with the recipient's name."),

    h("h2", {}, "Recipients"),
    h("label", { style: "text-transform:none;letter-spacing:0;color:var(--text);font-size:0.95rem" },
      modeAll, " All eligible leads"),
    h("label", { style: "text-transform:none;letter-spacing:0;color:var(--text);font-size:0.95rem" },
      modeFilter, " Filter by status / type"),
    h("div", { class: "toolbar" }, statusSel, typeSel),
    h("label", { style: "text-transform:none;letter-spacing:0;color:var(--text);font-size:0.95rem" },
      modePick, " Pick leads"),
    pickList,

    countMsg,
    errMsg,
    sendBtn,
  );
  view.append(form);

  applyMode();

  // --- past campaigns -------------------------------------------------
  view.append(h("h2", {}, "Past newsletters"));
  const { data: campaigns } = await sb.from("newsletters")
    .select("id, created_at, subject, recipient_count, sent_count, failed_count, status")
    .order("created_at", { ascending: false })
    .limit(50);
  if (!campaigns?.length) {
    view.append(h("p", { class: "muted" }, "No newsletters sent yet."));
  } else {
    for (const c of campaigns) {
      view.append(h("a", { class: "card", href: `#/newsletter/${c.id}` },
        h("span", { class: "badge" }, c.status),
        h("span", { class: "name" }, c.subject),
        h("div", { class: "meta" },
          `${fmtDateTime(c.created_at)} · sent ${c.sent_count}/${c.recipient_count}`
          + (c.failed_count ? ` · ${c.failed_count} failed` : "")),
      ));
    }
  }
}

async function renderNewsletterDetail(id) {
  const { data: c, error } = await sb.from("newsletters").select("*").eq("id", id).maybeSingle();
  if (error || !c) {
    view.append(h("p", { class: "muted" }, "Newsletter not found."));
    return;
  }
  view.append(h("h1", {}, c.subject));
  view.append(h("p", { class: "muted" },
    `${fmtDateTime(c.created_at)} · ${c.status}`));
  view.append(h("p", {},
    `Attempted ${c.recipient_count} · sent ${c.sent_count}`
    + (c.failed_count ? ` · failed ${c.failed_count}` : "")
    + (c.skipped_count ? ` · skipped ${c.skipped_count}` : "")));

  view.append(h("h2", {}, "Body"));
  view.append(h("div", {
    style: "white-space:pre-wrap;border:1px solid var(--line);border-radius:8px;padding:1rem;background:var(--bg-alt)",
  }, c.body_text));

  view.append(h("div", { style: "margin-top:1.5rem" },
    h("a", { class: "btn outline", href: "#/newsletter" }, "Back to newsletter"),
  ));
}

async function renderSettings() {
  view.append(h("h1", {}, "Settings"));

  // Use the cached session's user instead of hitting /auth/v1/user, which
  // can hang on a bad token and leave the page blank.
  const { data: { session } } = await sb.auth.getSession();
  const user = session?.user;
  if (!user) { view.append(h("p", { class: "muted" }, "Not signed in.")); return; }

  view.append(h("p", { class: "muted" }, "Signed in as " + user.email));

  // Change email -------------------------------------------------------
  const emailInput = h("input", { type: "email", value: user.email, required: true, autocomplete: "email" });
  const emailMsg = h("p", { style: "min-height:1.1em;color:#b00020" });
  const emailForm = h(
    "form",
    {
      class: "stack",
      onsubmit: async (e) => {
        e.preventDefault();
        emailMsg.textContent = "";
        emailMsg.style.color = "#b00020";
        const newEmail = emailInput.value.trim();
        if (!newEmail || newEmail === user.email) return;
        const { error } = await sb.auth.updateUser({ email: newEmail });
        if (error) {
          emailMsg.textContent = error.message;
        } else {
          emailMsg.style.color = "var(--muted)";
          emailMsg.textContent = "Check " + newEmail + " for a confirmation link.";
        }
      },
    },
    h("h2", {}, "Change email"),
    h("label", {}, "New email"), emailInput,
    emailMsg,
    h("button", { class: "btn outline block", type: "submit" }, "Update email"),
  );
  view.append(emailForm);

  // Change password ----------------------------------------------------
  const pw1 = h("input", { type: "password", placeholder: "New password", required: true, minlength: 8, autocomplete: "new-password" });
  const pw2 = h("input", { type: "password", placeholder: "Confirm new password", required: true, minlength: 8, autocomplete: "new-password" });
  const pwMsg = h("p", { style: "min-height:1.1em;color:#b00020" });
  const pwForm = h(
    "form",
    {
      class: "stack",
      onsubmit: async (e) => {
        e.preventDefault();
        pwMsg.textContent = "";
        pwMsg.style.color = "#b00020";
        if (pw1.value !== pw2.value) { pwMsg.textContent = "Passwords don't match"; return; }
        if (pw1.value.length < 8)   { pwMsg.textContent = "At least 8 characters"; return; }
        const { error } = await sb.auth.updateUser({ password: pw1.value });
        if (error) {
          pwMsg.textContent = error.message;
        } else {
          pwMsg.style.color = "var(--muted)";
          pwMsg.textContent = "Password updated.";
          pw1.value = ""; pw2.value = "";
        }
      },
    },
    h("h2", {}, "Change password"),
    h("label", {}, "New password"), pw1,
    h("label", {}, "Confirm"), pw2,
    pwMsg,
    h("button", { class: "btn outline block", type: "submit" }, "Update password"),
  );
  view.append(pwForm);

  // Sign out ---------------------------------------------------------
  view.append(h("h2", {}, "Session"));
  view.append(h("button", {
    class: "btn", style: "margin-top:0.5rem",
    onclick: hardSignOut,
  }, "Sign out"));
}

// Photo block for the lead detail view: round preview + Upload / Remove.
function leadPhotoBlock(lead) {
  const BUCKET = "lead-photos";
  const avatar = h("div", { class: "lead-photo" });
  const render = () => {
    avatar.replaceChildren();
    if (lead.photo_url) {
      avatar.append(h("img", { src: lead.photo_url, alt: "" }));
    } else {
      avatar.append(h("span", { class: "lead-photo-initials" }, initialsOf(lead)));
    }
  };
  render();

  const fileInput = h("input", {
    type: "file", accept: "image/*", hidden: true,
    onchange: async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const blob = await resizeImage(file);
        const path = `${lead.id}.jpg`;
        const { error: upErr } = await sb.storage.from(BUCKET).upload(path, blob, {
          contentType: "image/jpeg", upsert: true, cacheControl: "60",
        });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(path);
        const url = `${publicUrl}?t=${Date.now()}`;  // cache-bust
        const { error: dbErr } = await sb.from("leads").update({ photo_url: url }).eq("id", lead.id);
        if (dbErr) throw dbErr;
        lead.photo_url = url;
        render();
        toast("Photo updated");
      } catch (e) {
        toast(e.message || "Upload failed");
      } finally {
        fileInput.value = "";
      }
    },
  });

  const uploadBtn = h("button", {
    class: "btn outline",
    type: "button",
    onclick: () => fileInput.click(),
  }, lead.photo_url ? "Change photo" : "Add photo");

  const removeBtn = h("button", {
    class: "link",
    type: "button",
    hidden: !lead.photo_url,
    onclick: async () => {
      if (!confirm("Remove photo?")) return;
      const path = `${lead.id}.jpg`;
      await sb.storage.from(BUCKET).remove([path]);  // best-effort
      const { error } = await sb.from("leads").update({ photo_url: null }).eq("id", lead.id);
      if (error) { toast(error.message); return; }
      lead.photo_url = null;
      render();
      removeBtn.hidden = true;
      uploadBtn.textContent = "Add photo";
      toast("Photo removed");
    },
  }, "Remove");

  // Keep the Remove button in sync when the user uploads a fresh photo.
  fileInput.addEventListener("change", () => {
    setTimeout(() => {
      removeBtn.hidden = !lead.photo_url;
      uploadBtn.textContent = lead.photo_url ? "Change photo" : "Add photo";
    }, 0);
  });

  return h("div", { class: "lead-photo-block" },
    avatar,
    h("div", { class: "lead-photo-actions" }, uploadBtn, removeBtn, fileInput),
  );
}

async function renderLeadDetail(id) {
  const [{ data: lead, error }, { data: acts }, { data: people }] = await Promise.all([
    sb.from("leads").select("*").eq("id", id).maybeSingle(),
    sb.from("activities").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    sb.from("people").select("*").eq("lead_id", id).order("created_at", { ascending: true }),
  ]);
  if (error || !lead) {
    view.append(h("p", { class: "muted" }, "Lead not found."));
    return;
  }

  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ");
  view.append(h("h1", {}, name));

  // Photo ----------------------------------------------------------------
  view.append(leadPhotoBlock(lead));

  // One-tap actions ------------------------------------------------------
  const actions = h("div", { class: "actions-row" });
  if (lead.phone) {
    actions.append(
      h("a", { class: "btn", href: `tel:${lead.phone}`, onclick: () => quickLog(id, "call") }, "Call"),
      h("a", { class: "btn", href: `sms:${lead.phone}`, onclick: () => quickLog(id, "text") }, "Text"),
    );
  } else {
    actions.append(h("button", { class: "btn", disabled: true }, "Call"));
    actions.append(h("button", { class: "btn", disabled: true }, "Text"));
  }
  if (lead.email) {
    actions.append(h("a", { class: "btn", href: `mailto:${lead.email}`, onclick: () => quickLog(id, "email") }, "Email"));
  } else {
    actions.append(h("button", { class: "btn", disabled: true }, "Email"));
  }
  view.append(actions);

  // Contact (editable) ---------------------------------------------------
  const c = {
    first_name: h("input", { value: esc(lead.first_name), autocomplete: "given-name" }),
    last_name:  h("input", { value: esc(lead.last_name),  autocomplete: "family-name" }),
    email:      h("input", { type: "email", value: esc(lead.email), autocomplete: "email" }),
    phone:      h("input", { type: "tel",   value: esc(lead.phone), autocomplete: "tel" }),
    street:     h("input", { value: esc(lead.street), autocomplete: "street-address", placeholder: "Street" }),
    city:       h("input", { value: esc(lead.city),   autocomplete: "address-level2",  placeholder: "City" }),
    state:      h("input", { value: esc(lead.state),  autocomplete: "address-level1",  placeholder: "State", maxlength: 2 }),
    zip:        h("input", { value: esc(lead.zip),    autocomplete: "postal-code",     placeholder: "ZIP",   inputmode: "numeric" }),
  };
  const contactForm = h(
    "form",
    {
      class: "stack",
      onsubmit: async (e) => {
        e.preventDefault();
        const first = c.first_name.value.trim();
        if (!first) { toast("First name is required"); return; }
        const email = c.email.value.trim().toLowerCase() || null;
        const phone = c.phone.value.trim() || null;
        if (!email && !phone) { toast("Need an email or phone"); return; }
        const { error } = await sb.from("leads").update({
          first_name: first,
          last_name:  c.last_name.value.trim() || null,
          email, phone,
          street: c.street.value.trim() || null,
          city:   c.city.value.trim()   || null,
          state:  c.state.value.trim().toUpperCase() || null,
          zip:    c.zip.value.trim()    || null,
        }).eq("id", id);
        if (error) toast(error.message);
        else { toast("Contact saved"); route(); }
      },
    },
    h("h2", {}, "Contact"),
    h("label", {}, "First name"), c.first_name,
    h("label", {}, "Last name"),  c.last_name,
    h("label", {}, "Email"), c.email,
    h("label", {}, "Phone"), c.phone,
    h("h3", { style: "margin-top:1rem" }, "Current address"),
    h("label", {}, "Street"), c.street,
    h("label", {}, "City"),   c.city,
    h("label", {}, "State"),  c.state,
    h("label", {}, "ZIP"),    c.zip,
    h("button", { class: "btn outline block", type: "submit", style: "margin-top:0.5rem" }, "Save contact"),
  );
  if (lead.source || lead.source_page) {
    contactForm.append(h("p", { class: "muted hint" },
      "Source: " + [lead.source, lead.source_page].filter(Boolean).join(" · ")));
  }
  view.append(contactForm);

  // Status + type --------------------------------------------------------
  const statusSel = h("select", {}, ...STATUSES.map(([v, t]) =>
    h("option", { value: v, selected: v === lead.status || undefined }, t)));
  const typeSel = h("select", {}, ...TYPES.map(([v, t]) =>
    h("option", { value: v, selected: v === lead.type || undefined }, t)));
  statusSel.addEventListener("change", async () => {
    const prev = lead.status;
    const { error } = await sb.from("leads").update({ status: statusSel.value }).eq("id", id);
    if (error) { toast(error.message); return; }
    await sb.from("activities").insert({
      lead_id: id, kind: "status_change",
      body: `${label(STATUSES, prev)} → ${label(STATUSES, statusSel.value)}`,
    });
    toast("Status updated");
    route();
  });
  typeSel.addEventListener("change", async () => {
    const { error } = await sb.from("leads").update({ type: typeSel.value }).eq("id", id);
    if (error) toast(error.message);
    else toast("Type updated");
  });

  view.append(
    h("h2", {}, "Status"),
    h("label", {}, "Status"), statusSel,
    h("label", {}, "Type"), typeSel,
  );

  // Lead details form ----------------------------------------------------
  const d = {
    interest:   h("input", { value: esc(lead.interest) }),
    price_min:  h("input", { type: "number", value: lead.price_min ?? "" }),
    price_max:  h("input", { type: "number", value: lead.price_max ?? "" }),
    preapproved:h("select", {},
                  h("option", { value: "", selected: lead.preapproved == null || undefined }, "Unknown"),
                  h("option", { value: "true",  selected: lead.preapproved === true  || undefined }, "Yes"),
                  h("option", { value: "false", selected: lead.preapproved === false || undefined }, "No"),
                ),
    timeline:   h("input", { value: esc(lead.timeline) }),
    birthday:   h("input", { type: "date", value: lead.birthday ?? "" }),
    anniversary:h("input", { type: "date", value: lead.anniversary ?? "" }),
    closing:    h("input", { type: "date", value: lead.closing_date ?? "" }),
  };
  const detailsForm = h("form", {
    class: "stack",
    onsubmit: async (e) => {
      e.preventDefault();
      const { error } = await sb.from("leads").update({
        interest:   d.interest.value.trim() || null,
        price_min:  d.price_min.value ? Number(d.price_min.value) : null,
        price_max:  d.price_max.value ? Number(d.price_max.value) : null,
        preapproved: d.preapproved.value === "" ? null : d.preapproved.value === "true",
        timeline:   d.timeline.value.trim() || null,
        birthday:   d.birthday.value || null,
        anniversary: d.anniversary.value || null,
        closing_date: d.closing.value || null,
      }).eq("id", id);
      if (error) toast(error.message);
      else toast("Saved");
    },
  },
    h("h2", {}, "Details"),
    h("label", {}, "Interest"), d.interest,
    h("label", {}, "Price min"), d.price_min,
    h("label", {}, "Price max"), d.price_max,
    h("label", {}, "Pre-approved"), d.preapproved,
    h("label", {}, "Timeline"), d.timeline,
    h("h3", { style: "margin-top:1rem" }, "Dates"),
    h("label", {}, "Birthday"), d.birthday,
    h("label", {}, "Anniversary"), d.anniversary,
    h("label", {}, "Closing date"), d.closing,
    h("button", { class: "btn outline block", type: "submit" }, "Save details"),
  );
  view.append(detailsForm);

  // Family --------------------------------------------------------------
  view.append(h("h2", {}, "Family"));
  const renderPersonRow = (p) => {
    const name  = h("input", { value: esc(p?.name) });
    const rel   = h("input", { value: esc(p?.relationship), placeholder: "spouse, son, daughter…" });
    const bday  = h("input", { type: "date", value: p?.birthday ?? "" });
    const notes = h("input", { value: esc(p?.notes), placeholder: "Notes" });
    return h(
      "form",
      {
        class: "stack",
        style: "border-top:1px solid var(--line);padding-top:0.75rem;margin-top:0.75rem",
        onsubmit: async (e) => {
          e.preventDefault();
          const payload = {
            name: name.value.trim(),
            relationship: rel.value.trim() || null,
            birthday: bday.value || null,
            notes: notes.value.trim() || null,
          };
          if (!payload.name) { toast("Name required"); return; }
          const res = p?.id
            ? await sb.from("people").update(payload).eq("id", p.id)
            : await sb.from("people").insert({ ...payload, lead_id: id });
          if (res.error) toast(res.error.message);
          else { toast(p?.id ? "Saved" : "Added"); route(); }
        },
      },
      h("label", {}, "Name"), name,
      h("label", {}, "Relationship"), rel,
      h("label", {}, "Birthday"), bday,
      h("label", {}, "Notes"), notes,
      h("button", { class: "btn outline block", type: "submit" }, p?.id ? "Save" : "Add"),
      p?.id ? h("button", {
        class: "link", type: "button", style: "margin-top:0.25rem;align-self:center",
        onclick: async () => {
          if (!confirm("Remove " + (p.name || "this person") + "?")) return;
          await sb.from("people").delete().eq("id", p.id);
          route();
        },
      }, "Remove") : null,
    );
  };
  for (const p of people ?? []) view.append(renderPersonRow(p));
  view.append(renderPersonRow(null));

  // Follow-up ------------------------------------------------------------
  const fuDate = h("input", {
    type: "datetime-local",
    value: lead.next_follow_up_at ? toLocalInput(lead.next_follow_up_at) : "",
  });
  const fuNote = h("input", { value: esc(lead.next_follow_up_note), placeholder: "What to do" });
  const fuForm = h("form", {
    class: "stack",
    onsubmit: async (e) => {
      e.preventDefault();
      const { error } = await sb.from("leads").update({
        next_follow_up_at: fuDate.value ? new Date(fuDate.value).toISOString() : null,
        next_follow_up_note: fuNote.value.trim() || null,
      }).eq("id", id);
      if (error) toast(error.message);
      else toast("Follow-up set");
    },
  },
    h("h2", {}, "Follow-up"),
    h("label", {}, "When"), fuDate,
    h("label", {}, "Note"), fuNote,
    h("button", { class: "btn outline block", type: "submit" }, "Set follow-up"),
  );
  view.append(fuForm);

  // Activity log + quick note -------------------------------------------
  view.append(h("h2", {}, "Activity"));
  const noteBox = h("textarea", { placeholder: "Add a note" });
  const noteForm = h("form", {
    class: "stack",
    onsubmit: async (e) => {
      e.preventDefault();
      const body = noteBox.value.trim();
      if (!body) return;
      await sb.from("activities").insert({ lead_id: id, kind: "note", body });
      noteBox.value = "";
      toast("Note saved");
      route();
    },
  }, noteBox, h("button", { class: "btn block", type: "submit" }, "Save note"));
  view.append(noteForm);

  view.append(h("div", { class: "actions-row" },
    h("button", { class: "btn outline", onclick: () => quickLog(id, "call", true) }, "Logged: Called"),
    h("button", { class: "btn outline", onclick: () => quickLog(id, "text", true) }, "Logged: Texted"),
    h("button", { class: "btn outline", onclick: () => quickLog(id, "showing", true) }, "Logged: Showed"),
  ));

  const activityList = h("div", {});
  for (const a of acts ?? []) {
    activityList.append(h("div", { class: "activity" },
      h("div", { class: "when" }, `${fmtDateTime(a.created_at)} · ${a.kind.replace("_", " ")}`),
      a.body ? h("div", { class: "body" }, a.body) : null,
    ));
  }
  view.append(activityList);

  // Archive --------------------------------------------------------------
  view.append(h("div", { style: "margin: 2rem 0 1rem" },
    h("button", {
      class: "link",
      onclick: async () => {
        if (!confirm("Archive this lead?")) return;
        await sb.from("leads").update({ archived: true }).eq("id", id);
        location.hash = "#/leads";
      },
    }, lead.archived ? "Archived" : "Archive lead"),
  ));
}

async function quickLog(leadId, kind, refresh = false) {
  await sb.from("activities").insert({ lead_id: leadId, kind });
  if (refresh) { toast("Logged"); route(); }
}

function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// --- boot -----------------------------------------------------------------

route();
