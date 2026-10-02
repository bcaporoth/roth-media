"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { autoDeal } from "../lib/deals";

// Floating pointer to the site-wide deal (lib/deals.js). Checks the clock in
// the browser, so it disappears the minute the deal ends — no redeploy.
export default function DealPill({ href = "/quote" }) {
  const [deal, setDeal] = useState(null);
  useEffect(() => setDeal(autoDeal()), []);
  if (!deal) return null;
  return (
    <Link href={href} className="promo-pill">
      <span className="promo-pill-dot" aria-hidden="true" />
      {deal.label}: {deal.pct}% off everything <em>· through {deal.endsLabel}</em>
    </Link>
  );
}
