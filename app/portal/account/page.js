import Link from "next/link";
import BrandMark from "../../../components/BrandMark";
import PasswordForm from "../../../components/PasswordForm";
import { redirect } from "next/navigation";
import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your account",
  robots: { index: false },
};

// Set or change the account password. Reached from first-time setup
// (?setup=1, straight off the one-time email) or from the portal any time.
export default async function AccountPage({ searchParams }) {
  if (!portalConfigured) redirect("/portal");
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal");

  const params = await searchParams;
  const setup = params?.setup === "1";

  return (
    <>
      <nav className="rm-nav portal-nav" aria-label="Main navigation">
        <Link href="/" className="brand">
          <span className="brand-chip"><BrandMark /></span>
          <span className="brand-text">Roth <em>Media</em></span>
        </Link>
        <ul className="nav-links">
          <li>
            <Link href="/portal">← Your portal</Link>
          </li>
          <li>
            <form action="/auth/signout" method="post">
              <button type="submit" className="portal-signout">
                Sign out
              </button>
            </form>
          </li>
        </ul>
      </nav>

      <main className="portal">
        <section className="contact portal-section">
          <div className="kick">Your account</div>
          <h2>
            {setup ? (
              <>Choose your <em>password.</em></>
            ) : (
              <>Change your <em>password.</em></>
            )}
          </h2>
          <p className="lead">
            {setup
              ? `You're in as ${user.email}. Pick a password and that's it — from then on you sign in with your email and password, no email links.`
              : `Signed in as ${user.email}. Set a new password below — it takes effect immediately.`}
          </p>
          <PasswordForm setup={setup} />
        </section>
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
