import { readFile } from "node:fs/promises";
import path from "node:path";
import { EMAIL, PHONE, OWNER_NAME, SOCIAL } from "../../../lib/site";

export const dynamic = "force-static";

// "Save my contact" — a vCard phones open straight into Contacts, photo included.
export async function GET() {
  let photo = "";
  try {
    const buf = await readFile(path.join(process.cwd(), "public", "card-avatar.jpg"));
    photo = `PHOTO;ENCODING=b;TYPE=JPEG:${buf.toString("base64")}`;
  } catch {}

  const [first, ...rest] = OWNER_NAME.split(" ");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${rest.join(" ")};${first};;;`,
    `FN:${OWNER_NAME}`,
    "ORG:Roth Media",
    "TITLE:Videographer & Photographer",
    `TEL;TYPE=CELL,VOICE:+1${PHONE.replace(/\D/g, "")}`,
    `EMAIL;TYPE=INTERNET,WORK:${EMAIL}`,
    "URL:https://rothmediaco.com",
    ...SOCIAL.map((s) => `X-SOCIALPROFILE;TYPE=${s.id}:${s.url}`),
    "ADR;TYPE=WORK:;;;Waverly;NY;;USA",
    "NOTE:Video & photo for weddings, families, and local businesses — Twin Tiers NY/PA. Instant quotes at rothmediaco.com/quote",
    photo,
    "END:VCARD",
  ].filter(Boolean);

  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="Brandon-Roth-Roth-Media.vcf"',
    },
  });
}
