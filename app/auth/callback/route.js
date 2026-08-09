import { NextResponse } from "next/server";
import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

// Legacy magic-link landing (PKCE `code` flow). Kept so links from old
// emails still work when opened in the same browser that requested them.
// New emails link to /auth/confirm, which works in any browser.
export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (portalConfigured && code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/portal", url.origin));
    }
  }

  return NextResponse.redirect(new URL("/portal?error=link", url.origin));
}
