// Who the portal says it belongs to, at the top of every client page
// (components/PortalTop.js). Business clients (they have a brand page):
// "Your business portal" + the business name, exactly like their Home.
// Everyone else: "Client portal" + "Hi, <first name>."
export async function portalWho(db, email) {
  const fallback = { kick: "Client portal", title: "Hi, there." };
  if (!db || !email) return fallback;
  try {
    const { data: c } = await db.from("clients").select("id, name").eq("email", String(email).toLowerCase()).maybeSingle();
    if (!c) return fallback;
    const { data: p } = await db.from("brand_palettes").select("data").eq("client_id", c.id).maybeSingle();
    if (p) return { kick: "Your business portal", title: p.data?.business?.name || c.name || "Your business" };
    const first = String(c.name || "").trim().split(/\s+/)[0];
    return { kick: "Client portal", title: first ? `Hi, ${first.charAt(0).toUpperCase()}${first.slice(1)}.` : "Hi, there." };
  } catch {
    return fallback;
  }
}
