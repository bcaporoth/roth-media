import { NextResponse } from "next/server";
import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request) {
  if (portalConfigured) {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/portal", new URL(request.url).origin), {
    status: 303,
  });
}
