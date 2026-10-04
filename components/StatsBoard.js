"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtHours, share } from "../lib/stats-math";
import { usd } from "../lib/money-view";

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
import { FORM_KIND_LABEL as KIND, LEAD_STATUS_LABEL as STATUS } from "../lib/studio-labels";
const fullWhen = (d) => new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
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

const money0 = (n) => `$${fmt(n)}`;
const age = (h) => (h < 1 ? `${Math.max(1, Math.round(h * 60))}m` : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`);

// What each lead actually did on the site, as small chips.
function Did({ d }) {
  const chips = [
    d.bookedCall && ["good", "booked a call"],
    d.openedCheckout && ["hot", "opened checkout"],
    !d.bookedCall && d.clickedCall && ["warm", "looked at call times"],
    d.sawPricing && ["", "saw pricing"],
    d.savedContact && ["", "saved contact"],
    d.fromQr && ["", "from QR"],
    d.pages > 0 && ["", `${d.pages} page${d.pages > 1 ? "s" : ""}`],
  ].filter(Boolean);
  if (!chips.length) return <span className="inbox-hint">no site activity matched</span>;
  return <span className="lchips">{chips.map(([tone, label]) => <span key={label} className={`lchip ${tone ? `is-${tone}` : ""}`}>{label}</span>)}</span>;
}

function LeadIntel({ data }) {
  const i = data.intel;
  return (
    <>
      <section className="spanel spanel-wide lintel">
        <div className="spanel-head">
          <h3>What&apos;s going on</h3>
          <span className="gcard-meta"><Link href="/portal/admin/inbox">Open inbox →</Link></span>
        </div>
        <ul className="lsignals">
          {i.signals.map((s) => (
            <li key={s.text} className={`is-${s.tone}`}><span className="lsignal-dot" aria-hidden="true" />{s.text}</li>
          ))}
        </ul>
        <div className="astats lintel-tiles">
          <Tile value={fmt(i.overdue)} label="Overdue leads" hint="no reply in 24h+" help="Leads still marked New in the inbox more than 24 hours after they came in. This should always be zero. Mark a lead Contacted in the inbox the moment you text, call, or email." />
          <Tile value={fmt(i.callsBooked)} label="Calls booked" hint={i.pickerShown ? `${share(i.callsBooked, i.pickerShown)} who saw the picker` : "from the site's call picker"} help="Calls booked through the picker that now appears right after every form. The goal is every lead with a call on the calendar inside 24 hours." />
          <Tile value={fmt(i.checkoutOpens)} label="Checkout opens" hint={data.kpis.bookingsOk ? `${fmt(data.kpis.bookings)} paid` : "taps on Book it"} help="Times someone hit 'Book it' and went to Stripe. Opens minus paid is people who were one step from paying — the warmest follow-up you have." />
          <Tile value={money0(i.pipeline)} label="Open pipeline" hint={`${fmt(i.open)} open lead${i.open === 1 ? "" : "s"}`} help="The quoted starting price of every lead still New or Contacted. It's what's on the table right now." />
          {i.close.known ? (
            <Tile value={money0(i.expected)} label="Expected to book" hint={`${share(i.close.won, i.close.decided)} booked`} help="Open pipeline times your own close rate — the share of people you marked Booked out of everyone you marked Booked or Lost in this window — weighted up for hot leads and down for cold ones." />
          ) : (
            <Tile value={money0(i.expected)} label="Could book (a guess)" hint={`assumes 1 in ${Math.round(1 / i.assumedRate)} book · not your real rate yet`} help={`This is a placeholder, not a forecast. It assumes ${Math.round(i.assumedRate * 100)}% of open leads book, because there isn't enough history to know your real rate: ${i.close.decided} of the ${i.close.need} needed are marked Booked or Lost in this window. Mark leads Booked or Lost in the inbox and this switches to your own number.`} />
          )}
          {!i.touch.ready ? (
            <Tile value="—" label="Time to first touch" hint="run supabase/studio-2.sql once" help="This needs the 'first replied' stamp the inbox adds. Run supabase/studio-2.sql once in the Supabase SQL editor and it starts measuring from your next reply. No number is shown until then, so you never see a wrong one." />
          ) : i.touch.n === 0 ? (
            <Tile value="—" label="Time to first touch" hint="no replies logged in this window yet" help="From the moment a lead comes in to your first reply. The inbox stamps it the first time you reply or mark a lead Contacted. Nothing to measure yet for leads in this window." />
          ) : (
            <Tile value={fmtHours(i.touch.medianHours)} label="Time to first touch" hint={`middle of ${i.touch.n} repl${i.touch.n === 1 ? "y" : "ies"} · target 15m`} help="From the moment a lead came in to your first reply, stamped by the inbox the first time you reply or mark them Contacted. Only leads you've replied to are in it; the ones still waiting show under Overdue leads." />
          )}
        </div>
      </section>

      <section className="spanel spanel-wide sforms">
        <div className="spanel-head">
          <h3>Lead tracker</h3>
          <span className="gcard-meta">Hottest open leads first · heat is 0–100</span>
        </div>
        {data.board.length === 0 ? (
          <p className="inbox-hint">No leads in this window.</p>
        ) : (
          <div className="ltable-wrap">
            <table className="idet-fields stable sforms-table">
              <thead><tr><th>In</th><td>Who</td><td>Wants</td><td>What they did</td><td>Heat</td><td>Your next move</td></tr></thead>
              <tbody>
                {data.board.map((l) => (
                  <tr key={l.id} className={l.open ? "" : "is-closed"}>
                    <th scope="row" title={fullWhen(l.at)}>{age(l.ageHours)} ago</th>
                    <td><Link href={`/portal/admin/inbox?open=${l.id}`}>{l.name}</Link><br /><span className={`itag itag-${l.status}`}>{STATUS[l.status] || l.status}</span></td>
                    <td>{l.summary || KIND[l.kind] || l.kind}</td>
                    <td><Did d={l.did} /></td>
                    <td>{l.open ? <span className="lheat" title={`Heat ${l.heat} of 100`}><span style={{ width: `${l.heat}%` }} /><b>{l.heat}</b></span> : "—"}</td>
                    <td><span className={`lnext is-${l.next.tone}`}>{l.next.text}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="spanel spanel-wide">
        <h3>Warm right now, no form yet</h3>
        <p className="inbox-hint">Visitors in the last 48 hours who acted like buyers but didn&apos;t leave their info. Anonymous — this is a read on demand, not a call list.</p>
        {data.hot.length === 0 ? (
          <p className="inbox-hint">Nobody right now.</p>
        ) : (
          <ul className="sfeed">
            {data.hot.map((h, n) => (
              <li key={n}>
                <time>{ago(h.last)}</time>
                <span>
                  <strong>{h.did.join(" · ")}</strong>
                  <em>{[h.where, h.device, h.fromQr && "from your QR card"].filter(Boolean).join(" · ")}</em>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function StatsBoard({ data }) {
  const k = data.kpis;
  const m = k.money;
  const [tableOpen, setTableOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  if (!data.ready) {
    return (
      <p className="portal-empty">
        Stats aren&apos;t set up yet — run <code>supabase/studio.sql</code> in the Supabase SQL editor
        once. Counting starts the moment it&apos;s in.
      </p>
    );
  }

  const topFunnel = Math.max(1, data.funnel[0].n);
  const lastFunnel = data.funnel[data.funnel.length - 1].n;
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

      <LeadIntel data={data} />

      <div className="astats">
        <Tile value={fmt(k.visits)} label="Visits" hint="unique people per day" help="How many different people came to the site. The same person twice in one day counts once; tomorrow they count again. Your own visits from this device aren't counted. This is your reach — ads, posts, and the QR card all feed it." />
        <Tile value={fmt(k.leads)} label="Leads" hint={k.leads ? `${fmt(k.booked)} of them booked` : "none in this window"} help="Forms a new person sent from the site — quotes, messages, promo entries, business-card contacts. Not counted: intake questionnaires, call sheets, old inquiries you pasted in, partner sign-ups, payment rows, and anything you archived. 'Booked' counts people, once each, however many forms or payments they made." />
        <Tile value={pct(k.visits ? k.leads / k.visits : 0)} label="Visit → lead" hint={`${fmt(k.leads)} of ${fmt(k.visits)} visits`} help="Of everyone who visited, what share sent a form. 2–5% is healthy for a service business; under 1% means the site isn't asking clearly enough, or the traffic is the wrong people. With only a handful of leads this swings a lot — read the counts, not just the percent." />
        {k.bookingsOk ? (
          <Tile value={pct(k.visits ? k.bookings / k.visits : 0)} label="Visit → paid" hint={`${fmt(k.bookings)} of ${fmt(k.visits)} visits`} help="Bookings paid through the site in this window, against visits. Each booking counts once — a balance payment later doesn't make it two." />
        ) : (
          <Tile value="—" label="Visit → paid" hint="run supabase/bookings.sql once" help="Paid bookings live in the bookings table, which isn't set up yet." />
        )}
        {m.basis === "paid" ? (
          <Tile value={usd(m.cents)} label="Collected" hint={`paid in this window · ${fmt(m.payments)} payment${m.payments === 1 ? "" : "s"}`} help={`Money that actually came in through the site during this window — first payments and balances, each counted on the day it was paid${m.balancePayments ? ` (${m.balancePayments} of these ${m.balancePayments === 1 ? "is a balance" : "are balances"})` : ""}. Bookings made in this window are worth ${usd(m.bookedValueCents)} in all.`} />
        ) : m.basis === "bookings" ? (
          <Tile value={usd(m.cents)} label="Paid on new bookings" hint={`to date, on ${fmt(m.payments)} booking${m.payments === 1 ? "" : "s"} made in this window`} help={`The dated payment rows for this window couldn't be read, so this isn't "money in during the window". It's what has been paid so far on bookings made in this window (worth ${usd(m.bookedValueCents)} in all). A balance paid later is in here; a balance paid in this window on an older booking isn't.`} />
        ) : (
          <Tile value="—" label="Collected" hint="run supabase/bookings.sql once" help="Payments are recorded in the bookings table, which isn't set up yet." />
        )}
        <Tile value={fmt(k.galleryOpens)} label="Gallery opens" hint={`${fmt(k.gallerySaves)} saves`} help="Times a client (or someone they shared with) opened a gallery, and how many photos they saved. High opens + low saves means they're browsing on the phone — a nudge to download everything before the 12-month window helps." />
        <Tile value={fmt(k.guestUploads)} label="Guest uploads" hint="photos, videos, messages" help="What wedding guests sent through the QR cards. Each one is a guest who now knows your name — and a couple who got extra value you can mention in the next pitch." />
      </div>

      <div className="sgrid">
        <section className="spanel">
          <h3>From visit to paid</h3>
          <ol className="sfunnel">
            {data.funnel.map((f) => (
              <li key={f.label}>
                <span className="sfunnel-bar" style={{ width: `${(f.n / topFunnel) * 100}%` }} />
                <span className="sranked-key">{f.label}</span>
                <span className="sranked-val">
                  {fmt(f.n)}
                  {f.of ? <em> of {fmt(f.of)} · {pct(f.n / f.of)}</em> : null}
                </span>
              </li>
            ))}
          </ol>
          <p className="st-note">
            Counted in visits (one person, one day), and each step is out of the step above it.
            {k.bookingsOk && k.bookings !== lastFunnel
              ? ` ${fmt(k.bookings)} paid booking${k.bookings === 1 ? "" : "s"} recorded in this window in all — someone who pays from a texted link or on another device isn't in this funnel.`
              : ""}
          </p>
        </section>

        <Ranked title="Where visitors came from" rows={data.sources} />

        <section className="spanel">
          <h3>What each source turned into</h3>
          {data.leadSources.length === 0 ? (
            <p className="inbox-hint">No leads in this window yet.</p>
          ) : (
            <table className="idet-fields stable ssources">
              <thead>
                <tr><th>Source</th><td>Leads</td><td>Booked</td><td>Collected</td></tr>
              </thead>
              <tbody>
                {data.leadSources.map((r) => (
                  <tr key={r.source}>
                    <th scope="row">{r.source}</th>
                    <td>{fmt(r.leads)}</td>
                    <td>{fmt(r.booked)}</td>
                    <td>{r.cents ? usd(r.cents) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="st-note">
            Each lead is credited to the link it arrived on (utm_source), or failing that to where that visit came from. Booked counts people once. Money lands on the source of a person&apos;s first lead, so a balance paid later still credits the ad that found them.
          </p>
        </section>

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

      {/* Everything else is still here, one tap away. */}
      <details className="st-more" open={moreOpen} onToggle={(e) => setMoreOpen(e.currentTarget.open)}>
        <summary>
          Traffic details
          <em>visitors per day, pages, cities, devices, busiest hours, live feed, every form</em>
        </summary>
        {moreOpen && (
          <div className="st-more-body">
            <div className="astats">
              <Tile value={fmt(k.pageviews)} label="Page views" hint={`${k.pagesPerVisit.toFixed(1)} pages per visit`} help="Every page load. Pages per visit tells you if people look around (2+ is good) or bounce off the first page (close to 1 means the landing page isn't hooking them)." />
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
            </div>

            <section className="spanel spanel-wide sforms">
              <div className="spanel-head">
                <h3>Forms that came in</h3>
                <span className="gcard-meta">
                  {data.formKinds.length ? data.formKinds.map(([kind, n]) => `${n} ${KIND[kind] || kind}`).join(" · ") : "None in this window"}
                  {" · "}<Link href="/portal/admin/inbox">Open inbox →</Link>
                </span>
              </div>
              <p className="inbox-hint">Everything that landed in the inbox, leads or not — intake answers and payment rows are listed here but aren&apos;t counted as leads above.</p>
              {data.forms.length === 0 ? (
                <p className="inbox-hint">No forms in this window. Quotes, messages, business-card taps, and paid bookings all land here.</p>
              ) : (
                <div className="ltable-wrap">
                  <table className="idet-fields stable sforms-table">
                    <thead><tr><th>When</th><td>Who</td><td>What</td><td>Type</td><td>From</td><td>Status</td></tr></thead>
                    <tbody>
                      {data.forms.map((f) => (
                        <tr key={f.id}>
                          <th scope="row">{fullWhen(f.at)}</th>
                          <td><Link href={`/portal/admin/inbox?open=${f.id}`}>{f.name}</Link></td>
                          <td>{f.summary}</td>
                          <td>{KIND[f.kind] || f.kind}</td>
                          <td>{f.from}</td>
                          <td><span className={`itag itag-${f.status}`}>{STATUS[f.status] || f.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </details>
    </div>
  );
}
