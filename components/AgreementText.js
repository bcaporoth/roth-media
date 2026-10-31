// Renders lib/agreements.js text ("## " headings, "- " bullets) as the
// same markup the partner agreement uses, so it reads the same on /sign.
export default function AgreementText({ text }) {
  const blocks = String(text || "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="mx-pa-text">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        const out = [];
        let list = [];
        const flush = () => { if (list.length) { out.push(<ul key={`l${out.length}`}>{list.map((li, j) => <li key={j}>{li}</li>)}</ul>); list = []; } };
        for (const ln of lines) {
          if (ln.startsWith("## ")) { flush(); out.push(<h4 key={`h${out.length}`}>{ln.slice(3)}</h4>); }
          else if (ln.startsWith("- ")) list.push(ln.slice(2));
          else { flush(); out.push(<p key={`p${out.length}`}>{ln}</p>); }
        }
        flush();
        return <div key={i}>{out}</div>;
      })}
    </div>
  );
}
