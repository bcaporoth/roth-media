// One-page prep sheet for a shoot — print it or save as PDF from the
// browser. Pure render: the page that wraps it does the admin check and
// the data fetch. With no shoot it prints the blank guide for a type.

import { timing, fmt12 } from "../lib/sun";
import { GEAR_BASE, GUIDES, groupOf, GROUP_LABEL } from "../lib/shoot-guides";
import { OWNER_NAME, PHONE } from "../lib/site";

import { SHOOT_KIND_LABEL as KIND_LABEL } from "../lib/studio-labels";

const longDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Date TBD");

export default function ShootPrepSheet({ shoot = null, kind = "wedding" }) {
  const k = shoot?.kind || kind;
  const guide = GUIDES[k] || GUIDES.other;
  const items = shoot
    ? (shoot.checklist || []).map((c) => ({ ...c, group: groupOf(c) }))
    : [...GEAR_BASE.map((text) => ({ text, done: false, group: "gear" })), ...guide.gear.map((text) => ({ text, done: false, group: "gear" })), ...guide.shots.map((text) => ({ text, done: false, group: "shots" }))];
  const gear = items.filter((c) => c.group === "gear");
  const shots = items.filter((c) => c.group === "shots");
  const poses = items.filter((c) => c.group === "poses");
  const flowAll = items.filter((c) => c.group === "flow");
  const flow = [...flowAll.filter((c) => c.time).sort((a, b) => a.time.localeCompare(b.time)), ...flowAll.filter((c) => !c.time)];
  const t = timing(shoot, { blankWithoutDate: true });
  const title = shoot ? shoot.title : `${guide.label} — prep sheet`;

  return (
    <article className="sprint">
      <header className="sprint-head">
        <div>
          <span className="sprint-kick">Roth Media · {k && k !== "other" && KIND_LABEL[k] ? `${KIND_LABEL[k]} · ` : ""}prep sheet</span>
          <h1>{title}</h1>
          <p className="sprint-when">{shoot ? longDate(shoot.date) : "Date: ______________________"}</p>
        </div>
        <div className="sprint-owner"><strong>{OWNER_NAME}</strong><span>{PHONE}</span></div>
      </header>

      <section className="sprint-facts">
        <Fact label="Start" value={t.start ? fmt12(t.start) : shoot?.time_note || "________"} note={shoot?.time_note && t.start && !shoot.start_time ? `from “${shoot.time_note}”` : ""} />
        <Fact label="Leave home" value={t.leave ? fmt12(t.leave) : "________"} note={shoot?.drive_min ? `${shoot.drive_min} min drive + 20 to set up` : ""} />
        <Fact label="Sunset" value={t.sunset ? fmt12(t.sunset) : "________"} note={t.golden ? `golden hour from ${fmt12(t.golden)}` : ""} />
        <Fact label="Distance" value={shoot?.miles != null ? `${shoot.miles} mi` : "________"} note={shoot?.place_label ? shoot.place_label.split(",").slice(0, 3).join(",") : ""} />
      </section>

      <section className="sprint-who">
        <div><span className="sprint-label">Where</span><strong>{shoot?.address || "______________________________________"}</strong></div>
        <div><span className="sprint-label">Client</span><strong>{shoot?.client_name || "______________________"}</strong>{shoot?.client_phone && <em>{shoot.client_phone}</em>}</div>
      </section>

      {flow.length > 0 && <List title={GROUP_LABEL.flow} items={flow} timed />}

      <div className="sprint-cols">
        <List title="Shots to get" items={shots} />
        {poses.length > 0 ? <List title={GROUP_LABEL.poses} items={poses} /> : <List title="Gear to pack" items={gear} />}
      </div>
      {poses.length > 0 && <List title="Gear to pack" items={gear} wide />}

      <section className="sprint-notes">
        <span className="sprint-label">Notes</span>
        {shoot?.notes ? <p>{shoot.notes}</p> : <div className="sprint-lines"><span /><span /><span /><span /></div>}
      </section>
    </article>
  );
}

function Fact({ label, value, note }) {
  return <div><span className="sprint-label">{label}</span><strong>{value}</strong>{note && <em>{note}</em>}</div>;
}

function List({ title, items, timed = false, wide = false }) {
  return (
    <section className={"sprint-list" + (timed ? " is-timed" : "") + (wide ? " is-wide" : "")}>
      <h2>{title}</h2>
      <ul>
        {items.map((c, i) => <li key={i} className={c.done ? "is-done" : ""}><span className="sprint-box" aria-hidden="true">{c.done ? "✓" : ""}</span>{timed && <span className="sprint-time">{c.time ? fmt12(c.time) : "—"}</span>}{c.text}</li>)}
        {items.length === 0 && <li className="is-empty">—</li>}
      </ul>
    </section>
  );
}
