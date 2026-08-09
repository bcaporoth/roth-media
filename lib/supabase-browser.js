"use client";

import { createBrowserClient } from "@supabase/ssr";

// flowType "implicit": the emailed sign-in link carries the session in the
// URL fragment, so it works in ANY browser or device — not just the one
// that requested it (the old PKCE flow broke on phones and fresh browsers).
export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { flowType: "implicit" } }
  );
}
