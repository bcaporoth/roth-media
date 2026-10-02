import Link from "next/link";
import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import CopyChip from "../../../../components/CopyChip";
import PartnerReportView from "../../../../components/PartnerReportView";
import PartnerCharge from "../../../../components/PartnerCharge";
import { PartnerMonthForm, PartnerLeadActions } from "../../../../components/PartnerAdmin";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { newLeadCount } from "../../../../lib/studio-data";
import { PARTNERS } from "../../../../lib/partners";
import { monthStats, partnerAgreement, reportUrl, thisMonth, prevMonth, monthLabel, rateDates } from "../../../../lib/partner-stats";
import { money } from "../../../../lib/packages";

export const dynamic = "force-dynamic";
export const metadata = { title: "Partners — Studio", robots: { index: false } };

const STATUS = { new: "New", contacted: "Contacted", booked: "Closed", lost: "Lost" };
const nextMonth = (m) => { const [y, mo] = m.split("-").map(Number); return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`; };

// Each partner's month: leads to work, the numbers for their report, and
// the buttons to send it and to charge closing fees.
export default async function PartnersAdmin({ searchParams }) {
  const user = await requireAdminPage();
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(String(sp?.m || "")) ? sp.m : thisMonth();
  const newCount = await newLeadCount();
  const slugs = Object.keys(PARTNERS);
  const rows = await Promise.all(slugs.map(async (slug) => ({ slug, p: PARTNERS[slug], a: await partnerAgreement(slug), s: await monthStats(slug, month) })));

  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="partners" newCount={newCount} kick="Studio" title="Partners">
        <div className="atoolbar">
          <Link className="abtn abtn-ghost" href={`/portal/admin/partners?m=${prevMonth(month)}`}>← {monthLabel(prevMonth(month))}</Link>
          <strong className="pm-label">{monthLabel(month)}</strong>
          {month < thisMonth() && <Link className="abtn abtn-ghost" href={`/portal/admin/partners?m=${nextMonth(month)}`}>{monthLabel(nextMonth(month))} →</Link>}
        </div>
        {rows.map(({ slug, p, a, s }) => {
          const url = reportUrl(slug);
          const fees = a?.closing === "percent" ? s.percentFees : a?.closing === "hourly" ? s.hours * 30 : 0;
          const text = `Hey ${p.first}! Your ${s.label} report: ${s.leadCount} leads${s.costPerLead != null ? ` at ${money(Math.round(s.costPerLead))} each` : ""}, ${s.customers} new customer${s.customers === 1 ? "" : "s"}. Full numbers anytime here: ${url}`;
          return (
            <section key={slug} className="psection">
              <h2>{a?.business || p.lead?.brand || p.first} <small className="itag">{a?.active ? `active · ${a.closing === "percent" ? "per-customer follow-up" : a.closing === "hourly" ? "hourly follow-up" : "no follow-up"}` : "not signed up yet"}</small></h2>
              {a?.active && rateDates(a, p.months) && (
                <p className="inbox-hint"><strong>Partner rate ({p.pct}% off) locked through {rateDates(a, p.months).lockedUntil.toLocaleDateString("en-US", { month: "long", day: "numeric" })}.</strong> Review results and agree the next rate with {p.first} by {rateDates(a, p.months).reviewBy.toLocaleDateString("en-US", { month: "long", day: "numeric" })}; a new rate needs 30 days’ written notice.</p>
              )}
              <p className="inbox-hint">Leads come from <a href={`/go/${slug}`} target="_blank" rel="noreferrer">rothmediaco.com/go/{slug}</a> (put that link in every ad, with utm_content = the ad’s name). Enter the ad spend from Meta Ads Manager once a month; everything else fills in by itself.</p>
              <PartnerMonthForm slug={slug} month={month} spend={s.spend} hours={s.hours} hourly={a?.closing === "hourly"} />
              <PartnerReportView s={s} closing={a?.closing} />
              <div className="pcharge-row">
                <CopyChip text={url} label="Copy her report link" />
                {a?.phone && <a className="abtn abtn-ghost" href={`sms:${a.phone}?&body=${encodeURIComponent(text)}`}>Text her this month’s report</a>}
              </div>
              {a?.active && fees > 0 && (
                <div className="pcard">
                  <strong>Closing fees for {s.label}: {money(fees)}</strong>
                  <PartnerCharge id={a.id} name={a.name} phone={a.phone} defaultAmount={String(fees)} defaultWhat={`${s.label} closing fees: ${a.closing === "hourly" ? `${s.hours} hrs` : `${s.customers} new customer${s.customers === 1 ? "" : "s"}`}`} />
                </div>
              )}
              <h3>Leads in {s.label} ({s.leadCount})</h3>
              {s.leads.length ? (
                <ul className="pl-list">
                  {s.leads.map((l) => (
                    <li key={l.id}>
                      <div><strong>{l.name}</strong> <span className={`itag itag-${l.status}`}>{STATUS[l.status] || l.status}</span>{l.utm?.close_value ? <em> · {l.utm.close_what} {money(l.utm.close_value)}</em> : null}<br /><small>{new Date(l.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · <a href={`tel:${l.phone}`}>{l.phone}</a>{l.utm?.utm_content ? ` · ad: ${l.utm.utm_content}` : ""}</small></div>
                      <PartnerLeadActions id={l.id} status={l.status} />
                    </li>
                  ))}
                </ul>
              ) : <p className="prep-empty">No leads this month yet.</p>}
            </section>
          );
        })}
      </StudioShell>
      <StudioFooter />
    </>
  );
}
