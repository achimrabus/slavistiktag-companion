// app.js – Router, State, Boot (Companion)
import { h } from "./util.js";
import { loadProgram } from "./data.js";
import { clusterSessions, tfidf, tokenize } from "./mining.js";
import { renderTopics, renderCluster } from "./views/topics.js";

const app = document.getElementById("app");
const nav = document.getElementById("main-nav");
const themeBtn = document.getElementById("theme-toggle");

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeBtn.textContent = theme === "light" ? "🌙" : "☀";
  try { localStorage.setItem("slavtag26.theme", theme); } catch { /* ignore */ }
}
themeBtn.addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(cur === "light" ? "dark" : "light");
});
applyTheme(document.documentElement.getAttribute("data-theme") || "dark");

const ctx = {
  model: null,
  render,
};

function parseHash() {
  const raw = location.hash.replace(/^#/, "") || "/themen";
  const [path] = raw.split("?");
  return { route: path.replace(/\/+$/, "") || "/themen" };
}

function renderNav() {
  const { route } = parseHash();
  const link = (href, label) => {
    const active = ("#" + parseHash().route) === href || (href === "#/themen" && route.startsWith("/themen"));
    return h("a", { class: `nav-link ${active ? "active" : ""}`, href }, label);
  };
  nav.textContent = "";
  nav.append(
    link("#/themen", "Themen-Kompass"),
    link("#/info", "Über"));
}

function buildModel(program) {
  const sessions = program.sessions.filter((s) => s.type === "talk");
  const clusters = clusterSessions(sessions);
  // Charakteristische Begriffe je Cluster (TF-IDF über Cluster-Titel)
  const clusterTerms = {};
  for (const [tagId, items] of clusters) {
    const docs = tfidf(items.map((s) => s.title));
    const freq = {};
    for (const terms of docs) for (const t of terms) freq[t] = (freq[t] || 0) + 1;
    clusterTerms[tagId] = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
  }
  return { program, clusters, clusterTerms };
}

function render() {
  if (!ctx.model) return;
  const { route } = parseHash();
  renderNav();
  window.scrollTo({ top: 0 });

  let view;
  if (route.startsWith("/themen/")) {
    const tagId = decodeURIComponent(route.split("/")[2] || "");
    view = renderCluster(ctx.model, ctx, null, tagId);
  } else if (route === "/info") {
    view = renderInfo();
  } else {
    view = renderTopics(ctx.model, ctx, null);
  }
  app.textContent = "";
  app.append(view);
}

function renderInfo() {
  const wrap = h("div", { class: "view view-info" });
  wrap.append(
    h("h1", { text: "Über diese App" }),
    h("p", { text:
      "Der Themen-Kompass ist die Data-Mining-Ergänzung zur Programm-App des " +
      "15. Deutschen Slavistiktags 2026 in Jena (30.09.–03.10.2026). Er gruppiert " +
      "alle Vorträge automatisch nach Themenfeldern – per Keyword-Matching über " +
      "Titel und Sprechernamen, ohne maschinelles Lernen, vollständig im Browser." }),
    h("p", { text:
      "Die Daten kommen live aus der Programm-App " +
      "(github.com/achimrabus/slavistiktag-2026-programm-app); der lokale Snapshot " +
      "greift nur, wenn die Verbindung scheitert. Klick auf einen Vortrag öffnet " +
      "ihn per Deep-Link in der Programm-App." }),
    h("h2", { text: "Methode & Grenzen" }),
    h("p", { text:
      "27 Themenfelder aus einem kuratierten Lexikon; Sprachverteilung per " +
      "Funktionswort-Heuristik (Deutsch/Englisch, Russisch/Ukrainisch über " +
      "kyrillische Spezialzeichen, Tschechisch/Polnisch über Diakritika). " +
      "Zuordnungen sind Hinweise, keine Klassifikation – ein Vortrag kann in " +
      "mehreren Clustern erscheinen, manche passen in keines." }),
    h("p", { class: "dim", text: "App: Achim Rabus · Lizenz: MIT" }));
  return wrap;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => { /* offline optional */ });
  });
}

export async function boot() {
  renderNav();
  try {
    const { program, source } = await loadProgram();
    ctx.model = buildModel(program);
    ctx.model.source = source;
    render();
  } catch (err) {
    app.textContent = "";
    app.append(h("div", { class: "card error" },
      h("h2", { text: "Daten konnten nicht geladen werden" }),
      h("p", { text: String(err) }),
      h("button", { class: "btn", text: "Neu laden", onclick: () => location.reload() })));
  }
}

window.addEventListener("hashchange", render);
boot();
