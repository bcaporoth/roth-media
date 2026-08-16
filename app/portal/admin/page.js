import BrandMark from "../../../components/BrandMark";
import { redirect } from "next/navigation";
import AdminDashboard from "../../../components/AdminDashboard";
import PortalNav from "../../../components/PortalNav";
import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "../../../lib/supabase-admin";
import { r2Configured, signedUrl, photoKey } from "../../../lib/r2";

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
    .select(
      "id, title, media_count, share_token, cover_filename, design, created_at, event_date, clients(name, email)"
    )
    .order("created_at", { ascending: false });

  // Flatten for the client component + sign cover thumbnails.
  const items = await Promise.all(
    (galleries || []).map(async (g) => ({
      id: g.id,
      title: g.title,
      media_count: g.media_count || 0,
      share_token: g.share_token,
      cover_filename: g.cover_filename,
      design: g.design,
      created_at: g.created_at,
      event_date: g.event_date,
      clientName: g.clients?.name || "",
      clientEmail: g.clients?.email || "",
      coverUrl:
        r2Configured && g.cover_filename
          ? await signedUrl(photoKey(g.id, "thumb", g.cover_filename)).catch(
              () => null
            )
          : null,
    }))
  );

  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />

      <AdminDashboard galleries={items} />

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
