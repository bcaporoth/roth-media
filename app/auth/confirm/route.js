import { NextResponse } from "next/server";
import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

// Any-browser magic-link landing. The email links here with a token_hash,
// which — unlike the old PKCE `code` flow — does not depend on the browser
// that requested the link. Works from a phone, another computer, anywhere.
export async function GET(request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") || "email";

  if (portalConfigured && tokenHash) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL("/portal", url.origin));
    }
  }

  return NextResponse.redirect(new URL("/portal?error=link", url.origin));
}
