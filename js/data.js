// data.js – Laden: Live-Daten von der Programm-App (GitHub Pages, CORS offen),
// Fallback auf lokalen Snapshot. Danach Mining-Pass über die Sessions.
import { tagsFor, detectLanguage } from "./mining.js";

const LIVE = "https://achimrabus.github.io/slavistiktag-2026-programm-app/data/program.json";
const FALLBACK = "data/program.json";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} für ${url}`);
  return res.json();
}

export async function loadProgram() {
  let program, source;
  try {
    program = await fetchJson(LIVE);
    source = "live";
  } catch (e) {
    program = await fetchJson(FALLBACK);
    source = "snapshot";
  }
  for (const s of program.sessions || []) {
    s._tags = tagsFor(s);
    s._lang = detectLanguage(s.title);
  }
  return { program, source };
}
