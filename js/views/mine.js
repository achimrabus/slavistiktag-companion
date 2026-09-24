// views/mine.js – Mein Programm (Favoriten) mit ICS-Export
import { h, dateLabel, timeRange } from "../util.js";
import { favs } from "../favorites.js";
import { icsFor, downloadIcs } from "../ics.js";

export function renderMine(model, ctx) {
  const ids = favs.all();
  const byDay = {};
  for (const id of ids) {
    const s = model.sessions.find((x) => x.id === id);
    if (s) (byDay[s.day] ||= []).push(s);
  }
  const days = Object.keys(byDay).sort();

  const wrap = h("div", { class: "view view-mine" },
    h("header", { class: "hero compact" },
      h("h1", { text: "Mein Programm" }),
      h("p", { class: "meta", text: ids.length ? `${ids.length} gemerkte Veranstaltungen` : "Noch nichts gemerkt – setze ★ in der Programmansicht." })));

  if (!ids.length) {
    wrap.append(h("div", { class: "card" },
      h("p", { text: "Tippe in der Programmansicht auf ☆, um Vorträge zu merken. Sie erscheinen hier und lassen sich als Kalenderdatei exportieren." }),
      h("a", { class: "btn", href: "#/programm", text: "Zum Programm" })));
    return wrap;
  }

  wrap.append(h("div", { class: "btn-row" },
    h("button", {
      class: "btn", text: "⤓ Alle als Kalender (.ics)",
      onclick: () => {
        const events = ids
          .map((id) => model.sessions.find((x) => x.id === id))
          .filter(Boolean)
          .map((s) => ({ day: s.day, start: s.start, end: s.end, title: s.title, room: s.room || "" }));
        downloadIcs("mein-slavistiktag.ics", icsFor(events));
      },
    })));

  for (const day of days) {
    const list = byDay[day].sort((a, b) => (a.start || "").localeCompare(b.start || ""));
    wrap.append(h("section", { class: "card" },
      h("h2", { text: dateLabel(day) }),
      h("div", { class: "list-view" },
        list.map((s) => h("article", {
          class: `card session-card track-${(s.discipline || "x").toLowerCase()} is-fav`,
          onclick: () => ctx.openSession(s.id), tabindex: "0", role: "button",
        },
          h("div", { class: "card-top" },
            h("span", { class: "time", text: timeRange(s.start, s.end) }),
            h("button", {
              class: "fav active", "aria-label": "Entfernen", text: "★",
              onclick: (e) => { e.stopPropagation(); favs.toggle(s.id); ctx.render(); },
            })),
          h("div", { class: "card-title", text: s.title }),
          s.speakers?.length ? h("div", { class: "card-speakers", text: s.speakers.join(", ") }) : null,
          h("div", { class: "card-panel" },
            h("span", { class: "pill room", text: s.room || "" }), " ",
            s.panel_title || ""))))));
  }
  return wrap;
}
