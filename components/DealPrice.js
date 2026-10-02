import { autoDeal, applyDeal } from "../lib/deals";
import { money } from "../lib/packages";

// A list price, with the site-wide deal applied and the old price struck
// through. Server component — pages that use it revalidate hourly.
export default function DealPrice({ price }) {
  const now = applyDeal(price, autoDeal());
  return <>{money(now)}{now !== price && <> <s>{money(price)}</s></>}</>;
}
