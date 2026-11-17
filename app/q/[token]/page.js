import { notFound } from "next/navigation";
import LegalPage from "../../../components/LegalPage";
import { isAdminRequest } from "../../../lib/admin-guard";
import QuoteOffer from "../../../components/QuoteOffer";
import { adminConfigured, supabaseAdmin } from "../../../lib/supabase-admin";
import { stripe, stripeConfigured } from "../../../lib/stripe";
import { recordBooking } from "../../../lib/booking";
import { getQuoteByToken, patchQuote } from "../../../lib/quotes-server";
import { aboutTime, lineLabel, money, quoteTotals, quoteExpired, quoteExpiry, QUOTE_DAYS } from "../../../lib/quotes";
import "../../theme/walkin.css";
import { creditsFor } from "../../../lib/walkin";

export const metadata = { title: "Your quote", robots: { index: false } };
export const dynamic = "force-dynamic";

const longDay = (d) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" });

// A private quote link Brandon sends one client (Studio → Money → Quotes):
// up to three options, pick one, sign, pay in full — one page.
export default async function QuotePage({ params, searchParams }) {
  const { token } = await params;
  const sp = await searchParams;
  if (!adminConfigured) notFound();
  const db = supabaseAdmin();
  let q = await getQuoteByToken(db, token);
  if (!q || q.status === "void" || q.status === "deleted") notFound();

  // Back from Stripe: confirm with Stripe itself, never the URL.
  const s = String(sp?.s || "");
  if (q.status !== "paid" && stripeConfigured && /^cs_(live|test)_[A-Za-z0-9]+$/.test(s)) {
    try {
      const session = await stripe("GET", `/checkout/sessions/${s}`);
      if (session?.metadata?.quote === String(q.id)) {
        await recordBooking(session);
        q = await getQuoteByToken(db, token);
      }
    } catch {}
  }
  // First time the client opens it (not Brandon checking from Studio).
  if (!q.viewedAt && q.status === "sent" && !(await isAdminRequest())) {
    try { q = await patchQuote(db, q.id, { viewedAt: new Date().toISOString() }); } catch {}
  }

  const first = String(q.name || "").trim().split(/\s+/)[0] || "Hi";
  const kick = q.business ? `Quote · ${q.business}` : "Your quote";

  if (q.status === "paid") {
    const opt = (q.options || [])[q.picked];
    return (
      <LegalPage kick={kick} title={`${first}, you're booked.`} updated="" plain>
        <div className="mx-done" role="status">
          <p className="mx-done-title">{money(q.paid || q.total)} paid{opt ? ` for ${opt.label}` : ""}. Thank you!</p>
          <p>A receipt is on its way to {q.email}. Brandon will be in touch to plan the shoot.</p>
          {opt && <ul className="qo-done-list">{opt.lines.map((l, i) => <li key={i}>{lineLabel(l)}</li>)}</ul>}
        </div>
      </LegalPage>
    );
  }

  if (quoteExpired(q)) {
    return (
      <LegalPage kick={kick} title={`${first}, this quote has expired.`} updated="" plain>
        <div className="mx-done" role="status">
          <p className="mx-done-title">It was good for {QUOTE_DAYS} days, through {longDay(quoteExpiry(q))}.</p>
          <p>Still want to work together? Text Brandon at 845-549-4425 and he&apos;ll send a fresh one.</p>
        </div>
      </LegalPage>
    );
  }

  // Everything the page needs, already priced on the server.
  // A gift card or credit on their account (lib/walkin.js): theirs to tick,
  // off by default. Unticked, it stays on their account for another time.
  const credit = (await creditsFor(db, q.email))[0] || null;
  const options = (q.options || []).map((o, i) => {
    const t = quoteTotals(o, { rate: q.rate });
    return { i, label: o.label, total: t.total, canUse: Boolean(credit) && t.total - credit.amount >= 5, onSite: t.shootMin ? aboutTime(t.shootMin) : "", lines: o.lines.map(lineLabel) };
  });
  const many = options.length > 1;
  return (
    <LegalPage kick={kick} title={many ? `${first}, here are your options.` : `${first}, here's your quote.`} updated="" plain>
      <p className="cx-lede mx-pa-intro">
        {many ? "Pick the one that fits, read the agreement, type your name, and pay." : "Read the agreement, type your name, and pay."} It all happens on this page. Good through {longDay(quoteExpiry(q))}.
      </p>
      <QuoteOffer token={q.token} options={options} recommended={q.recommended ?? 0} picked={Number.isInteger(q.picked) ? q.picked : null}
        credit={credit ? { amount: credit.amount, label: credit.label } : null} creditOn={Boolean(q.credit && credit)} note={q.note || ""} when={q.when || ""} business={q.business || ""} name={q.name} checkout={stripeConfigured} />
    </LegalPage>
  );
}
