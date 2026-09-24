// views/info.js – Orientierung: Orte, Anreise, Rahmenprogramm, Podien, Poster
import { h, dateLabel, timeRange } from "../util.js";

export function renderInfo(model) {
  const c = model.content;
  const wrap = h("div", { class: "view view-info" });

  wrap.append(h("header", { class: "hero compact" },
    h("h1", { text: "Orientierung" }),
    h("p", { class: "meta", text: `${c.conference.place} · ${c.conference.start.slice(8)}.${c.conference.start.slice(5, 7)}. – ${c.conference.end.slice(8)}.${c.conference.end.slice(5, 7)}.2026` })));

  // Orte
  wrap.append(h("section", { class: "card" },
    h("h2", { text: "Wohin gehe ich? – Die Orte" }),
    h("p", { class: "meta", text: "Raumnummern sind im gesamten Programm klickbar und öffnen die Karte mit Gebäude-Marker; im Detailfenster zeigt der Etagen-Streifen, welche Tagungsräume sich dieselbe Etage teilen. Gebäude: Vorträge in der Carl-Zeiß-Straße 3 (HS 6–8 und SR 113–127 im 1. OG, SR 206–226 im 2. OG), MMZ 220 im Multimediazentrum (Ernst-Abbe-Platz 8, 2. OG), Aula im Universitätshauptgebäude (Fürstengraben 1)." }),
    h("div", { class: "venue-grid" },
      Object.entries(c.venues).map(([key, v]) => h("div", { class: "venue-card" },
        h("h3", { text: v.name }),
        v.note ? h("p", { class: "meta", text: v.note }) : null,
        v.url_maps ? h("a", { class: "btn small ghost", href: v.url_maps, target: "_blank", rel: "noopener", text: "Karte öffnen" }) : null))),
    h("div", { class: "chip-row" },
      c.links.city_map_pdf ? h("a", { class: "btn", href: c.links.city_map_pdf, target: "_blank", rel: "noopener", text: "Stadtplan (PDF)" }) : null,
      c.links.lageplan_pdf ? h("a", { class: "btn", href: c.links.lageplan_pdf, target: "_blank", rel: "noopener", text: "Lageplan (PDF)" }) : h("span", { class: "pill", text: "Lageplan folgt" }),
      h("a", { class: "btn ghost", href: c.links.downloads_page, target: "_blank", rel: "noopener", text: "Downloads der Uni" }))));

  // Podien
  wrap.append(h("section", { class: "card" },
    h("h2", { text: "Podiumsdiskussionen" }),
    c.podiums.map((p) => h("article", { class: "podium" },
      h("h3", { text: p.title }),
      h("p", { class: "meta", text: `${dateLabel(p.day)} · ${timeRange(p.start, p.end)} · ${p.room || ""}` }),
      h("p", { class: "body", text: p.body }),
      p.people ? h("p", { class: "meta", text: p.people }) : null))));

  // Sonderformate
  wrap.append(h("section", { class: "card" },
    h("h2", { text: "Sonderformate" }),
    c.special.map((s) => h("article", { class: "podium" },
      h("h3", { text: s.title }),
      h("p", { class: "meta", text: `${dateLabel(s.day)} · ${timeRange(s.start, s.end)} · ${s.room || ""}` }),
      s.people ? h("p", { class: "meta", text: s.people }) : null))));

  // Rahmenprogramm
  wrap.append(h("section", { class: "card" },
    h("h2", { text: "Kultur- und Rahmenprogramm" }),
    h("ul", { class: "mini-list" },
      c.accompanying.map((a) => h("li", {},
        h("strong", { text: `${a.day ? dateLabel(a.day) : ""}${a.start ? ` · ${timeRange(a.start, a.end)}` : ""}` }),
        ` – ${a.title}`,
        a.note ? h("span", { class: "meta", text: ` (${a.note})` }) : null)))));

  // Poster
  wrap.append(h("section", { class: "card" },
    h("h2", { text: `Poster (${c.posters.length})` }),
    h("p", { class: "meta", text: `${c.poster_times.view} · Kurzvorstellung: ${c.poster_times.short_intro} · Präsentation: ${c.poster_times.presentation}` }),
    h("ul", { class: "mini-list" },
      c.posters.map((p) => h("li", {},
        h("strong", { text: p.authors.join(", ") }), `: ${p.title}`)))));

  // Grußworte + Kontakt
  wrap.append(h("section", { class: "card" },
    h("h2", { text: "Eröffnung & Grußworte" }),
    h("p", { text: "Dr. Andreas Umland (Kyjiw/Stockholm) eröffnet den Kongress mit der Festrede „Panrussismus, Eurasismus und Imperialismus als Schlüsselkonzepte zur Erklärung des russischen Überfalls auf die Ukraine“." }),
    h("ul", { class: "mini-list" }, c.grussworte.map((g) => h("li", { text: g })))),
    h("section", { class: "card" },
      h("h2", { text: "Kontakt & Rechtliches" }),
      h("p", {}, h("a", { href: `mailto:${c.conference.contact}`, text: c.conference.contact })),
      h("p", { class: "meta", text: "Veranstalter: Institut für Slawistik und Kaukasusstudien, FSU Jena. Impressum und Datenschutz auf der Veranstaltungsseite der Universität." }),
      h("p", {}, h("a", { href: c.links.event_page, target: "_blank", rel: "noopener", text: "Offizielle Veranstaltungsseite ↗" }))));

  // Über die App / Urheber / Methode
  const talks = model.sessions.filter((s) => s.type === "talk");
  const tagged = talks.filter((s) => (s._tags || []).length).length;
  const llmCount = talks.filter((s) => s._tagSource === "llm").length;
  const lexCount = tagged - llmCount;
  const meta = model.llmTagsMeta;
  const stand = meta?.generated
    ? meta.generated.slice(0, 10).split("-").reverse().join(".")
    : null;
  const methodText = meta
    ? `Die Themen-Ansicht gruppiert ${talks.length} Vorträge automatisch nach ` +
      `27 Themenfeldern. Die Zuordnung übernimmt ein Sprachmodell (${meta.model}, ` +
      `Stand ${stand}), das Titel und Sprechernamen im Batch klassifiziert; ` +
      `${llmCount} Vorträge sind so getaggt, ${lexCount} ergänzend per Fallback aus ` +
      "einem kuratierten Keyword-Lexikon (Teilstring-Matching, vollständig im Browser). " +
      "Ein Vortrag kann in mehreren Clustern erscheinen, manche passen in keines. " +
      "Grenzen: Die automatische Zuordnung kann danebenliegen und ist bewusst grob – " +
      "sie ersetzt keine inhaltliche Sichtung. " +
      "Sprach-Hinweise (RU/UK/PL/EN/CS-Badge an Karte und Titel) beruhen auf einer " +
      "Funktionswort-Heuristik (Deutsch/Englisch, Russisch/Ukrainisch über kyrillische " +
      "Spezialzeichen, Tschechisch/Polnisch über Diakritika) – Hinweise, keine " +
      "Klassifikation."
    : `Die Themen-Ansicht gruppiert ${talks.length} Vorträge automatisch nach ` +
      "27 Themenfeldern aus einem kuratierten Lexikon (Keyword-Matching über " +
      "Titel und Sprechernamen, ohne maschinelles Lernen, vollständig im Browser). " +
      `${tagged} Vorträge lassen sich so zuordnen (${Math.round(tagged / talks.length * 100)} %); ` +
      "ein Vortrag kann in mehreren Clustern erscheinen, manche passen in keines. " +
      "Die Sprachverteilung pro Cluster beruht auf einer Funktionswort-Heuristik " +
      "(Deutsch/Englisch, Russisch/Ukrainisch über kyrillische Spezialzeichen, " +
      "Tschechisch/Polnisch über Diakritika) – Hinweise, keine Klassifikation.";
  wrap.append(h("section", { class: "card" },
    h("h2", { text: "Themen-Kompass: Methode & Grenzen" }),
    h("p", { text: methodText }),
    h("p", { class: "meta", text: "App (Programm-App und Themen-Kompass): Achim Rabus · Lizenz: MIT" })));

  return wrap;
}
