// The picture in a text-message / social link preview of a share link
// (2026-11-09). /g/<token>/og?album=<day>[--<folder>] returns that album's
// first photo (a film's poster frame if it has no photos); no album = the
// gallery's cover. Streamed from R2 so the URL never expires. Falls back to
// the Roth Media card.

import { resolveShareToken } from "../../../../lib/share-aliases";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { r2Configured, signedUrl, photoKey } from "../../../../lib/r2";
import { readAlbumParam, sectionMatches, splitAlbum } from "../../../../lib/albums";
import { resolveDesign } from "../../../../lib/design";

export const dynamic = "force-dynamic";

const jpgName = (f) => String(f).replace(/\.[^.]+$/, "") + ".jpg";
const fallback = () => Response.redirect("https://rothmediaco.com/og-card.png", 302);

export async function GET(request, { params }) {
  try {
    const token = resolveShareToken((await params).token);
    if (!adminConfigured || !r2Configured || !/^[0-9a-f-]{36}$/.test(token)) return fallback();
    const db = supabaseAdmin();
    const { data: g } = await db.from("galleries").select("id, cover_filename, premiere_enabled, reveal_at, design").eq("share_token", token).maybeSingle();
    if (!g) return fallback();
    // Before a premiere's reveal, nothing leaves the server.
    if (g.premiere_enabled && g.reveal_at && new Date(g.reveal_at) > new Date()) return fallback();

    const want = readAlbumParam(new URL(request.url).searchParams.get("album"));
    let key = null;
    if (want) {
      const { data: media } = await db.from("media").select("filename, kind, section").eq("gallery_id", g.id).order("position", { ascending: true });
      const inAlbum = (media || []).filter((m) => sectionMatches(m.section, want));
      // A whole-day link uses the cover picked in Studio, if any.
      const day = inAlbum[0] ? splitAlbum(inAlbum[0].section).day : null;
      const pick = !want.folder && day ? resolveDesign(g.design).covers[day] : null;
      const photo = (pick && inAlbum.find((m) => m.filename === pick && m.kind !== "video")) || inAlbum.find((m) => m.kind !== "video");
      const film = inAlbum.find((m) => m.kind === "video");
      if (photo) key = photoKey(g.id, "web", jpgName(photo.filename));
      else if (film) key = photoKey(g.id, "thumb", jpgName(film.filename));
    }
    if (!key && g.cover_filename) key = photoKey(g.id, "web", jpgName(g.cover_filename));
    if (!key) return fallback();

    const res = await fetch(await signedUrl(key, { expiresIn: 300 }));
    if (!res.ok) return fallback();
    return new Response(res.body, {
      headers: {
        "Content-Type": res.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch {
    return fallback();
  }
}
