// views/speakers.js – Sprecher-Index A–Z (Sprecher + Chairs), Klick → Drawer
// Indexformat „Nachname, Vorname" (wissenschaftliche Konvention); Karten und
// Drawer zeigen weiterhin „Vorname Nachname".
import { h } from "../util.js";

// „Vorname Nachname" → „Nachname, Vorname"; Klammern-Zusatz (Geburtsname o.ä.)
// bleibt erhalten: „Liudmyla Mobius (Pidkuimukha)" → „Mobius, Liudmyla (Pidkuimukha)"
export function nameParts(raw) {
  const extra = raw.match(/\(([^)]*)\)/)?.[1];
  const name = raw.replace(/\s*\([^)]*\)\s*/, "").trim();
  const words = name.split(/\s+/);
  const last = words.pop() || name;
  const base = words.length ? `${last}, ${words.join(" ")}` : last;
  return { display: extra ? `${base} (${extra})` : base, sortKey: base.toLowerCase() };
}

// Ein Speaker-Feld kann mehrere Personen enthalten („Arkady Kruglov, Tim-Robin
// Rösler-Bartsch“ aus dem PDF). Heuristik: nur splitten, wenn jeder Teil mit
// Großbuchstaben beginnt und ≥ 2 Wörter hat („Nachname, Vorname“-Felder gibt
// es im Datensatz nicht).
export function splitPeople(raw) {
  const parts = String(raw).split(/\s*,\s*/);
  if (parts.length < 2) return [String(raw)];
  const allNames = parts.every(
    (p) => p.trim().split(/\s+/).length >= 2 && /^[\p{Lu}]/u.test(p.trim()));
  return allNames ? parts : [String(raw)];
}

// Eintrag: { name, sortKey, talks: [session…], chairOf: [session…] }
export function buildSpeakerIndex(model) {
  const map = new Map();
  const add = (raw, role, session) => {
    for (const one of splitPeople(raw)) {
      const key = one.trim();
      if (!key) continue;
      if (!map.has(key)) map.set(key, { ...nameParts(key), talks: [], chairOf: [] });
      const entry = map.get(key);
      if (role === "chair") entry.chairOf.push(session);
      else entry.talks.push(session);
    }
  };
  for (const s of model.sessions) {
    if (s.type !== "talk") continue;
    for (const sp of s.speakers || []) add(sp, "speaker", s);
    if (s.chair) add(s.chair, "chair", s);
  }
  return [...map.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey, "de"));
}

export function renderSpeakers(model, ctx) {
  const people = buildSpeakerIndex(model);
  const wrap = h("div", { class: "view view-speakers" },
    h("header", { class: "hero compact" },
      h("h1", { text: "Sprecher:innen A–Z" }),
      h("p", { class: "meta", text: `${people.length} Personen, sortiert nach Nachname – Sprecher:innen und Chairs. Klick auf einen Namen zeigt die Vorträge im Detail.` })));

  const search = h("input", {
    type: "search", class: "search-input", placeholder: "Name suchen …",
    "aria-label": "Personensuche",
  });
  const list = h("div", { class: "speaker-list" });
  const renderList = () => {
    const q = search.value.trim().toLowerCase();
    list.textContent = "";
    const visible = people.filter((p) => !q || p.sortKey.includes(q));
    if (!visible.length) {
      list.append(h("p", { class: "empty", text: "Keine Person gefunden." }));
      return;
    }
    let lastLetter = "";
    for (const p of visible) {
      const letter = p.sortKey[0].toUpperCase();
      if (letter !== lastLetter) {
        lastLetter = letter;
        list.append(h("div", { class: "speaker-letter", text: letter }));
      }
      const items = [
        ...p.talks.map((s) => ({ s, role: "" })),
        ...p.chairOf.map((s) => ({ s, role: "Chair" })),
      ].sort((a, b) => (a.s.day + a.s.start).localeCompare(b.s.day + b.s.start));
      const btn = h("button", { class: "speaker-row", onclick: () => ctx.openSession(items[0].s.id) },
        h("span", { class: "speaker-name", text: p.display }),
        h("span", { class: "speaker-count dim" },
          [p.talks.length ? `${p.talks.length} Vortrag${p.talks.length === 1 ? "" : "e"}` : "",
           p.chairOf.length ? `${p.chairOf.length}× Chair` : ""].filter(Boolean).join(" · ")));
      btn.addEventListener("keydown", (e) => { if (e.key === "Enter") ctx.openSession(items[0].s.id); });
      list.append(btn);
    }
  };
  search.addEventListener("input", renderList);
  renderList();

  wrap.append(search, list);
  return wrap;
}
