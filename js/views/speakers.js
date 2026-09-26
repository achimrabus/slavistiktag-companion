// views/speakers.js – Sprecher-Index A–Z (Sprecher + Chairs), Klick → Person
// Indexformat „Nachname, Vorname" (wissenschaftliche Konvention); Karten und
// Drawer zeigen weiterhin „Vorname Nachname".
import { h, dateLabel } from "../util.js";
import { sessionCard } from "./program.js";

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
      if (!map.has(key)) map.set(key, { raw: key, ...nameParts(key), talks: [], chairOf: [] });
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
      const href = `#/sprecher/${encodeURIComponent(p.raw)}`;
      const btn = h("a", { class: "speaker-row", href },
        h("span", { class: "speaker-name", text: p.display }),
        h("span", { class: "speaker-count dim" },
          [p.talks.length ? `${p.talks.length} Vortrag${p.talks.length === 1 ? "" : "e"}` : "",
           p.chairOf.length ? `${p.chairOf.length}× Chair` : ""].filter(Boolean).join(" · ")));
      list.append(btn);
    }
  };
  search.addEventListener("input", renderList);
  renderList();

  wrap.append(search, list);
  return wrap;
}

// Personen-Detailansicht: alle Vorträge + Chair-Rollen einer Person.
// Route: #/sprecher/<encodeURIComponent(raw)>
export function renderPerson(model, ctx, rawName) {
  const people = buildSpeakerIndex(model);
  const p = people.find((x) => x.raw === rawName);
  const wrap = h("div", { class: "view view-person" });

  if (!p) {
    wrap.append(
      h("header", { class: "hero compact" },
        h("h1", { text: "Person nicht gefunden" }),
        h("p", { class: "meta", text: `„${rawName}“ ist nicht im Sprecher:innen-Index. Eventuell hat sich das Programm geändert.` })),
      h("a", { class: "btn ghost", href: "#/sprecher", text: "← Zurück zur Übersicht" }));
    return wrap;
  }

  const items = [
    ...p.talks.map((s) => ({ s, role: "" })),
    ...p.chairOf.map((s) => ({ s, role: "Chair" })),
  ].sort((a, b) => (a.s.day + a.s.start).localeCompare(b.s.day + b.s.start));

  const affis = new Set();
  for (const s of p.talks) {
    const i = (s.speakers || []).indexOf(p.raw);
    if (i >= 0 && s.affiliations?.[i]) affis.add(s.affiliations[i]);
  }

  const hero = h("header", { class: "hero compact" },
    h("p", { class: "kicker" }, h("a", { href: "#/sprecher", text: "← Sprecher:innen" })),
    h("h1", { text: p.display }),
    h("p", { class: "meta", text:
      [`${p.talks.length} Vortrag${p.talks.length === 1 ? "" : "e"}`,
       p.chairOf.length ? `${p.chairOf.length}× Chair` : "",
       [...affis].join(" · ")].filter(Boolean).join(" · ") }));

  wrap.append(hero);

  let lastDay = "";
  for (const { s, role } of items) {
    if (s.day !== lastDay) {
      lastDay = s.day;
      wrap.append(h("div", { class: "day-divider" },
        h("span", { class: "day-name", text: dateLabel(s.day) })));
    }
    if (role === "Chair") {
      wrap.append(h("div", { class: "slot-block" },
        h("div", { class: "slot-head" },
          h("span", { text: `${s.start}–${s.end}` }),
          h("span", { class: "pill", text: "Chair" })),
        h("div", { class: "card session-card chair-entry", onclick: () => ctx.openSession(s.id), tabindex: "0", role: "button" },
          h("div", { class: "card-title", text: s.panel_title || s.title }),
          s.room ? h("span", { class: "meta", text: s.room }) : null)));
    } else {
      wrap.append(sessionCard(model, ctx, s, {}));
    }
  }
  return wrap;
}
