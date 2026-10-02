import { money } from "../lib/packages";

const fmt = (n) => (n == null ? "—" : money(Math.round(n)));
const pct = (n) => (n == null ? "—" : `${Math.round(n * 100)}%`);

// The month at a glance — the same view in Studio and on the partner's report.
export default function PartnerReportView({ s, closing = "none" }) {
  const tiles = [
    ["Ad spend", s.spend == null ? "not entered yet" : money(s.spend), "from Meta Ads Manager"],
    ["Leads", String(s.leadCount), "people who asked for info"],
    ["Cost per lead", fmt(s.costPerLead), "ad spend ÷ leads"],
    ["New customers", String(s.customers), s.closeRate == null ? "" : `${pct(s.closeRate)} of leads`],
    ["Cost per new customer", fmt(s.costPerCustomer), "ad spend ÷ customers"],
    ["Sign-up value", money(s.revenue), "what new customers signed up for"],
  ];
  return (
    <div className="prep">
      <div className="prep-tiles">
        {tiles.map(([k, v, h]) => (
          <div key={k} className="prep-tile"><span>{k}</span><strong>{v}</strong>{h ? <small>{h}</small> : null}</div>
        ))}
      </div>
      {s.sources.length > 0 && (
        <div className="prep-block">
          <h3>Which ads brought leads</h3>
          <ul>{s.sources.map(([k, n]) => <li key={k}><span>{k}</span><b>{n}</b></li>)}</ul>
        </div>
      )}
      <div className="prep-block">
        <h3>New customers this month</h3>
        {s.closed.length ? (
          <ul>{s.closed.map((c) => <li key={c.id}><span>{c.name}{c.what ? ` · ${c.what}` : ""}</span><b>{money(c.value)}{closing === "percent" ? <small> fee {money(c.fee)}</small> : null}</b></li>)}</ul>
        ) : <p className="prep-empty">None yet this month.</p>}
        {closing === "percent" && s.closed.length > 0 && <p className="prep-total">Closing fees: <b>{money(s.percentFees)}</b> (10% of each sign-up, at least $25)</p>}
        {closing === "hourly" && <p className="prep-total">Follow-up hours: <b>{s.hours}</b> × $30 = <b>{money(s.hours * 30)}</b></p>}
      </div>
    </div>
  );
}
