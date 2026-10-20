// A shoot day on paper: the running order, then every script in full —
// hook, what to have ready, the steps as a Say / Do / Camera table, B-roll,
// the closing line. Same sheet for Brandon (Studio) and the owner (portal).
// Pure markup; the print routes load the day and hand it over.

import { KIND_LABEL, STATUS_LABEL, NEEDS_LABEL, cleanBody, runningOrder, totalMinutes, fmt12, fmtMins } from "../lib/scripts";

const dateLong = (d) => (d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Date to be set");

export default function DayPrintSheet({ day }) {
  const order = runningOrder(day, day.scripts || []);
  const total = totalMinutes(day.scripts || []);
  return (
    <article className="sprint dprint">
      <header className="sprint-head">
        <div>
          <span className="sprint-kick">Shoot day · {day.client?.name || ""}</span>
          <h1>{day.title}</h1>
          <p className="sprint-when">{dateLong(day.date)}{day.start_time ? ` · ${fmt12(day.start_time)}` : ""}{day.location ? ` · ${day.location}` : ""}</p>
        </div>
        <div className="sprint-owner">
          <span className="sprint-label">Filming</span><strong>{fmtMins(total)}</strong>
          <span className="sprint-label">Scripts</span><strong>{order.length}</strong>
        </div>
      </header>

      {day.notes && <section className="sprint-notes"><h2 className="dprint-h2">Day notes</h2><p>{day.notes}</p></section>}

      <section>
        <h2 className="dprint-h2">Running order</h2>
        <ol className="dprint-order">
          {order.map((s, i) => (
            <li key={s.id}><span className="dprint-at">{s.at ? fmt12(s.at) : `#${i + 1}`}</span><strong>{s.title || `Untitled ${KIND_LABEL[s.kind]}`}</strong><em>{KIND_LABEL[s.kind]} · {fmtMins(s.minutes || 0)} · {STATUS_LABEL[s.status]}</em></li>
          ))}
        </ol>
      </section>

      {order.map((s, i) => {
        const b = cleanBody(s.body);
        return (
          <section key={s.id} className="dprint-script">
            <h2 className="dprint-title"><span className="dprint-num">{i + 1}</span>{s.title || `Untitled ${KIND_LABEL[s.kind]}`}<em>{s.at ? fmt12(s.at) : ""} · {KIND_LABEL[s.kind]}{b.length ? ` · ${b.length} finished` : ""}</em></h2>
            <div className="dprint-facts">
              {b.goal && <p><span>For</span>{b.goal}</p>}
              {b.hook && <p className="dprint-hook"><span>Hook</span>{b.hook}</p>}
              {b.on_camera && <p><span>On camera</span>{b.on_camera}</p>}
              {b.where && <p><span>Where</span>{b.where}</p>}
            </div>
            {b.needs.length > 0 && <div className="dprint-needs"><span className="sprint-label">{NEEDS_LABEL[s.kind] || "Have ready"}</span><ul>{b.needs.map((n, j) => <li key={j}><span className="sprint-box" />{n}</li>)}</ul></div>}
            {b.steps.length > 0 && (
              <table className="dprint-steps">
                <thead><tr><th>#</th><th>Say</th><th>Do</th><th>Camera shows</th><th>s</th></tr></thead>
                <tbody>{b.steps.map((st, j) => <tr key={j} className={st.done ? "is-done" : ""}><td>{j + 1}</td><td>{st.say}</td><td>{st.do}</td><td>{st.shot}</td><td>{st.secs || ""}</td></tr>)}</tbody>
              </table>
            )}
            {b.broll.length > 0 && <p className="dprint-line"><span>B-roll</span>{b.broll.join(" · ")}</p>}
            {b.cta && <p className="dprint-line"><span>Close with</span>{b.cta}</p>}
            {b.caption && <p className="dprint-line"><span>Caption</span>{b.caption}</p>}
            {b.notes && <p className="dprint-line"><span>Notes</span>{b.notes}</p>}
          </section>
        );
      })}
    </article>
  );
}
