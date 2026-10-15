import "../../../../../../theme/brand.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "../../../../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../../../../lib/supabase-admin";
import { loadBrand } from "../../../../../../../lib/brand-server";
import { latestBrief } from "../../../../../../../lib/intake";
import { SECTIONS, COLOR_ROLES, VIBE_SLIDERS, fieldsFor } from "../../../../../../../lib/brand";
import { normHex, hexToRgb, hexToCmyk, inkOn } from "../../../../../../../lib/brand-color";

export const dynamic = "force-dynamic";
export const metadata = { title: "Brand sheet — Studio", robots: { index: false } };

const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");
const ROLE = Object.fromEntries(COLOR_ROLES.map((r) => [r.id, r.label]));
const gf = (name) => `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, "+")}:wght@400;700&display=swap`;

// The brand sheet: one page for shoot day and for editors — logos, colors,
// fonts, feel, must-have shots, who can't be on camera, music. Phone view
// on screen; ⌘P / Ctrl+P → Save as PDF for one letter page.
export default async function BrandSheetPage({ params }) {
  await requireAdminPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = supabaseAdmin();
  const { data: client } = await db.from("clients").select("id, name, email, phone").eq("id", id).maybeSingle();
  if (!client) notFound();
  const b = await loadBrand(db, client.id, { admin: true });
  const back = `/portal/admin/clients/${client.id}`;
  if (!b.ready || !b.palette) {
    return (
      <div className="sprint-page bsheet-page">
        <nav className="sprint-bar no-print"><Link href={back}>← {client.name}</Link></nav>
        <p className="sprint-missing">{!b.ready ? "Run supabase/brand.sql first." : "No brand palette for this client yet — open one from their profile."}</p>
      </div>
    );
  }
  const d = b.palette.data || {};
  const v = (sec, f) => d?.[sec]?.[f];
  const { data: subs } = await db.from("submissions").select("id, created_at, updated_at, kind, fields, utm").eq("kind", "intake").eq("email", client.email.toLowerCase()).order("created_at", { ascending: false }).limit(3);
  const brief = latestBrief(subs || []);
  const fromBrief = (re) => Object.entries(brief?.answers || {}).filter(([q]) => re.test(q)).map(([, a]) => a);

  const logos = b.assets.filter((a) => a.kind === "logo");
  const colors = (v("visual", "colors") || []).filter((c) => normHex(c.hex));
  const fonts = v("visual", "fonts") || {};
  const words = v("vibe", "words") || [];
  const sliders = v("vibe", "sliders") || {};
  const look = v("visual", "look") || {};
  const mustHave = [
    ...fromBrief(/gutted to miss/i).map((t) => `Non-negotiable: ${t}`),
    ...fromBrief(/^Must-have shots/i),
    ...(v("content", "craft") || []),
    ...(v("content", "moments") ? [v("content", "moments")] : []),
  ];
  const talk = Object.keys(d._talk || {}).map((k) => {
    const [sec, fid] = k.split(".");
    const s = SECTIONS.find((x) => x.key === sec);
    const f = s && fieldsFor(s, d).find((x) => x.id === fid);
    return f ? f.label : null;
  }).filter(Boolean);
  const notes = Object.entries(b.palette.brandon_notes || {}).filter(([, t]) => String(t || "").trim());
  const Line = ({ label, value, warn }) => (value ? <div className={"bsheet-line" + (warn ? " is-warn" : "")}><span>{label}</span><p>{Array.isArray(value) ? value.join(" · ") : value}</p></div> : null);
  const scale = (val) => <span className="bsheet-scale" aria-label={`${val} of 5`}>{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n === val ? "is-on" : ""} />)}</span>;

  return (
    <div className="sprint-page bsheet-page">
      <style>{`@media print { @page { size: letter; margin: 0.45in; } }`}</style>
      {[fonts.headline, fonts.body].filter((n) => n && /^[\w\s-]+$/.test(n)).map((n) => <link key={n} rel="stylesheet" href={gf(n)} />)}
      <nav className="sprint-bar no-print">
        <Link href={back}>← {client.name}</Link>
        <Link href={`${back}/brand`}>Edit palette</Link>
        <span className="sprint-bar-hint">⌘P / Ctrl+P → Save as PDF</span>
      </nav>
      <article className="bsheet">
        <header className="bsheet-head">
          <div className="bsheet-logo">{logos[0]?.url && /^image\//.test(logos[0].mime || "") ? <img src={(logos.find((a) => a.label === "Main logo") || logos[0]).url} alt="" /> : <span>No logo yet</span>}</div>
          <div>
            <span className="bsheet-kick">Roth Media · brand sheet · {fmt(b.palette.updated_at)}</span>
            <h1 style={fonts.headline ? { fontFamily: `"${fonts.headline}", var(--font-display), sans-serif` } : undefined}>{v("business", "name") || client.name}</h1>
            {v("business", "oneliner") && <p className="bsheet-one">{v("business", "oneliner")}</p>}
            <p className="bsheet-meta">{[v("business", "link"), v("business", "contact"), v("business", "where")].filter(Boolean).join(" · ")}</p>
          </div>
        </header>

        {v("content", "no_camera") && <div className="bsheet-alert"><strong>Do NOT film:</strong> {v("content", "no_camera")}</div>}

        <section className="bsheet-colors">
          {colors.length ? colors.map((c, i) => (
            <div key={i} className="bsheet-swatch">
              <span style={{ background: c.hex, color: inkOn(c.hex) }}>{ROLE[c.role] || c.role}</span>
              <p><strong>{c.hex.toUpperCase()}</strong><br />RGB {hexToRgb(c.hex).join(" ")}<br />CMYK {hexToCmyk(c.hex).join(" ")}</p>
            </div>
          )) : <p className="bsheet-empty">No colors yet.</p>}
        </section>

        <div className="bsheet-cols">
          <section>
            <h2>Fonts</h2>
            {fonts.pick && !fonts.headline && !fonts.body ? <p>Brandon picks.</p> : (
              <>
                {fonts.headline && <p className="bsheet-font" style={{ fontFamily: `"${fonts.headline}", sans-serif`, fontWeight: 700 }}>{fonts.headline} <small>headline</small></p>}
                {fonts.body && <p className="bsheet-font" style={{ fontFamily: `"${fonts.body}", sans-serif` }}>{fonts.body} <small>body</small></p>}
                {!fonts.headline && !fonts.body && <p className="bsheet-empty">Not set.</p>}
              </>
            )}
            <h2>Feel</h2>
            {words.length > 0 && <p className="bsheet-words">{words.join(" · ")}</p>}
            {v("vibe", "meets") && <p>Like {v("vibe", "meets")}</p>}
            <div className="bsheet-sliders">
              {[...VIBE_SLIDERS, ["Warm", "Cool"], ["Bright", "Moody"], ["Film", "Clean"]].map(([l, r]) => {
                const val = sliders[`${l}|${r}`] || look[`${l}|${r}`];
                return val ? <div key={l}><span>{l}</span>{scale(val)}<span>{r}</span></div> : null;
              })}
            </div>
            <Line label="Music" value={v("vibe", "music")} />
            <Line label="Logo use" value={v("visual", "logo_rules")} />
          </section>
          <section>
            <h2>Must-have shots</h2>
            {mustHave.length ? <ul>{mustHave.map((t, i) => <li key={i}>{t}</li>)}</ul> : <p className="bsheet-empty">None listed yet.</p>}
            <Line label="On camera" value={v("content", "on_camera")} />
            <Line label="Places to shoot" value={v("content", "locations")} />
            <Line label="Shoot days" value={v("logistics", "shoot_times")} />
            <Line label="Access" value={v("logistics", "access")} />
            <Line label="Contact" value={v("logistics", "contact")} />
          </section>
        </div>

        <section className="bsheet-voice">
          <h2>Words</h2>
          <Line label="Call to action" value={v("voice", "cta")} />
          <Line label="Speak as" value={[v("voice", "person"), v("voice", "emoji") ? `emoji: ${v("voice", "emoji")} ${v("voice", "emoji_which") || ""}` : ""].filter(Boolean).join(" · ")} />
          <Line label="Hashtags" value={v("voice", "hashtags")} />
          <Line label="Avoid" value={v("voice", "words_avoid")} />
          <Line label="Never claim" value={v("voice", "never_claim")} warn />
          <Line label="Allowed claims" value={v("voice", "claims_ok")} />
          <Line label="Dietary" value={v("business", "diet")} />
        </section>

        {(talk.length > 0 || notes.length > 0) && (
          <section className="bsheet-foot">
            {talk.length > 0 && <Line label="Ask on the call" value={talk} />}
            {notes.map(([sec, t]) => <Line key={sec} label={`Note · ${SECTIONS.find((s) => s.key === sec)?.title || sec}`} value={t} />)}
          </section>
        )}
      </article>
    </div>
  );
}
