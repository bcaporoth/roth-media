import Link from "next/link";
import PortalLogin from "../../components/PortalLogin";
import { createSupabaseServer, portalConfigured } from "../../lib/supabase";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Client Portal",
  description: "Your galleries, downloads, and account with Roth Media.",
  robots: { index: false },
};

const money = (cents) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

const dateFmt = (d) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

async function getClientData() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null };

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, email")
    .eq("email", user.email)
    .maybeSingle();

  if (!client) return { user, client: null };

  const [{ data: galleries }, { data: payments }] = await Promise.all([
    supabase
      .from("gallery_links")
      .select("id, title, url, note")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("id, amount_cents, paid_on, note")
      .eq("client_id", client.id)
      .order("paid_on", { ascending: false }),
  ]);

  return { user, client, galleries: galleries || [], payments: payments || [] };
}

export default async function PortalPage() {
  if (!portalConfigured) {
    return (
      <PortalShell>
        <div className="kick">Client Portal</div>
        <h2>
          Almost <em>ready.</em>
        </h2>
        <p className="lead">
          The client portal is being set up. In the meantime, call or text me
          at <a href="tel:+18455494425">845-549-4425</a> for anything you
          need.
        </p>
      </PortalShell>
    );
  }

  const { user, client, galleries, payments } = await getClientData();

  if (!user) {
    return (
      <PortalShell>
        <div className="kick">Client Portal</div>
        <h2>
          Welcome <em>back.</em>
        </h2>
        <p className="lead">
          Sign in to see your galleries, downloads, and account. No password
          — I&apos;ll email you a link.
        </p>
        <PortalLogin />
      </PortalShell>
    );
  }

  if (!client) {
    return (
      <PortalShell signedIn>
        <div className="kick">Client Portal</div>
        <h2>
          Hi — I don&apos;t have your account set up <em>yet.</em>
        </h2>
        <p className="lead">
          You&apos;re signed in as {user.email}, but I haven&apos;t linked
          that email to a client account. Text me at{" "}
          <a href="tel:+18455494425">845-549-4425</a> and I&apos;ll fix it in
          two minutes.
        </p>
      </PortalShell>
    );
  }

  const total = payments.reduce((sum, p) => sum + p.amount_cents, 0);

  return (
    <PortalShell signedIn>
      <div className="kick">Client Portal</div>
      <h2>
        Hi, <em>{client.name.split(" ")[0]}.</em>
      </h2>

      <div className="portal-grid">
        <div className="portal-card">
          <h3 className="portal-card-title">Your galleries</h3>
          {galleries.length === 0 ? (
            <p className="portal-empty">
              Nothing here yet — your galleries will appear as soon as
              they&apos;re ready.
            </p>
          ) : (
            <ul className="portal-galleries">
              {galleries.map((g) => (
                <li key={g.id}>
                  <a href={g.url} target="_blank" rel="noopener noreferrer">
                    {g.title} ↗
                  </a>
                  {g.note && <span className="portal-note">{g.note}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="portal-card">
          <h3 className="portal-card-title">Payments</h3>
          {payments.length === 0 ? (
            <p className="portal-empty">No payments recorded yet.</p>
          ) : (
            <>
              <ul className="portal-payments">
                {payments.map((p) => (
                  <li key={p.id}>
                    <span>
                      {dateFmt(p.paid_on)}
                      {p.note && (
                        <span className="portal-note"> — {p.note}</span>
                      )}
                    </span>
                    <span className="portal-amount">
                      {money(p.amount_cents)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="portal-total">
                <span>Total with Roth Media</span>
                <span className="portal-amount">{money(total)}</span>
              </p>
            </>
          )}
        </div>
      </div>
    </PortalShell>
  );
}

function PortalShell({ children, signedIn = false }) {
  return (
    <>
      <nav className="rm-nav portal-nav" aria-label="Main navigation">
        <Link href="/" className="brand">
          Roth <em>Media</em>
        </Link>
        <ul className="nav-links">
          <li>
            <Link href="/">← Back to site</Link>
          </li>
          {signedIn && (
            <li>
              <form action="/auth/signout" method="post">
                <button type="submit" className="portal-signout">
                  Sign out
                </button>
              </form>
            </li>
          )}
        </ul>
      </nav>
      <main className="portal">
        <section className="contact portal-section">{children}</section>
      </main>
      <footer className="rm-footer">
        <div className="foot-inner">
          <div className="brand">
            Roth <em>Media</em>
          </div>
          <a href="tel:+18455494425">845-549-4425</a>
          <span>© {new Date().getFullYear()} Roth Media</span>
        </div>
      </footer>
    </>
  );
}
