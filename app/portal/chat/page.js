import "../../theme/misc.css";
import { redirect } from "next/navigation";
import PortalNav from "../../../components/PortalNav";
import { PortalFrame } from "../../../components/PortalViews";
import NotesThread from "../../../components/NotesThread";
import PortalTop from "../../../components/PortalTop";
import { portalWho } from "../../../lib/portal-who";

import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "../../../lib/supabase-admin";
import { emailHasBrand } from "../../../lib/brand-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chat with Brandon", robots: { index: false } };

// The client's chat with Brandon, on its own page (2026-11-18). It used to be
// a "Notes with Brandon" box in the middle of the portal home; Brandon: "we
// need this condensed into a separate page where a chat can be… notes is too
// ambiguous". Same thread Brandon answers from the client's profile in the
// Command Center (components/NotesThread.js, /api/notes).
export default async function ChatPage() {
  if (!portalConfigured) redirect("/portal");
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal?next=/portal/chat");
  const email = user.email.toLowerCase();
  if (email === ADMIN_EMAIL) redirect("/portal/admin/inbox");
  let client = null; let hasBrand = false;
  if (adminConfigured) {
    const db = supabaseAdmin();
    [{ data: client }, hasBrand] = await Promise.all([
      db.from("clients").select("id, name").eq("email", email).maybeSingle(),
      emailHasBrand(db, email),
    ]);
  }
  const who = adminConfigured ? await portalWho(supabaseAdmin(), email) : { kick: "Client portal", title: "Hi, there." };
  const nav = <PortalNav email={user.email} active="chat" brand={hasBrand} />;
  return (
    <PortalFrame nav={nav} className="pt-brief pt-chat mx-page">
      <PortalTop who={who} page="Chat with Brandon" lede={<>Ask a question, send a date or an idea, or ask to change something. Brandon gets an email the moment you send it, and his answer shows up here.</>} />
      <section className="cx-section cx-section--tight">
        <div className="cx-wrap pt-chat-wrap">
          {!client
            ? <p className="inbox-hint">Your account isn&apos;t linked to a client profile yet — text Brandon at 845-549-4425 and he&apos;ll switch it on.</p>
            : <NotesThread role="client" clientName={client.name || ""} />}
        </div>
      </section>
    </PortalFrame>
  );
}
