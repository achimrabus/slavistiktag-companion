// app.js – Router, State, Boot (Programm-App + Themen-Kompass in einer App)
import { h } from "./util.js";
import { loadData } from "./data.js";
import { clusterSessions, tfidf } from "./mining.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderProgram, renderResults } from "./views/program.js";
import { renderMine } from "./views/mine.js";
import { renderInfo } from "./views/info.js";
import { openDrawer } from "./views/drawer.js";
import { favs } from "./favorites.js";
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
  viewMode: localStorage.getItem("slavtag26.view") ||
    (window.matchMedia && window.matchMedia("(max-width: 760px)").matches ? "list" : "grid"),
  programState: null,
  openSession: (id) => openDrawer(ctx, id),
  openEvent: (id) => openDrawer(ctx, id),
  byId: {},
  setViewMode(mode) {
    ctx.viewMode = mode;
    localStorage.setItem("slavtag26.view", mode);
    ctx.rerenderProgram();
  },
  rerenderProgram() {
    if (ctx.programResults && ctx.programState) {
      renderResults(ctx.model, ctx, ctx.programState, ctx.programResults);
    }
  },
  render,
  refreshFavIndicators() {
    const badge = nav.querySelector(".fav-count");
    if (badge) badge.textContent = String(favs.all().length || "");
  },
  _programHook(state, results) {
    ctx.programState = state;
    ctx.programResults = results;
  },
};

function parseHash() {
  const raw = location.hash.replace(/^#/, "") || "/heute";
  const [path, query] = raw.split("?");
  const params = new URLSearchParams(query || "");
  const route = path.replace(/\/+$/, "") || "/heute";
  return { route, params };
}

function renderNav() {
  const { route } = parseHash();
  const link = (href, label, badge, forceActive) => {
    const active = forceActive ?? ("#" + route) === href;
    return h("a", { class: `nav-link ${active ? "active" : ""}`, href }, label, badge || null);
  };
  nav.textContent = "";
  nav.append(
    link("#/heute", "Heute"),
    link("#/programm", "Programm"),
    link("#/mein", "Mein Programm", h("span", { class: "fav-count pill", text: String(favs.all().length || "") })),
    link("#/themen", "Themen", null, route.startsWith("/themen")),
    link("#/info", "Info"));
}

function buildClusterModel(model) {
  const talks = model.sessions.filter((s) => s.type === "talk");
  const clusters = clusterSessions(talks);
  // Charakteristische Begriffe je Cluster (TF-IDF über Cluster-Titel)
  const clusterTerms = {};
  for (const [tagId, items] of clusters) {
    const docs = tfidf(items.map((s) => s.title));
    const freq = {};
    for (const terms of docs) for (const t of terms) freq[t] = (freq[t] || 0) + 1;
    clusterTerms[tagId] = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
  }
  return { clusters, clusterTerms };
}

function render() {
  if (!ctx.model) return;
  const { route, params } = parseHash();
  renderNav();
  window.scrollTo({ top: 0 });

  let view;
  if (route.startsWith("/themen/")) {
    const tagId = decodeURIComponent(route.split("/")[2] || "");
    view = renderCluster(ctx.model, ctx, params, tagId);
  } else if (route === "/themen") {
    view = renderTopics(ctx.model, ctx, params);
  } else if (route === "/programm") {
    view = renderProgram(ctx.model, ctx, params);
  } else if (route === "/mein") {
    view = renderMine(ctx.model, ctx);
  } else if (route === "/info") {
    view = renderInfo(ctx.model);
  } else {
    view = renderDashboard(ctx.model, ctx);
  }
  app.textContent = "";
  app.append(view);
}

export function boot() {
  renderNav();
  window.addEventListener("hashchange", render);
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => { /* offline optional */ });
    });
  }
  loadData()
    .then((model) => {
      ctx.model = model;
      ctx.byId = Object.fromEntries(model.sessions.map((s) => [s.id, s]));
      Object.assign(ctx.model, buildClusterModel(model));
      if (!localStorage.getItem("slavtag26.view")) {
        try { localStorage.setItem("slavtag26.view", ctx.viewMode); } catch { /* ignore */ }
      }
      render();
      // „Jetzt“-Karte alle 60 s auffrischen
      setInterval(() => {
        const { route } = parseHash();
        if (route === "/heute") render();
      }, 60_000);
    })
    .catch((err) => {
      app.textContent = "";
      app.append(h("div", { class: "card error" },
        h("h2", { text: "Daten konnten nicht geladen werden" }),
        h("p", { text: String(err) }),
        h("button", { class: "btn", text: "Neu laden", onclick: () => location.reload() })));
    });
}

boot();
