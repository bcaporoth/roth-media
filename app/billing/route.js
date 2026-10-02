import { NextResponse } from "next/server";
import { stripe, stripeConfigured } from "../../lib/stripe";

export const dynamic = "force-dynamic";

// rothmediaco.com/billing → Stripe's customer portal login. Clients type
// their email, Stripe sends them a code, and they update their card or
// cancel their website plan themselves. The portal settings are created
// here the first time (no dashboard setup needed).
let cached = "";

async function portalLoginUrl() {
  if (cached) return cached;
  const list = await stripe("GET", "/billing_portal/configurations?active=true&limit=100");
  let conf = (list.data || []).find((c) => c.metadata?.app === "roth-media" && c.login_page?.enabled);
  if (!conf) {
    conf = await stripe("POST", "/billing_portal/configurations", {
      business_profile: { headline: "Roth Media — your plan", privacy_policy_url: "https://rothmediaco.com/privacy", terms_of_service_url: "https://rothmediaco.com/terms" },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: "at_period_end" },
      },
      default_return_url: "https://rothmediaco.com",
      login_page: { enabled: true },
      metadata: { app: "roth-media" },
    });
  }
  cached = conf.login_page?.url || "";
  return cached;
}

export async function GET(request) {
  const fallback = new URL("/terms", request.url);
  if (!stripeConfigured) return NextResponse.redirect(fallback);
  try {
    const url = await portalLoginUrl();
    return NextResponse.redirect(url || fallback);
  } catch {
    return NextResponse.redirect(fallback);
  }
}
