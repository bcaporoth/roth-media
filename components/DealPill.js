"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { autoDeal, autoBonus } from "../lib/deals";

// Floating pointer to the site-wide deal (lib/deals.js). Checks the clock in
// the browser, so it disappears the minute the deal ends — no redeploy.
export default function DealPill({ href = "/quote" }) {
  const [deal, setDeal] = useState(null);
  const [bonus, setBonus] = useState(null);
  useEffect(() => { setDeal(autoDeal()); setBonus(autoBonus()); }, []);
  if (deal) {
    return (
      <Link href={href} className="promo-pill">
        <span className="promo-pill-dot" aria-hidden="true" />
        {deal.label}: {deal.pct}% off <em>· through {deal.endsLabel}</em>
      </Link>
    );
  }
  if (!bonus) return null;
  return (
    <Link href={href} className="promo-pill">
      <span className="promo-pill-dot" aria-hidden="true" />
      Weddings: book by {bonus.endsLabel}, guest photo library included <em>· engagement session always free</em>
    </Link>
  );
}
