import { adminConfigured, supabaseAdmin } from "./supabase-admin";

const TOKEN_RE = /^[0-9a-f-]{36}$/;

// Flip a client's broadcast opt-out by their unsubscribe token. True on success.
export async function optOut(token) {
  if (!adminConfigured || !TOKEN_RE.test(String(token || ""))) return false;
  const { data, error } = await supabaseAdmin()
    .from("clients")
    .update({ email_opt_out: true })
    .eq("unsubscribe_token", token)
    .select("id");
  return !error && Boolean(data?.length);
}
