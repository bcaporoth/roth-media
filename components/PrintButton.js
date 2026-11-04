"use client";
// One big button on the print pages: opens the system print dialog (phones too — "Save as PDF" / AirPrint from there).
export default function PrintButton({ label = "🖨 Print / Save as PDF" }) {
  return <button type="button" className="abtn sprint-printbtn" onClick={() => window.print()}>{label}</button>;
}
