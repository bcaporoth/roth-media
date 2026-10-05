"use client";

import { useEffect } from "react";
import { pixelPurchase } from "../lib/meta-pixel";

// Fires the Meta "Purchase" event once per paid checkout session, from the
// /booked page. Rendered only when Stripe says the session is paid.
export default function PurchasePing({ sessionId, value, category, packageId }) {
  useEffect(() => {
    if (!sessionId || !(value > 0)) return;
    const key = `rm-purchase-${sessionId}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch {}
    pixelPurchase({ value, sessionId, category, packageId });
  }, [sessionId, value, category, packageId]);
  return null;
}
