import Link from "next/link";
import BrandMark from "../../components/BrandMark";
import PortalLogin from "../../components/PortalLogin";
import PortalNav from "../../components/PortalNav";
import { createSupabaseServer, portalConfigured } from "../../lib/supabase";
import { ADMIN_EMAIL } from "../../lib/supabase-admin";
import { r2Configured, signedUrl, photoKey } from "../../lib/r2";

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

  const [{ data: galleries }, { data: payments }, { data: hosted }] =
    await Promise.all([
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
      r2Configured
        ? supabase
            .from("galleries")
            .select("id, title, event_date, cover_filename, media_count")
            .eq("client_id", client.id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

  const hostedGalleries = await Promise.all(
    (hosted || []).map(async (g) => ({
      ...g,
      coverUrl: g.cover_filename
        ? await signedUrl(photoKey(g.id, "thumb", g.cover_filename)).catch(
            () => null
          )
        : null,
    }))
  );

  return {
    user,
    client,
    galleries: galleries || [],
    payments: payments || [],
    hostedGalleries,
  };
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

  const { user, client, galleries, payments, hostedGalleries } =
    await getClientData();

  if (!user) {
    return (
      <PortalShell>
        <div className="kick">Client Portal</div>
        <h2>
          Welcome <em>back.</em>
        </h2>
        <p className="lead">
          Sign in with your email and password to see your galleries,
          downloads, and account. First time? One quick email sets you up.
        </p>
        <PortalLogin />
      </PortalShell>
    );
  }

  if (!client) {
    return (
      <PortalShell
        signedIn
        nav={
          <PortalNav
            email={user.email}
            isAdmin={user.email?.toLowerCase() === ADMIN_EMAIL}
            active="galleries"
          />
        }
      >
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

  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL;

  const first = client.name.trim().split(/\s+/)[0] || "there";
  const firstName = first.charAt(0).toUpperCase() + first.slice(1);
  const hasHosted = hostedGalleries && hostedGalleries.length > 0;
  const hasLinks = galleries.length > 0;
  const hasPayments = payments.length > 0;

  return (
    <PortalShell
      signedIn
      nav={<PortalNav email={user.email} isAdmin={isAdmin} active="galleries" />}
    >
      <div className="kick">Client Portal</div>
      <h2>
        Hi, <em>{firstName}.</em>
      </h2>
      <p className="lead">
        Your photos and films, ready when you are — view, share, and download
        anytime.
      </p>

      {hasHosted && (
        <div className="portal-hosted">
          {hostedGalleries.map((g) => (
            <Link
              href={`/portal/gallery/${g.id}`}
              className="portal-hosted-card"
              key={g.id}
            >
              {g.coverUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={g.coverUrl} alt="" />
              ) : (
                <span className="portal-hosted-blank" aria-hidden="true" />
              )}
              <span className="portal-hosted-caption">
                <strong>{g.title}</strong>
                <span>
                  {g.media_count} items
                  {g.event_date &&
                    ` · ${new Date(g.event_date).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })}`}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}

      {!hasHosted && !hasLinks && (
        <p className="portal-empty portal-empty-solo">
          Your first gallery is on its way — it&apos;ll appear right here the
          moment it&apos;s ready.
        </p>
      )}

      {(hasLinks || hasPayments) && (
        <div className="portal-grid">
          {hasLinks && (
            <div className="portal-card">
              <h3 className="portal-card-title">
                {hasHosted ? "More links" : "Your galleries"}
              </h3>
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
            </div>
          )}

          {hasPayments && (
            <div className="portal-card">
              <h3 className="portal-card-title">Payments</h3>
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
            </div>
          )}
        </div>
      )}
    </PortalShell>
  );
}

function PortalShell({ children, signedIn = false, nav = null }) {
  return (
    <>
      {nav || (
        <nav className="rm-nav portal-nav" aria-label="Main navigation">
          <Link href="/" className="brand">
            <span className="brand-chip"><BrandMark /></span>
            <span className="brand-text">Roth <em>Media</em></span>
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
      )}
      <main className="portal">
        <section className="contact portal-section">{children}</section>
      </main>
      <footer className="rm-footer">
        <div className="foot-inner">
          <div className="brand">
            <BrandMark />
            Roth <em>Media</em>
          </div>
          <a href="tel:+18455494425">845-549-4425</a>
          <span>© {new Date().getFullYear()} Roth Media</span>
        </div>
      </footer>
    </>
  );
}

