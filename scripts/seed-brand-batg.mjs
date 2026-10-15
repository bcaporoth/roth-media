// Seeds the pilot palette for Bake Against the Grain (docs/BRAND-PALETTE-SPEC.md §1b).
// Run ONLY with Brandon's OK, after supabase/brand.sql has run on prod:
//   node scripts/seed-brand-batg.mjs owner@their-email.com "Owner Name"
//
// What it writes — and nothing else:
//   • a clients row for Bake Against the Grain under that email (if none yet)
//   • their brand_palettes row with the business name filled in, and the
//     prize voucher's colors + fonts as a DRAFT (data._suggest.visual). The
//     portal shows the draft as "Suggested from the prize voucher: are these
//     yours?" — it only becomes their palette when they tap "Yes, use these".
// It does not send the invite: Studio → their profile → Send brand palette.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const [email, ownerName = ""] = process.argv.slice(2).map((s) => String(s || "").trim());
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "")) {
  console.error("Usage: node scripts/seed-brand-batg.mjs owner@email.com \"Owner Name\"");
  process.exit(1);
}
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// From "Printable voucher Bake Against the Grain x Roth Ventures - Prize Voucher.html"
// (Roth Ventures' design, not confirmed as their brand).
const VOUCHER = {
  from: "the prize voucher",
  colors: [
    { hex: "#faf4e6", role: "background", name: "Cream" },
    { hex: "#231913", role: "primary", name: "Espresso" },
    { hex: "#c9a24b", role: "accent", name: "Gold" },
    { hex: "#7e3a4f", role: "highlight", name: "Berry" },
    { hex: "#4a382a", role: "text", name: "Ink" },
  ],
  fonts: { headline: "Fraunces", body: "Barlow Condensed" },
};

const lower = email.toLowerCase();
let { data: client } = await db.from("clients").select("id, name, email").eq("email", lower).maybeSingle();
if (!client) {
  const { data, error } = await db.from("clients").insert({ email: lower, name: ownerName || "Bake Against the Grain" }).select("id, name, email").single();
  if (error) throw error;
  client = data;
  console.log("Added client", client);
}
const { data: cur, error: curErr } = await db.from("brand_palettes").select("client_id, data").eq("client_id", client.id).maybeSingle();
if (curErr) throw new Error(`${curErr.message} — run supabase/brand.sql first`);
const base = cur?.data || {};
const data = {
  ...base,
  business: { name: "Bake Against the Grain", ...(base.business || {}) },
  _suggest: { ...(base._suggest || {}), visual: base._suggest?.visual || VOUCHER },
};
const row = { client_id: client.id, data, updated_by: "brandon", updated_at: new Date().toISOString() };
const q = cur
  ? db.from("brand_palettes").update(row).eq("client_id", client.id)
  : db.from("brand_palettes").insert({ ...row, slug: `bake-against-the-grain-${Math.random().toString(36).slice(2, 6)}` });
const { error } = await q;
if (error) throw error;
console.log(cur ? "Updated" : "Created", "palette for", client.email, "— open it in Studio and send it from there.");
