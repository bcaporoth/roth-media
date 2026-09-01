"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PROMO } from "../lib/promo";

// Floating homepage pointer to the giveaway. Disappears when entries close.
export default function PromoPill() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(Date.now() < new Date(PROMO.closesAt).getTime());
  }, []);
  if (!show) return null;
  return (
    <Link href="/promo" className="promo-pill">
      <span className="promo-pill-dot" aria-hidden="true" />
      Win a free Content Day <em>· enter by {PROMO.closesLabel.replace("Sunday, ", "")}</em>
    </Link>
  );
}
