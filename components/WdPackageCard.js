import Link from "next/link";
import DealPrice from "./DealPrice";

// One package as a Cinema card (weddings + city pages). The whole card is the link
// into the quote builder; the price comes from lib/packages through DealPrice.
export default function WdPackageCard({ p, href }) {
  return (
    <Link href={href} className={"cx-card wd-pkg" + (p.popular ? " cx-card--accent" : "")}>
      <span className="wd-pkg-head">
        <span className="wd-pkg-id">
          {p.popular && <span className="cx-flag">Most booked</span>}
          <span className="cx-h3 wd-pkg-name">{p.name}</span>
          <span className="wd-pkg-scope">{p.scope}</span>
        </span>
        <span className="wd-pkg-price">
          <span className="cx-num"><DealPrice price={p.price} category="wedding" packageId={p.id} /></span>
          <small>{p.per ? p.per : "starting at"}</small>
        </span>
      </span>
      <span className="cx-kick wd-pkg-you">You get</span>
      <ul className="cx-list">{p.get.map((g) => <li key={g}>{g}</li>)}</ul>
      <span className="cx-link wd-pkg-go">
        Build this quote
        <svg className="cx-arrow" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    </Link>
  );
}
