// views/speakers.js – Sprecher-Index A–Z (Sprecher + Chairs), Klick → Drawer
import { h, dateLabel, timeRange } from "../util.js";

// Eintrag: { name, sortKey, talks: [session…], chairOf: [session…] }
export function buildSpeakerIndex(model) {
  const map = new Map();
  const add = (name, role, session) => {
    const key = name.trim();
    if (!key) return;
    if (!map.has(key)) map.set(key, { name: key, sortKey: key.toLowerCase(), talks: [], chairOf: [] });
    const entry = map.get(key);
    if (role === "chair") entry.chairOf.push(session);
    else entry.talks.push(session);
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
      h("p", { class: "meta", text: `${people.length} Personen – Sprecher:innen und Chairs. Klick auf einen Namen zeigt die Vorträge im Detail.` })));

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
        h("span", { class: "speaker-name", text: p.name }),
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
