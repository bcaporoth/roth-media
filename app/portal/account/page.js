import "../../theme/misc.css";
import PasswordForm from "../../../components/PasswordForm";
import PortalNav from "../../../components/PortalNav";
import PortalTop from "../../../components/PortalTop";
import { PortalAccount, PortalFrame } from "../../../components/PortalViews";
import { DetailsForm, EmailChoice } from "../../../components/SettingsForms";
import { redirect } from "next/navigation";
import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";
import { ADMIN_EMAIL, adminConfigured, supabaseAdmin } from "../../../lib/supabase-admin";
import { emailHasBrand } from "../../../lib/brand-server";
import { portalWho } from "../../../lib/portal-who";
import { clientAddresses, bookFrom } from "../../../lib/client-addresses";
import AddressBookEditor from "../../../components/AddressBookEditor";
import { AGREEMENT_KINDS } from "../../../lib/agreements";
import { money } from "../../../lib/packages";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings",
  robots: { index: false },
};

const day = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");
const AGREEMENT_STATUS = { sent: "Waiting for you to sign", signed: "Signed", paid: "Signed and paid" };

// Settings (2026-11-08; the page was password-only before). Your details ·
// Password · Card & receipts · Your addresses · Emails · Your agreements ·
// Sign out. First-time setup (?setup=1, straight off the one-time email)
// still shows only "Choose your password" so new clients aren't buried.
export default async function AccountPage({ searchParams }) {
  if (!portalConfigured) redirect("/portal");
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal?next=/portal/account");

  const params = await searchParams;
  const setup = params?.setup === "1";
  const next = /^\/portal(\/[\w-]+)*\/?$/.test(String(params?.next || "")) ? String(params.next) : "";
  const email = user.email.toLowerCase();
  const isAdmin = email === ADMIN_EMAIL;
  const hasBrand = !isAdmin && adminConfigured ? await emailHasBrand(supabaseAdmin(), user.email) : false;
  const nav = <PortalNav email={user.email} isAdmin={isAdmin} active="account" brand={hasBrand} />;

  if (setup) {
    return (
      <PortalAccount nav={nav} email={user.email} setup>
        <PasswordForm setup next={next} />
      </PortalAccount>
    );
  }

  let client = null;
  let addresses = [];
  let book = { book: [], hidden: [] };
  let agreements = [];
  let who = { kick: "Client portal", title: "Hi, there." };
  if (adminConfigured) {
    const db = supabaseAdmin();
    who = await portalWho(db, email);
    const first = await db.from("clients").select("id, name, phone, email_opt_out").eq("email", email).maybeSingle();
    client = first.error ? (await db.from("clients").select("id, name, phone").eq("email", email).maybeSingle()).data : first.data;
    const [{ data: subs }, { data: days }, { data: shoots }, { data: ag }] = await Promise.all([
      db.from("submissions").select("kind, fields, utm, created_at, updated_at").in("kind", ["intake", "addresses"]).eq("email", email),
      client ? db.from("shoot_days").select("title, date, location, updated_at").eq("client_id", client.id).then((r) => r, () => ({ data: [] })) : Promise.resolve({ data: [] }),
      db.from("shoots").select("title, date, address").eq("client_email", email).then((r) => r, () => ({ data: [] })),
      db.from("agreements").select("token, kind, business, period, amount_cents, status, created_at, signed_at, paid_at").eq("client_email", email).neq("status", "void").order("created_at", { ascending: false }).then((r) => r, () => ({ data: [] })),
    ]);
    book = bookFrom(subs || []);
    addresses = clientAddresses({ subs: subs || [], days: days || [], shoots: shoots || [], book });
    agreements = (ag || []).filter((a) => a.kind !== "invoice" || a.status !== "sent");
  }

  return (
    <PortalFrame nav={nav} className="pt-brief pt-settings mx-page">
      <PortalTop who={who} page="Settings" lede="Your details, password, card, addresses and paperwork, in one place." />
      <section className="cx-section cx-section--tight">
        <div className="cx-wrap st-grid">
          <section className="st-card" aria-labelledby="st-details">
            <h2 id="st-details" className="st-h">Your details</h2>
            {client
              ? <DetailsForm name={client.name || ""} phone={client.phone || ""} email={user.email} />
              : <p className="cx-help">Signed in as {user.email}. Your account isn&apos;t linked to a client profile yet. Text Brandon at 845-549-4425.</p>}
          </section>

          <section className="st-card" aria-labelledby="st-pw">
            <h2 id="st-pw" className="st-h">Password</h2>
            <PasswordForm next={next} />
          </section>

          <section className="st-card" aria-labelledby="st-cardh">
            <h2 id="st-cardh" className="st-h">Card &amp; receipts</h2>
            <p className="cx-help"><strong>On a monthly plan?</strong> Update your card, see your monthly receipts, or cancel. You sign in with your email and get a quick code.</p>
            <a className="cx-btn cx-btn--light st-btn" href="/billing" target="_blank" rel="noopener noreferrer">Manage my monthly plan →</a>
            <p className="cx-help"><strong>Paid once?</strong> Your receipt was emailed to you when you paid, and your payments are listed at the bottom of your <a href="/portal">home page</a>. No card is kept on file.</p>
          </section>

          <section className="st-card" aria-labelledby="st-addr">
            <h2 id="st-addr" className="st-h">Your addresses</h2>
            <AddressBookEditor initial={addresses} book={book.book} hidden={book.hidden} />
          </section>

          <section className="st-card" aria-labelledby="st-email">
            <h2 id="st-email" className="st-h">Emails from Roth Media</h2>
            {client ? <EmailChoice on={!client.email_opt_out} /> : <p className="cx-help">Available once your account is linked.</p>}
          </section>

          <section className="st-card" aria-labelledby="st-ag">
            <h2 id="st-ag" className="st-h">Your agreements</h2>
            {agreements.length === 0 ? (
              <p className="cx-help">Nothing signed yet. Agreements Brandon sends you show up here.</p>
            ) : (
              <ul className="st-list">
                {agreements.map((a) => (
                  <li key={a.token}>
                    <span>
                      <strong>{a.kind === "invoice" ? "Invoice" : AGREEMENT_KINDS[a.kind]?.title || "Agreement"}{a.period ? ` · ${a.period}` : ""}</strong>
                      <em>{AGREEMENT_STATUS[a.status] || a.status}{a.signed_at ? ` ${day(a.signed_at)}` : ` · sent ${day(a.created_at)}`}{a.amount_cents ? ` · ${money(a.amount_cents / 100)}` : ""}</em>
                    </span>
                    <a className="cx-link" href={`/sign/${a.token}`}>{a.status === "sent" ? "Open and sign →" : "View →"}</a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="st-card st-out" aria-label="Sign out">
            <form action="/auth/signout" method="post">
              <button type="submit" className="cx-btn cx-btn--ghost">Sign out</button>
            </form>
          </section>
        </div>
      </section>
    </PortalFrame>
  );
}
