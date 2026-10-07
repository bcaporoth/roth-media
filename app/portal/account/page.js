import PasswordForm from "../../../components/PasswordForm";
import PortalNav from "../../../components/PortalNav";
import { PortalAccount } from "../../../components/PortalViews";
import { redirect } from "next/navigation";
import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";
import { ADMIN_EMAIL } from "../../../lib/supabase-admin";

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
  const next = /^\/portal(\/[\w-]+)*\/?$/.test(String(params?.next || "")) ? String(params.next) : "";

  return (
    <PortalAccount
      nav={
        <PortalNav
          email={user.email}
          isAdmin={user.email?.toLowerCase() === ADMIN_EMAIL}
          active="account"
        />
      }
      email={user.email}
      setup={setup}
    >
      <PasswordForm setup={setup} next={next} />
    </PortalAccount>
  );
}
