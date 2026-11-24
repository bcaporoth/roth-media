import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import QuoteBuilder from "../../../../components/QuoteBuilder";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { newLeadCount } from "../../../../lib/studio-data";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { getQuoteSettings, listQuotes } from "../../../../lib/quotes-server";
import { DEFAULT_BLOCKS, DEFAULT_RATE } from "../../../../lib/quotes";
import "../../../theme/walkin.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quotes — Command Center", robots: { index: false } };

// Labels on an Inbox row that are contact details, not what they asked for.
const SKIP = /^(first name|last name|email|phone|name|what it's for|pay link|best way to reach|for$)/i;

// Studio → Money → Quotes (2026-11-15). ?from=<inbox row id> starts a new
// quote with that person's details and answers filled in.
export default async function QuotesAdmin({ searchParams }) {
  const user = await requireAdminPage();
  const sp = await searchParams;
  const newCount = await newLeadCount();
  let quotes = [];
  let settings = { rate: DEFAULT_RATE, blocks: DEFAULT_BLOCKS };
  let prefill = null;
  let asked = [];
  let error = "";
  if (adminConfigured) {
    const db = supabaseAdmin();
    try { [quotes, settings] = await Promise.all([listQuotes(db), getQuoteSettings(db)]); } catch (e) { error = e.message; }
    const from = String(sp?.from || "");
    if (/^[0-9a-f-]{36}$/.test(from)) {
      const { data: row } = await db.from("submissions").select("id, name, email, phone, fields").eq("id", from).maybeSingle();
      if (row) {
        const fields = Array.isArray(row.fields) ? row.fields : [];
        const get = (re) => (fields.find(([k]) => re.test(String(k))) || [])[1] || "";
        prefill = { from: row.id, name: row.name || "", email: row.email || "", phone: row.phone || "", business: get(/^business( name)?$/i) || get(/business name and location/i) || get(/^business name and what you do/i), when: get(/^when$/i) || get(/when would you like/i) || get(/^dates and times that work/i) };
        asked = fields.filter(([k, v]) => !SKIP.test(String(k)) && String(v || "").trim()).slice(0, 14).map(([k, v]) => [String(k), String(v)]);
      }
    }
    // From a client profile with no inquiry on file: just who they are.
    const cid = String(sp?.client || "");
    if (!prefill && /^[0-9a-f-]{36}$/.test(cid)) {
      const { data: c } = await db.from("clients").select("name, email, phone").eq("id", cid).maybeSingle();
      if (c) prefill = { from: "", name: c.name || "", email: c.email || "", phone: c.phone || "", business: "", when: "" };
    }
  }
  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="quotes" newCount={newCount} kick="Command Center · Money" title="Quotes">
        {error && <p className="cform-error">{error}</p>}
        <QuoteBuilder initial={quotes} settings={settings} prefill={prefill} asked={asked} />
      </StudioShell>
      <StudioFooter />
    </>
  );
}
