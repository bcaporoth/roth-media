import { autoDeal, autoDealFor, applyDeal } from "../lib/deals";
import { money } from "../lib/packages";

// A list price, with the site-wide deal applied and the old price struck
// through. Pass category + packageId so a deal that skips that package (the
// launch special skips business) leaves the price alone.
// Server component — pages that use it revalidate hourly.
export default function DealPrice({ price, category = "", packageId = "" }) {
  const now = applyDeal(price, category ? autoDealFor(category, packageId) : autoDeal());
  return <>{money(now)}{now !== price && <> <s>{money(price)}</s></>}</>;
}
