import { PROJECT_STATUS_LABEL } from "../lib/projects";
import { SHOOT_KIND_LABEL } from "../lib/studio-labels";

export default function CrewHome({ projects }) {
  if (!projects.length) return null;
  return (
    <ul className="shoot-list crew-projects">
      {projects.map((p) => (
        <li key={p.id} className="shoot">
          <a className="shoot-row shoot-row-link" href={`/portal/crew/projects/${p.id}`}>
            <span className="shoot-main"><strong>{p.title}</strong><em>{SHOOT_KIND_LABEL[p.kind] || p.kind}{p.logline ? ` · ${p.logline}` : ""}</em></span>
            <span className="shoot-far"><strong>{p.filmed}/{p.days} days</strong><em>{p.interviewed}/{p.people} people done</em></span>
            <span className={`itag stage-${p.status}`}>{PROJECT_STATUS_LABEL[p.status]}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
