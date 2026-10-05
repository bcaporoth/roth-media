import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import CopyChip from "../../../../components/CopyChip";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { newLeadCount } from "../../../../lib/studio-data";
import { OPEN_AMOUNT_LINK, RETAINER_RATE, payablePackages } from "../../../../lib/payments";
import { money } from "../../../../lib/packages";
import Link from "next/link";
import BalanceList from "../../../../components/BalanceList";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { BOOKING_COLS, splitBookings, usd } from "../../../../lib/money-view";
import { listReferrals } from "../../../../lib/referrals";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payments — Studio",
  robots: { index: false },
};

export default async function PayAdminPage() {
  const user = await requireAdminPage();
  const newCount = await newLeadCount();
  const pkgs = payablePackages();
  const live = pkgs.filter((p) => p.link).length + (OPEN_AMOUNT_LINK ? 1 : 0);
  // Who owes what: every booking paid through the site (Stripe checkout writes
  // the `bookings` table — lib/booking.js). Tolerant: before supabase/bookings.sql
  // has been run the rest of this page still works.
  const db = supabaseAdmin();
  let bookingRows = [];
  let bookingsOk = true;
  try {
    const { data, error } = await db.from("bookings").select(BOOKING_COLS).order("created_at", { ascending: false }).limit(500);
    if (error) bookingsOk = false;
    else bookingRows = data || [];
  } catch { bookingsOk = false; }
  const { owing, settled, owedCents } = splitBookings(bookingRows);
  const referrals = await listReferrals(db);
  const shortDay = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  // Link each one to its client profile when they're on the roster.
  const profiles = {};
  const emails = [...new Set(bookingRows.map((b) => String(b.email || "").toLowerCase()).filter(Boolean))];
  if (emails.length) {
    try {
      const { data } = await db.from("clients").select("id, email").in("email", emails.slice(0, 500));
      for (const c of data || []) profiles[String(c.email).toLowerCase()] = c.id;
    } catch {}
  }

  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="pay" newCount={newCount} kick="Studio" title="Payments">
        <div className="atoolbar">
          <a className="abtn" href="https://dashboard.stripe.com/payments" target="_blank" rel="noreferrer">
            Stripe payments ↗
          </a>
          <a className="abtn abtn-ghost" href="https://dashboard.stripe.com/payment-links" target="_blank" rel="noreferrer">
            Payment links ↗
          </a>
          <a className="abtn abtn-ghost" href="https://dashboard.stripe.com/invoices/create" target="_blank" rel="noreferrer">
            New invoice ↗
          </a>
          <a className="abtn abtn-ghost" href="/pay" target="_blank" rel="noreferrer">
            Your pay page ↗
          </a>
        </div>

        <section className="psection">
          <h2>Who owes what</h2>
          {!bookingsOk ? (
            <p className="sm-sqlhint">Bookings aren&apos;t set up yet — run <code>supabase/bookings.sql</code> once in the Supabase SQL editor and everyone who pays through the site shows up here with what they still owe.</p>
          ) : owing.length === 0 ? (
            <p className="inbox-hint">{bookingRows.length ? "Nobody owes a balance right now." : "No bookings paid through the site yet. When someone books, they show up here with what they still owe."}</p>
          ) : (
            <>
              <p className="sm-total"><b>{usd(owedCents)}</b> still to come from {owing.length} booking{owing.length === 1 ? "" : "s"}.</p>
              <p className="inbox-hint">Balances are due 14 days before the date. Copy the link and send it yourself — nothing here messages a client for you. It&apos;s the same link your morning email gives you.</p>
              <BalanceList rows={owing} profiles={profiles} />
            </>
          )}
          {settled.length > 0 && (
            <details className="st-more">
              <summary>Settled <em>{settled.length} booking{settled.length === 1 ? "" : "s"} paid in full{settled.some((v) => v.state === "closed") ? ", refunded or cancelled" : ""}</em></summary>
              <div className="st-more-body">
                <BalanceList rows={settled.slice(0, 100)} profiles={profiles} />
              </div>
            </details>
          )}
        </section>

        <section className="psection">
          <h2>Give $100, get $100</h2>
          <p className="inbox-hint">Every client gets a FRIEND code on their booked page and in your confirmation text. A friend books with it → $100 off for them, $100 for the referrer (off an open balance, or a THANKS credit for next time). Credits are codes too — they type them in the promo box.</p>
          {!referrals.ready ? (
            <p className="inbox-hint">Run <code>supabase/referrals.sql</code> once (it&apos;s in 00-all.sql too) and the codes switch on.</p>
          ) : referrals.rows.length === 0 ? (
            <p className="inbox-hint">No referrals yet.</p>
          ) : (
            <div className="ltable-wrap">
              <table className="idet-fields stable">
                <thead><tr><th>When</th><td>Referred by</td><td>Who booked</td><td>Their thank-you</td></tr></thead>
                <tbody>
                  {referrals.rows.map((r) => (
                    <tr key={r.id}>
                      <th scope="row">{shortDay(r.created_at)}</th>
                      <td>{r.referrer_name || r.referrer_email}<br /><small>{r.code}</small></td>
                      <td>{r.referred_name || r.referred_email}</td>
                      <td>{r.reward === "balance" ? "$100 off their balance" : `$100 credit · ${r.reward_code}${r.used_at ? " · used" : ""}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <h2>Pay links</h2>
        <p className="inbox-hint">
          {live} of {pkgs.length + 1} pay buttons are live. Retainer = {Math.round(RETAINER_RATE * 100)}% of the
          package. Text a client the link below, or send them to rothmediaco.com/pay.
        </p>

        <ul className="paylist">
          {pkgs.map((p) => (
            <li key={p.key}>
              <span>
                <strong>{p.name}</strong>
                <em>
                  {money(p.retainer)} retainer · {money(p.price)} total
                </em>
              </span>
              {p.link ? (
                <CopyChip text={p.link} label="Copy pay link" />
              ) : (
                <span className="itag itag-new">link not set</span>
              )}
            </li>
          ))}
          <li>
            <span>
              <strong>Balance / invoice</strong>
              <em>Client types the amount</em>
            </span>
            {OPEN_AMOUNT_LINK ? (
              <CopyChip text={OPEN_AMOUNT_LINK} label="Copy pay link" />
            ) : (
              <span className="itag itag-new">link not set</span>
            )}
          </li>
        </ul>

        <p className="inbox-hint" style={{ marginTop: "1.2rem" }}>
          Partner closing fees and event charges are on the <Link href="/portal/admin/partners">Partners tab →</Link>
        </p>
      </StudioShell>
      <StudioFooter />
    </>
  );
}
