import PortalLogin from "../../components/PortalLogin";
import { redirect } from "next/navigation";
import PortalNav from "../../components/PortalNav";
import { PortalLobby, PortalNotice, PortalHome, PortalBusinessHome } from "../../components/PortalViews";
import { createSupabaseServer, portalConfigured } from "../../lib/supabase";
import { ADMIN_EMAIL } from "../../lib/supabase-admin";
import { r2Configured, signedUrl, photoKey } from "../../lib/r2";
import { adminConfigured, supabaseAdmin } from "../../lib/supabase-admin";
import { ESSENTIALS, completeness } from "../../lib/brand";
import { loadBrand } from "../../lib/brand-server";
import { loadPublishedPlan } from "../../lib/content-plan-server";
import { normHex } from "../../lib/brand-color";
import { latestBrief } from "../../lib/intake";

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

  // A brand palette makes them a business client: they get the business
  // home. Quietly absent until supabase/brand.sql has run.
  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL;
  const brandLoad =
    adminConfigured && !isAdmin
      ? loadBrand(supabaseAdmin(), client.id).catch(() => null)
      : Promise.resolve(null);

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
            .select("id, title, event_date, cover_filename, media_count, created_at")
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
          .select("id, title, event_date, cover_filename, media_count, created_at")
          .in("id", ids)
          .order("created_at", { ascending: false });
        shared = (extra || []).map((g) => ({ ...g, shared: true }));
      }
    } catch {}
  }

  const b = await brandLoad;
  const palette = b?.ready && b.palette ? { ...b.palette, assets: b.assets || [] } : null;

  // The first album is shown as a large poster, so it also gets the
  // web-size cover (layered over the thumb, which stays the fallback).
  // Business clients see everything strictly newest first, shared albums
  // included; wedding clients keep their own albums ahead of shared ones.
  const all = [...(hosted || []), ...shared];
  if (palette) all.sort((x, y) => String(y.created_at || "").localeCompare(String(x.created_at || "")));
  const hostedGalleries = await Promise.all(
    all.map(async (g, i) => ({
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
    palette,
  };
}

// What the business home's brand card shows: Essentials progress, the next
// one to fill in, and their confirmed logo / colors / vibe words (never the
// colors Brandon only suggested).
function brandSummary(palette) {
  const data = palette.data || {};
  const c = completeness(data, palette.assets);
  const logo = palette.assets.find((a) => a.kind === "logo" && /^image\//.test(a.mime || "") && a.url);
  return {
    done: c.essentials.done,
    of: c.essentials.of || ESSENTIALS.length,
    next: c.essentials.missing.slice(0, 1).map((m) => m.label),
    colors: (Array.isArray(data.visual?.colors) ? data.visual.colors : []).filter((x) => normHex(x?.hex)).slice(0, 6),
    logo: logo ? logo.url : null,
    words: Array.isArray(data.vibe?.words) ? data.vibe.words.slice(0, 5) : [],
  };
}

// Only portal paths may be a destination (the "it's ready" email and the
// gallery page's sign-in bounce use this).
const safeNext = (v) => (/^\/portal(\/[\w-]+)*\/?$/.test(String(v || "")) ? String(v) : "");

export default async function PortalPage({ searchParams }) {
  const sp = await searchParams;
  const next = safeNext(sp?.next);
  // Brandon's portal is the Studio: signing in lands there, not on the
  // client gallery home. ?galleries=1 (the nav's Galleries link) still
  // opens this page so he can see what a client sees.
  const wantGalleries = sp?.galleries === "1";
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

  const { user, client, galleries, payments, hostedGalleries, palette } =
    await getClientData();

  if (user && next) redirect(next);
  if (user && !wantGalleries && adminConfigured && user.email?.toLowerCase() === ADMIN_EMAIL) redirect("/portal/admin");

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

  // Their brief (latest intake row) — shown as a card so they can keep it current.
  let brief = null;
  if (adminConfigured && !isAdmin) {
    try {
      const { data } = await supabaseAdmin().from("submissions").select("id, created_at, updated_at, kind, fields, utm").eq("kind", "intake").eq("email", user.email.toLowerCase()).order("created_at", { ascending: false }).limit(3);
      const b = latestBrief(data || []);
      brief = b ? { id: b.id, when: new Date(b.updated_at).toLocaleDateString("en-US", { month: "long", day: "numeric" }) } : false;
    } catch { brief = null; }
  }

  // Business client (Brandon has opened a brand palette for them): their
  // content and their brand on one page.
  if (palette) {
    const plan = adminConfigured ? await loadPublishedPlan(supabaseAdmin(), client.id) : null;
    return (
      <PortalBusinessHome
        nav={<PortalNav email={user.email} active="galleries" brand />}
        name={palette.data?.business?.name || client.name}
        hostedGalleries={hostedGalleries || []}
        galleries={galleries}
        payments={payments}
        total={total}
        money={money}
        dateFmt={dateFmt}
        brand={brandSummary(palette)}
        brief={brief || false}
        plan={plan}
      />
    );
  }

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
      brief={brief}
    />
  );
}
