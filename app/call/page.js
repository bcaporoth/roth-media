import "../theme/misc.css";
import SiteNav from "../../components/SiteNav";
import SiteFooter from "../../components/SiteFooter";
import BookCall from "../../components/BookCall";
import { adminConfigured, supabaseAdmin } from "../../lib/supabase-admin";
import { callOf, callWhen } from "../../lib/call";
import { leadCategory } from "../../lib/lead-intel";
import { PHONE } from "../../lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pick a time for our call", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The button in the thank-you email lands here (lib/call.js). Same Calendly
// picker as the one after the form, with their name and email filled in.
export default async function CallPage({ searchParams }) {
  const sp = await searchParams;
  const id = UUID.test(String(sp?.i || "")) ? String(sp.i) : "";
  let sub = null;
  if (id && adminConfigured) {
    const { data } = await supabaseAdmin().from("submissions").select("id, name, email, utm, kind, summary, subject, fields").eq("id", id).maybeSingle();
    sub = data || null;
  }
  const call = callOf(sub);
  const biz = !!sub && leadCategory(sub) === "business";
  const tel = PHONE.replace(/\D/g, "");
  const first = String(sub?.name || "").trim().split(/\s+/)[0] || "";
  return (
    <>
      <SiteNav cta={{ href: `sms:+1${tel}`, label: `Text ${PHONE}` }} />
      <main className="cx-page cx-page--hero mx-page mx-intake">
        <header className="cx-hero cx-hero--plain mx-intake-head">
          <div className="cx-wrap cx-wrap--narrow cx-hero-body">
            <p className="cx-kick">{biz ? "Welcome" : "The next step"}</p>
            <h1 className="cx-h1">{call ? "Your call is booked." : "Pick a time for our call."}</h1>
            <p className="cx-lede">
              {call
                ? `${callWhen(call) ? `${callWhen(call)}. ` : ""}The invite is in your inbox. Need to move it? Use the link in that invite, or text ${PHONE}.`
                : `${first ? `${first}, I` : "I"} have your form. Pick any open time below and I’ll call you then.${biz ? " On the call we go over your business, what you want filmed, and your dates." : ""}`}
            </p>
          </div>
        </header>
        {!call && (
          <section className="cx-section cx-section--tight">
            <div className="cx-wrap cx-wrap--narrow">
              <BookCall name={sub?.name || ""} email={sub?.email || ""} from="email" sid={sub?.id || ""} dark />
            </div>
          </section>
        )}
      </main>
      <SiteFooter slim />
    </>
  );
}
