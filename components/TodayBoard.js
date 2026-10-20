// Studio → Today: the first screen on the phone. Pure render — the page does
// the admin check and the loading, and hands this a ready-made `view`
// (built by lib/today.js). Every block has a calm empty state, and a block
// whose table isn't set up yet shows a one-line "run this SQL once" hint
// instead of breaking the page.

import Link from "next/link";
import CopyChip from "./CopyChip";

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const money = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
const tel = (p) => String(p || "").replace(/[^\d+]/g, "");

function Block({ kick, count, href, more, children }) {
  return (
    <section className="tcard">
      <header className="tcard-head">
        <span className="kick-sm">{kick}{count ? ` · ${count}` : ""}</span>
        {href && <Link className="tcard-more" href={href}>{more} →</Link>}
      </header>
      {children}
    </section>
  );
}

const LEADS_SHOWN = 5;
const OWED_SHOWN = 4;

export default function TodayBoard({ view }) {
  const { dayLabel, shoots, leads, owed, balances, numbers, notes = [], after = [], months = null, money: cash = null } = view;
  const s = shoots.next;
  const usd = (c) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const STEP_WORD = { review: "ask for a review", referral: "send the $100 friend code", rebook: "say “book next year”" };
  return (
    <div className="today">
      <p className="today-date">{dayLabel}</p>

      {cash?.ok && (
        <p className="today-money"><b>{usd(cash.collected)}</b> collected in {cash.label}{cash.due > 0 ? <> · <b>{usd(cash.due)}</b> in retainer links out, unpaid</> : null}</p>
      )}

      {/* 0 — people waiting on a word from you */}
      {(notes.length > 0 || after.length > 0) && (
        <Block kick="Waiting on you" count={notes.length + after.length} href="/portal/admin/inbox" more="Inbox">
          <ul className="tlist">
            {notes.map((n) => (
              <li key={"n" + n.id} className="trow trow-static">
                <span className="trow-top"><strong>{n.name}</strong><span className="dchip is-over">{n.count > 1 ? `${n.count} notes` : "note"}</span></span>
                <span className="trow-sub">“{String(n.latest).slice(0, 120)}”</span>
                <span className="tcard-actions"><Link className="achip" href={`/portal/admin/clients/${n.id}#notes`}>Reply</Link></span>
              </li>
            ))}
            {after.map((g) => (
              <li key={"a" + g.id} className="trow trow-static">
                <span className="trow-top"><strong>{g.name}</strong><span className="dchip">{g.title}</span></span>
                <span className="trow-sub">Album out {g.days} days — {STEP_WORD[g.step]}</span>
                <span className="tcard-actions"><Link className="achip" href={`/portal/admin/clients/${g.clientId}#galleries`}>Do it</Link></span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {/* retainers this month */}
      {months && months.length > 0 && (
        <Block kick={`Retainers · ${cash?.label || "this month"}`} count={months.length}>
          <ul className="tlist">
            {months.map((m) => (
              <li key={m.id} className="trow trow-static">
                <span className="trow-top"><strong>{m.name}</strong><span className={"dchip" + (!m.paid && m.price > 0 ? " is-over" : "")}>{m.paid ? "Paid" : m.price > 0 ? `${usd(m.price)} due` : "No price"}</span></span>
                <span className="trow-sub">{m.done} of {m.total} delivered{m.published ? "" : " · not on their portal yet"}</span>
                <span className="tcard-actions"><Link className="achip" href={`/portal/admin/clients/${m.clientId}/months`}>Open month</Link>{m.dayId && <Link className="achip" href={`/portal/admin/clients/${m.clientId}/days/${m.dayId}`}>Shoot day</Link>}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {/* 1 — next shoot */}
      <Block kick={s?.isToday ? "Today's shoot" : "Next shoot"} href="/portal/admin/shoots" more="All shoots">
        {!shoots.ok ? (
          <p className="today-hint">Shoots aren&apos;t set up yet — run <code>supabase/shoots.sql</code> once in the Supabase SQL editor.</p>
        ) : !s ? (
          <p className="today-empty">
            Nothing on the calendar.{shoots.undated > 0 ? ` ${plural(shoots.undated, "shoot")} still ${shoots.undated === 1 ? "needs" : "need"} a date.` : ""}{" "}
            <Link href="/portal/admin/shoots?new=1">Plan a shoot →</Link>
          </p>
        ) : (
          <>
            <div className="tshoot-top">
              <strong className="tshoot-title">{s.title}</strong>
              <span className={"dchip" + (s.isToday ? " is-over" : "")}>{s.isToday ? "Today" : `${s.day} · ${s.away}`}</span>
            </div>
            <p className="tshoot-meta">{[s.kind, s.client, s.address || "no address yet"].filter(Boolean).join(" · ")}</p>
            <dl className="tshoot-times">
              <div><dt>Leave home</dt><dd>{s.leave || "—"}</dd></div>
              <div><dt>Start</dt><dd>{s.start || "—"}</dd></div>
              <div><dt>Sunset</dt><dd>{s.sunset || "—"}</dd></div>
            </dl>
            {(!s.leave || s.timeNote || s.sunsetAtHome) && (
              <p className="today-note">
                {!s.start ? (s.timeNote ? `Time note: “${s.timeNote}”. Set a start time to get a leave-home time.` : "No start time yet — set one to get a leave-home time.") : !s.leave ? "Add the address to get the drive and a leave-home time." : ""}
                {s.sunset && s.sunsetAtHome ? " Sunset is for home until the address is found." : ""}
              </p>
            )}
            <div className="tcard-actions">
              {s.directions && <a className="abtn" href={s.directions} target="_blank" rel="noreferrer">Directions ↗</a>}
              <Link className="abtn abtn-ghost" href={`/portal/admin/shoots?open=${s.id}`}>
                Open prep{s.prepTotal ? ` · ${s.prepLeft} of ${s.prepTotal} left` : ""}
              </Link>
              {s.phone && <a className="abtn abtn-ghost" href={`tel:${tel(s.phone)}`}>Call {s.client ? s.client.split(/\s+/)[0] : "client"}</a>}
            </div>
            {shoots.alsoThisWeek > 0 && <p className="today-note">{plural(shoots.alsoThisWeek, "more shoot")} in the next 7 days.</p>}
          </>
        )}
      </Block>

      {/* 2 — leads */}
      <Block kick="Waiting on you" count={leads.ok ? leads.rows.length : 0} href="/portal/admin/inbox" more="Inbox">
        {!leads.ok ? (
          <p className="today-hint">The inbox isn&apos;t set up yet — run <code>supabase/studio.sql</code> once in the Supabase SQL editor.</p>
        ) : leads.rows.length === 0 ? (
          <p className="today-empty">You&apos;re caught up. Nobody is waiting on a reply.</p>
        ) : (
          <ul className="tlist">
            {leads.rows.slice(0, LEADS_SHOWN).map((l) => (
              <li key={l.id}>
                <Link className="trow" href={`/portal/admin/inbox?open=${l.id}`}>
                  <span className="trow-top">
                    <strong>{l.name}</strong>
                    <span className={"dchip" + (l.late ? " is-over" : "")}>{l.flag}</span>
                  </span>
                  {l.summary && <span className="trow-sub">{l.summary}</span>}
                  {l.next && <span className={`trow-next ix-tone-${l.tone}`}>{l.next}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {leads.ok && leads.rows.length > LEADS_SHOWN && (
          <p className="today-note"><Link href="/portal/admin/inbox">{leads.rows.length - LEADS_SHOWN} more in the Inbox →</Link></p>
        )}
        {leads.ok && !leads.followUps && <p className="today-hint">Follow-up reminders show here once you run <code>supabase/studio-2.sql</code> once.</p>}
      </Block>

      {/* 3 — owed */}
      <Block kick="Owed to clients" count={owed.ok ? owed.rows.length : 0} href="/portal/admin/shoots" more="Shoots">
        {!owed.ok ? (
          <p className="today-empty">Shows up once Shoots is set up.</p>
        ) : owed.rows.length === 0 ? (
          <p className="today-empty">Nothing owed. Every finished shoot is delivered.</p>
        ) : (
          <ul className="tlist">
            {owed.rows.slice(0, OWED_SHOWN).map((o) => (
              <li key={o.id}>
                <Link className="trow" href={`/portal/admin/shoots?open=${o.id}`}>
                  <span className="trow-top"><strong>{o.title}</strong></span>
                  <span className="trow-sub">{[o.client, `shot ${o.shot}`].filter(Boolean).join(" · ")}</span>
                  <span className="dchips">
                    {o.parts.map((p) => <span key={p.text} className={"dchip" + (p.overdue ? " is-over" : "")}>{p.text}</span>)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {owed.ok && owed.rows.length > OWED_SHOWN && (
          <p className="today-note"><Link href="/portal/admin/shoots">{owed.rows.length - OWED_SHOWN} more on Shoots →</Link></p>
        )}
        {owed.ok && !owed.ready && owed.rows.length > 0 && (
          <p className="today-hint">Due dates are worked out from each shoot&apos;s date. Run <code>supabase/studio-2.sql</code> once to tick deliveries off.</p>
        )}
      </Block>

      {/* 4 — balances */}
      <Block kick="Balances due" count={balances.ok ? balances.due.length : 0} href="/portal/admin/pay" more="Payments">
        {!balances.ok ? (
          <p className="today-hint">Bookings aren&apos;t set up yet — run <code>supabase/bookings.sql</code> once in the Supabase SQL editor.</p>
        ) : balances.due.length === 0 ? (
          <p className="today-empty">No balances due in the next two weeks.</p>
        ) : (
          <ul className="tlist">
            {balances.due.map((b) => (
              <li key={b.id} className="trow trow-static">
                <span className="trow-top">
                  <strong>{b.name}</strong>
                  <span className={"dchip" + (b.days <= 0 ? " is-over" : "")}>
                    {b.days < 0 ? `${plural(-b.days, "day")} overdue` : b.days === 0 ? "Due today" : `Due in ${plural(b.days, "day")}`}
                  </span>
                </span>
                <span className="trow-sub">{money(b.owed)} left · {b.event}</span>
                <span className="tcard-actions">
                  <CopyChip text={b.link} label="Copy balance link" />
                  {b.phone && <a className="achip" href={`sms:${tel(b.phone)}&body=${encodeURIComponent(`Hi ${(b.name || "").trim().split(/\s+/)[0] || "there"}, it's Brandon. Here's the link for your balance (${money(b.owed)}): ${b.link}`)}`}>Text it</a>}
                </span>
              </li>
            ))}
          </ul>
        )}
        {balances.ok && balances.unclear > 0 && (
          <p className="today-note"><Link href="/portal/admin/pay">{plural(balances.unclear, "open balance")} with no exact date on file →</Link></p>
        )}
      </Block>

      {/* 5 — one line of numbers */}
      <p className="today-numbers">
        {numbers.ok ? (
          <>Last 30 days: <b>{plural(numbers.leads, "lead")}</b> · <b>{numbers.booked} booked</b>. </>
        ) : null}
        <Link href="/portal/admin/stats?range=30">See the stats →</Link>
      </p>
    </div>
  );
}
