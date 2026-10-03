// Share links from albums that were merged into another one keep working:
// old share_token → the surviving album's share_token. Added 2026-10-03 when
// the duplicate Brooke & Gage / Sam & Mia albums were folded into one each.
export const SHARE_ALIASES = {
  "bc27adee-0a45-435c-a65c-e74b30da775a": "6efafacf-ffe3-4f8c-b110-400281204fcf", // Brooke & Gage Wedding (brooke's copy) → Brooke and Gage Wedding Album
  "69047fcd-3cdd-4df6-8a8c-4c0897054478": "6efafacf-ffe3-4f8c-b110-400281204fcf", // Brooke and Gage Wedding Sneak Peek → full album
  "84570780-36e4-4be1-be1e-bf624588af3b": "bde0d491-c4b0-428e-bfe1-f229564c1c1d", // Mia and Sam Sneak Peek → Sam & Mia Sneak Wedding Day
};
export const resolveShareToken = (t) => SHARE_ALIASES[t] || t;
