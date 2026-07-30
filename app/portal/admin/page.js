import Link from "next/link";
import BrandMark from "../../../components/BrandMark";
import { redirect } from "next/navigation";
import AdminUploader from "../../../components/AdminUploader";
import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Studio Admin",
  robots: { index: false },
};

export default async function AdminPage() {
  if (!portalConfigured || !adminConfigured) redirect("/portal");
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) redirect("/portal");

  const db = supabaseAdmin();
  const { data: galleries } = await db
    .from("galleries")
    .select("id, title, media_count, share_token, created_at, clients(name, email)")
    .order("created_at", { ascending: false });

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
        </ul>
      </nav>

      <main className="quote-wrap">
        <div className="kick">Studio admin</div>
        <h1>Add a gallery.</h1>
        <p className="lead">
          Upload straight from this page — photos get web sizes made
          automatically, and you get a share link anyone can open.
        </p>
        <AdminUploader />

        <section className="admin-list">
          <h2>All galleries</h2>
          {(galleries || []).map((g) => (
            <div className="admin-list-row" key={g.id}>
              <div>
                <strong>{g.title}</strong>
                <span>
                  {g.clients?.name} ({g.clients?.email}) · {g.media_count} items
                </span>
              </div>
              <div className="admin-list-links">
                <Link href={`/portal/gallery/${g.id}`}>View</Link>
                <a href={`/g/${g.share_token}`}>Share link</a>
              </div>
            </div>
          ))}
        </section>
      </main>

      <footer className="rm-footer">
        <div className="foot-inner">
          <div className="brand">
            <BrandMark />
            Roth <em>Media</em>
          </div>
          <span>© {new Date().getFullYear()} Roth Media</span>
        </div>
      </footer>
    </>
  );
}
