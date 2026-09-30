"use client";

import { useState } from "react";
import Link from "next/link";

// Studio stats — first-party numbers from /api/t. One hue (the accent)
// everywhere: every chart here is a single series, so color only marks
// "this is data", and every value is also written out as text.

const RANGE_LABEL = { 1: "Today", 7: "7 days", 30: "30 days", 90: "90 days" };

const fmt = (n) => Math.round(n).toLocaleString("en-US");
const pct = (n) => `${(n * 100).toFixed(n > 0 && n < 0.1 ? 1 : 0)}%`;
const shortDay = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const ago = (d) => {
  const m = Math.round((Date.now() - new Date(d)) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`;
};
const hourLabel = (h) => (h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`);

// The "?" opens a plain-English note on what the number means and why it matters.
export function Tile({ value, label, hint, help }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={"astat" + (open ? " is-help" : "")}>
      {help && (
        <button type="button" className="astat-help" aria-label={`What is ${label}?`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>?</button>
      )}
      <strong>{value}</strong>
      <span>{label}</span>
      {hint && <em className="astat-hint">{hint}</em>}
      {help && open && <p className="astat-pop">{help}</p>}
    </div>
  );
}

// Vertical bars with a hover/focus tooltip. Bars are anchored to the
// baseline with a 2px gap; the SVG stretches to the panel width at a fixed
// height, and the day labels are HTML so they never distort or clip.
function Bars({ points, valueKey, labelFn, tipFn, height = 150 }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...points.map((p) => p[valueKey]));
  const n = points.length;
  const W = 1000;
  const gap = n > 40 ? 1 : 2;
  const bw = (W - gap * (n - 1)) / n;
  const tickEvery = n > 45 ? 14 : n > 20 ? 7 : n > 12 ? 3 : 1;
  return (
    <div className="sbars" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${height}`} style={{ height }} role="img" aria-label="Bar chart" preserveAspectRatio="none">
        <line x1="0" x2={W} y1={height} y2={height} className="sbars-base" />
        {points.map((p, i) => {
          const h = (p[valueKey] / max) * (height - 6);
          const x = i * (bw + gap);
          return (
            <g key={i}>
              {h > 0 && (
                <rect
                  className={"sbar" + (hover === i ? " is-hover" : "")}
                  x={x}
                  y={height - h}
                  width={bw}
                  height={h}
                  rx={Math.min(3, bw / 3)}
                />
              )}
              <rect
                x={x - gap / 2}
                y={0}
                width={bw + gap}
                height={height}
                fill="transparent"
                tabIndex={0}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={tipFn(p)}
              />
            </g>
          );
        })}
      </svg>
      <div className="sbars-ticks" aria-hidden="true">
        {points.map((p, i) =>
          i % tickEvery === 0 && labelFn(p, i) ? (
            <span key={i} style={{ left: `${((i + 0.5) / n) * 100}%` }}>
              {labelFn(p, i)}
            </span>
          ) : null
        )}
      </div>
      {hover !== null && (
        <div className="stip" style={{ left: `${((hover + 0.5) / n) * 100}%` }} role="status">
          {tipFn(points[hover])}
        </div>
      )}
    </div>
  );
}

function Ranked({ title, rows, unit = "visits", empty = "Nothing yet." }) {
  const max = Math.max(1, ...rows.map((r) => r.visitors || r.count));
  return (
    <section className="spanel">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="inbox-hint">{empty}</p>
      ) : (
        <ul className="sranked">
          {rows.map((r) => {
            const v = r.visitors || r.count;
            return (
              <li key={r.key} title={`${r.key}: ${fmt(v)} ${unit}${r.visitors ? ` · ${fmt(r.count)} views` : ""}`}>
                <span className="sranked-bar" style={{ width: `${(v / max) * 100}%` }} />
                <span className="sranked-key">{r.key}</span>
                <span className="sranked-val">{fmt(v)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function StatsBoard({ data }) {
  const k = data.kpis;
  const [tableOpen, setTableOpen] = useState(false);

  if (!data.ready) {
    return (
      <p className="portal-empty">
        Stats aren&apos;t set up yet — run <code>supabase/studio.sql</code> in the Supabase SQL editor
        once. Counting starts the moment it&apos;s in.
      </p>
    );
  }

  const topFunnel = Math.max(1, data.funnel[0].n);
  const peakHour = data.hours.indexOf(Math.max(...data.hours));

  return (
    <div className="stats">
      <div className="srange" role="group" aria-label="Date range">
        {[1, 7, 30, 90].map((r) => (
          <Link
            key={r}
            href={`/portal/admin/stats?range=${r}`}
            className={"ifilter" + (data.range === r ? " is-on" : "")}
            aria-current={data.range === r ? "true" : undefined}
          >
            {RANGE_LABEL[r]}
          </Link>
        ))}
        <span className="slive">
          <span className="slive-dot" aria-hidden="true" />
          {k.live} on the site now
        </span>
      </div>

      <div className="astats">
        <Tile value={fmt(k.visits)} label="Visits" hint="unique people per day" help="How many different people came to the site. The same person twice in one day counts once; tomorrow they count again. Your own visits from this device aren't counted. This is your reach — ads, posts, and the QR card all feed it." />
        <Tile value={fmt(k.pageviews)} label="Page views" hint={`${k.pagesPerVisit.toFixed(1)} pages per visit`} help="Every page load. Pages per visit tells you if people look around (2+ is good) or bounce off the first page (close to 1 means the landing page isn't hooking them)." />
        <Tile value={fmt(k.leads)} label="Leads" hint={`${k.booked} booked`} help="Forms sent — quotes, messages, promo entries, business-card contacts. 'Booked' is the ones you've marked booked in the inbox plus paid bookings. This is the number to grow; visits only matter if they turn into these." />
        <Tile value={pct(k.conversion)} label="Visit → lead" hint="leads ÷ visits" help="Of everyone who visited, what share sent a form. 2–5% is healthy for a service business; under 1% means the site isn't asking clearly enough, or the traffic is the wrong people." />
        <Tile value={pct(k.visits ? k.bookings / k.visits : 0)} label="Visit → paid" hint={`${fmt(k.bookings)} booked & paid`} help="Visitors who went all the way through 'Book it' and paid. The truest number on this page: money in, no chasing. Compare it to Visit → lead to see how many leads you're closing." />
        <Tile value={`$${fmt(k.paidCents / 100)}`} label="Collected" hint={`of $${fmt(k.bookedValueCents / 100)} booked`} help="Cash actually paid through the site in this window (retainers plus full payments). 'Booked' is the full value of those jobs — the gap is balances still due." />
        <Tile value={fmt(k.galleryOpens)} label="Gallery opens" hint={`${fmt(k.gallerySaves)} saves`} help="Times a client (or someone they shared with) opened a gallery, and how many photos they saved. High opens + low saves means they're browsing on the phone — a nudge to download everything before the 12-month window helps." />
        <Tile value={fmt(k.guestUploads)} label="Guest uploads" hint="photos, videos, messages" help="What wedding guests sent through the QR cards. Each one is a guest who now knows your name — and a couple who got extra value you can mention in the next pitch." />
        <Tile value={fmt(k.qr)} label="QR scans" hint="business card visits" help="Visits that came from your business card or printed QR. Tells you if the cards you hand out are actually getting scanned." />
      </div>

      {data.range > 1 && (
        <section className="spanel spanel-wide">
          <div className="spanel-head">
            <h3>Visitors per day</h3>
            <button type="button" className="achip" onClick={() => setTableOpen(!tableOpen)}>
              {tableOpen ? "Hide table" : "Show table"}
            </button>
          </div>
          <Bars
            points={data.daily}
            valueKey="visitors"
            labelFn={(p) => shortDay(p.date)}
            tipFn={(p) =>
              `${shortDay(p.date)} — ${fmt(p.visitors)} visitors · ${fmt(p.pageviews)} views${p.leads ? ` · ${p.leads} lead${p.leads > 1 ? "s" : ""}` : ""}`
            }
          />
          {tableOpen && (
            <table className="idet-fields stable">
              <thead>
                <tr>
                  <th>Day</th>
                  <td>Visitors</td>
                  <td>Views</td>
                  <td>Leads</td>
                </tr>
              </thead>
              <tbody>
                {[...data.daily].reverse().map((d) => (
                  <tr key={d.date}>
                    <th scope="row">{shortDay(d.date)}</th>
                    <td>{d.visitors}</td>
                    <td>{d.pageviews}</td>
                    <td>{d.leads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <div className="sgrid">
        <section className="spanel">
          <h3>From visit to lead</h3>
          <ol className="sfunnel">
            {data.funnel.map((f, i) => (
              <li key={f.label}>
                <span className="sfunnel-bar" style={{ width: `${(f.n / topFunnel) * 100}%` }} />
                <span className="sranked-key">{f.label}</span>
                <span className="sranked-val">
                  {fmt(f.n)}
                  {i > 0 && data.funnel[i - 1].n > 0 && (
                    <em> · {pct(f.n / data.funnel[i - 1].n)}</em>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="spanel">
          <h3>Busiest hours</h3>
          <p className="inbox-hint">
            {data.hours.some(Boolean)
              ? `Most visits around ${hourLabel(peakHour)} (Eastern).`
              : "Not enough visits yet."}
          </p>
          <Bars
            points={data.hours.map((v, h) => ({ h, v }))}
            valueKey="v"
            height={90}
            labelFn={(p) => (p.h % 6 === 0 ? hourLabel(p.h) : "")}
            tipFn={(p) => `${hourLabel(p.h)} — ${fmt(p.v)} visits`}
          />
        </section>

        <Ranked title="Top pages" rows={data.pages} />
        <Ranked title="Where visitors came from" rows={data.sources} />
        <Ranked title="Cities" rows={data.cities} empty="Location shows up on the live site." />
        <Ranked title="Devices" rows={data.devices} />
        <Ranked title="Browsers" rows={data.browsers} />
        <Ranked title="Operating systems" rows={data.os} />
        <Ranked
          title="Button clicks & actions"
          rows={data.events.map((e) => ({ ...e, key: e.key.replace(/_/g, " ") }))}
          unit="times"
        />

        <section className="spanel">
          <h3>Client galleries</h3>
          {data.galleries.length === 0 ? (
            <p className="inbox-hint">No gallery opens in this window yet.</p>
          ) : (
            <ul className="sranked sranked-plain">
              {data.galleries.map((g) => (
                <li key={g.title}>
                  <span className="sranked-key">{g.title}</span>
                  <span className="sranked-val">
                    {fmt(g.views)} opens · {fmt(g.downloads)} saves
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="sgrid">
        <section className="spanel">
          <h3>Live feed</h3>
          <ul className="sfeed">
            {data.recent.length === 0 && <li className="inbox-hint">Waiting for the first visitor.</li>}
            {data.recent.map((r, i) => (
              <li key={i}>
                <time>{ago(r.at)}</time>
                <span>
                  {r.type === "event" ? <strong>★ {r.label.replace(/_/g, " ")}</strong> : r.label}
                  <em>
                    {[r.where, r.device, r.source].filter(Boolean).join(" · ")}
                  </em>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="spanel">
          <h3>Gallery activity</h3>
          <ul className="sfeed">
            {data.galleryFeed.length === 0 && <li className="inbox-hint">Nothing yet.</li>}
            {data.galleryFeed.map((a, i) => (
              <li key={i}>
                <time>{ago(a.at)}</time>
                <span>
                  <strong>{a.title}</strong> —{" "}
                  {a.action === "view"
                    ? "opened"
                    : a.action === "download_all"
                      ? "downloaded everything"
                      : `saved ${a.filename || "a photo"}`}
                  <em>{a.who}</em>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
