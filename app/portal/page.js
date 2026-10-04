import PortalLogin from "../../components/PortalLogin";
import PortalNav from "../../components/PortalNav";
import { PortalLobby, PortalNotice, PortalHome } from "../../components/PortalViews";
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

  // Albums shared with this client by someone else (spouse's wedding, etc).
  let shared = [];
  if (r2Configured) {
    try {
      const { data: m } = await supabase.from("gallery_members").select("gallery_id").eq("client_id", client.id);
      const ids = (m || []).map((x) => x.gallery_id).filter((id) => !(hosted || []).some((g) => g.id === id));
      if (ids.length) {
        const { data: extra } = await supabase
          .from("galleries")
          .select("id, title, event_date, cover_filename, media_count")
          .in("id", ids)
          .order("created_at", { ascending: false });
        shared = (extra || []).map((g) => ({ ...g, shared: true }));
      }
    } catch {}
  }

  // The first album is shown as a large poster, so it also gets the
  // web-size cover (layered over the thumb, which stays the fallback).
  const hostedGalleries = await Promise.all(
    [...(hosted || []), ...shared].map(async (g, i) => ({
      ...g,
      coverUrl: g.cover_filename
        ? await signedUrl(photoKey(g.id, "thumb", g.cover_filename)).catch(
            () => null
          )
        : null,
      posterUrl:
        i === 0 && g.cover_filename
          ? await signedUrl(photoKey(g.id, "web", g.cover_filename)).catch(
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
      <PortalLobby
        title="Almost ready."
        lede={
          <>
            The client portal is being set up. In the meantime, call or text me
            at <a href="tel:+18455494425">845-549-4425</a> for anything you
            need.
          </>
        }
      />
    );
  }

  const { user, client, galleries, payments, hostedGalleries } =
    await getClientData();

  if (!user) {
    return (
      <PortalLobby
        title="Welcome back."
        lede="Sign in with your email and password to see your galleries, downloads, and account. First time? One quick email sets you up."
      >
        <PortalLogin />
      </PortalLobby>
    );
  }

  if (!client) {
    return (
      <PortalNotice
        nav={
          <PortalNav
            email={user.email}
            isAdmin={user.email?.toLowerCase() === ADMIN_EMAIL}
            active="galleries"
          />
        }
        title={<>Hi — I don&apos;t have your account set up yet.</>}
      >
        You&apos;re signed in as {user.email}, but I haven&apos;t linked that
        email to a client account. Text me at{" "}
        <a href="tel:+18455494425">845-549-4425</a> and I&apos;ll fix it in two
        minutes.
      </PortalNotice>
    );
  }

  const total = payments.reduce((sum, p) => sum + p.amount_cents, 0);

  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL;

  const first = client.name.trim().split(/\s+/)[0] || "there";
  const firstName = first.charAt(0).toUpperCase() + first.slice(1);

  return (
    <PortalHome
      nav={<PortalNav email={user.email} isAdmin={isAdmin} active="galleries" />}
      firstName={firstName}
      hostedGalleries={hostedGalleries || []}
      galleries={galleries}
      payments={payments}
      total={total}
      money={money}
      dateFmt={dateFmt}
    />
  );
}
