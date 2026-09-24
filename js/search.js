// search.js – Normalisierung, Filterung, Hervorhebung (DOM-frei testbar)

export function normalize(s) {
  let out = (s || "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD");
  // Diakritika nur bei lateinischen Basiszeichen entfernen (Kyrillisch behalten)
  let res = "";
  for (const ch of out) {
    if (/[\u0300-\u036f]/.test(ch)) {
      const last = res[res.length - 1];
      if (last && /[\u0400-\u04ff]/.test(last)) res += ch; // kyrillische Basis: behalten
      continue;
    }
    res += ch;
  }
  return res
    .replace(/[\u2010-\u2015\u00ad]/g, "-") // diverse Bindestriche
    .replace(/\s+/g, " ")
    .trim();
}

export function makeSearchText(session, panelTitle) {
  const room = session.room || "";
  const venue = session.venue || "";
  return normalize(
    [session.title, (session.speakers || []).join(" "), panelTitle, session.chair,
     room, venue, session.sek_code, session.track].filter(Boolean).join(" "));
}

export function matchesQuery(searchText, q) {
  const nq = normalize(q);
  if (!nq) return true;
  // alle Begriffe müssen vorkommen (UND-Verknüpfung)
  return nq.split(" ").every((term) => searchText.includes(term));
}

export function filterSessions(sessions, state) {
  return sessions.filter((s) => {
    if (state.q && !matchesQuery(s._search || normalize(s.title), state.q)) return false;
    if (state.day && s.day !== state.day) return false;
    if (state.room && s.room !== state.room) return false;
    if (state.slot && s.start !== state.slot) return false;
    if (state.panel && s.panel_id !== state.panel) return false;
    if (state.type && s.type !== state.type) return false;
    if (state.tracks && state.tracks.length) {
      if (!s.track) return false;
      const parts = s.track.split("+");
      if (!state.tracks.some((t) => parts.includes(t))) return false;
    }
    if (state.formats && state.formats.length) {
      const f = formatOf(s);
      if (!state.formats.includes(f)) return false;
    }
    return true;
  });
}

export function formatOf(s) {
  if (s.type === "break") return "pause";
  if (s.type === "talk") {
    return (s.panel_code ? "sektion" : "vortrag");
  }
  return s.type || "sonstiges";
}

export function highlight(text, q) {
  const nq = normalize(q);
  if (!nq) return null;
  const terms = nq.split(" ").filter((t) => t.length > 2);
  if (!terms.length) return null;
  // Hervorhebung im Originaltext: Begriffe case-insensitive/diacritics-unsensitiv suchen
  const fold = (s) => normalize(s);
  const lowered = text.toLowerCase();
  const normMap = []; // Zuordnung Index im Original → Index im normalisierten String ist aufwendig;
  // pragmatisch: Suche nach Wortanfängen im Original
  const marks = [];
  for (const term of terms) {
    let idx = 0;
    const t = term;
    while (t && idx < lowered.length) {
      const found = lowered.indexOf(t[0], idx);
      if (found === -1) break;
      // versuche direkten Treffer
      const direct = lowered.indexOf(t, idx);
      if (direct !== -1) {
        marks.push([direct, direct + t.length]);
        idx = direct + t.length;
        continue;
      }
      idx = found + 1;
    }
  }
  if (!marks.length) return null;
  // überlappende Markierungen mergen
  marks.sort((a, b) => a[0] - b[0]);
  const merged = [marks[0]];
  for (const [a, b] of marks.slice(1)) {
    const last = merged[merged.length - 1];
    if (a <= last[1]) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  let out = "";
  let pos = 0;
  for (const [a, b] of merged) {
    out += escapeH(text.slice(pos, a)) + "<mark>" + escapeH(text.slice(a, b)) + "</mark>";
    pos = b;
  }
  out += escapeH(text.slice(pos));
  return out;
}

function escapeH(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
