// DOM-Smoketest: kompletter App-Boot mit jsdom + echten Daten. node tests/smoke.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const indexHtml = await readFile(new URL("../index.html", import.meta.url), "utf-8");
const dom = new JSDOM(indexHtml, { url: "https://example.org/", pretendToBeVisual: true });

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.location = dom.window.location;
globalThis.localStorage = dom.window.localStorage;
globalThis.history = dom.window.history;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
globalThis.NodeFilter = dom.window.NodeFilter;
globalThis.URL = dom.window.URL;
globalThis.URLSearchParams = dom.window.URLSearchParams;
globalThis.Blob = dom.window.Blob;
globalThis.getComputedStyle = dom.window.getComputedStyle;
window.scrollTo = () => {};
globalThis.scrollTo = window.scrollTo;

// fetch-Stub: liest lokale Dateien
globalThis.fetch = async (path) => {
  const file = path.replace(/^.*?data\//, "data/");
  try {
    const body = await readFile(new URL("../" + file, import.meta.url), "utf-8");
    return { ok: true, status: 200, json: async () => JSON.parse(body), text: async () => body };
  } catch (e) {
    return { ok: false, status: 404, json: async () => { throw e; } };
  }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, tries = 50) {
  for (let i = 0; i < tries; i++) {
    if (fn()) return true;
    await sleep(50);
  }
  return false;
}

let n = 0;
const t = (name, fn) => { fn(); n++; console.log("  ok", name); };

// App booten
await import("../js/app.js");
assert.equal(await waitFor(() => document.querySelectorAll("#app .card").length > 0), true, "App hat nicht gerendert");

t("Dashboard gerendert (Titel + Motto)", () => {
  const h1 = document.querySelector("#app h1");
  assert.ok(h1.textContent.includes("Slavistiktag"));
  assert.ok(document.querySelector("#app .motto").textContent.includes("Zukunft"));
});
t("Nav mit 5 Einträgen (inkl. Themen)", () => {
  const labels = [...document.querySelectorAll("#main-nav .nav-link")].map((a) => a.textContent.trim());
  assert.equal(labels.length, 5);
  assert.ok(labels.some((l) => l.includes("Themen")));
});

// Navigation: Programm
dom.window.location.hash = "#/programm";
await waitFor(() => document.querySelector("#app .filter-bar"));
t("Programm: Filterleiste + Grid gerendert", () => {
  assert.ok(document.querySelector("#app .filter-bar"));
  assert.ok(document.querySelector("#app .grid"));
});
t("Programm: Vortragskarten vorhanden", () => {
  assert.ok(document.querySelectorAll("#app .session-card").length > 10);
});

// Suche
const search = document.querySelector("#app .search-input");
search.value = "Brehmer";
search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
await sleep(450);
t("Suche 'Brehmer' findet Treffer", () => {
  const cards = document.querySelectorAll("#app .session-card");
  assert.ok(cards.length >= 1 && cards.length <= 5, `${cards.length} Karten`);
});

// Listenansicht (Regression: listView gab undefined zurück → Text „undefined" statt Karten)
const listBtn = [...document.querySelectorAll("#app .view-toggle button")].find((b) => b.textContent.trim() === "Liste");
listBtn.click();
dom.window.location.hash = "#/programm?day=all";
await waitFor(() => document.querySelector("#app .slot-grid"));
await sleep(250);
t("Liste 'Alle Tage': kein 'undefined', Karten über alle Tage", () => {
  assert.ok(!document.body.textContent.includes("undefined"), "Textknoten 'undefined' im DOM");
  assert.ok(document.querySelectorAll("#app .slot-grid .session-card").length > 100,
    `nur ${document.querySelectorAll("#app .slot-grid .session-card").length} Karten`);
});
const gridBtn = [...document.querySelectorAll("#app .view-toggle button")].find((b) => b.textContent.trim() === "Raster");
gridBtn.click();
await sleep(250);

// Drawer
search.value = "";
search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
await sleep(450);
document.querySelector("#app .session-card").click();
await waitFor(() => document.querySelector(".drawer"));
t("Drawer öffnet mit Panel-Kontext", () => {
  const d = document.querySelector(".drawer");
  assert.ok(d.querySelector("h2").textContent.length > 5);
  assert.ok(d.querySelector(".btn-row"));
});
document.querySelector(".drawer-backdrop").click();
await waitFor(() => !document.querySelector(".drawer"));

// Favorit setzen
const favBtn = document.querySelector("#app .session-card .fav");
favBtn.click();
t("Favorit via ☆ gesetzt", () => {
  assert.equal(JSON.parse(localStorage.getItem("slavtag26.favs")).length, 1);
});

// Mein Programm
dom.window.location.hash = "#/mein";
await waitFor(() => document.querySelector("#app .view-mine"));
t("Mein Programm zeigt Favorit", () => {
  assert.ok(document.querySelector("#app .view-mine .session-card"));
});

// Themen-Kompass
dom.window.location.hash = "#/themen";
await waitFor(() => document.querySelector("#app .cluster-card"));
t("Themen-Kompass: Cluster-Karten gerendert", () => {
  assert.ok(document.querySelectorAll("#app .cluster-card").length >= 15);
  assert.ok(document.querySelector("#app .topics-intro h1").textContent.includes("Themen"));
});
t("Cluster-Karte: Zähler + charakteristische Begriffe + Sprachinfo", () => {
  const card = document.querySelector("#app .cluster-card");
  assert.ok(card.querySelector(".pill.count").textContent.length >= 1);
  assert.ok(card.querySelector(".cluster-terms").textContent.length > 3);
  assert.ok(card.querySelector(".cluster-meta .dim").textContent.length > 0);
});

// Cluster-Detail + Drawer-Integration
const tagId = document.querySelector("#app .cluster-card").getAttribute("data-tag");
dom.window.location.hash = `#/themen/${tagId}`;
await waitFor(() => document.querySelector("#app .cluster-item"));
t("Cluster-Detail: Vorträge, Klick öffnet Drawer (kein externer Link)", () => {
  const items = document.querySelectorAll("#app .cluster-item");
  assert.ok(items.length >= 2, `nur ${items.length}`);
  assert.equal(items[0].getAttribute("href"), null);
  items[0].click();
});
await waitFor(() => document.querySelector(".drawer"));
t("Drawer aus Themen-Ansicht geöffnet", () => {
  assert.ok(document.querySelector(".drawer"));
  assert.ok(document.querySelector(".drawer h2").textContent.length > 5);
});
document.querySelector(".drawer-backdrop").click();
await waitFor(() => !document.querySelector(".drawer"));

// Info mit Mining-Abschnitt
dom.window.location.hash = "#/info";
await waitFor(() => document.querySelector("#app .view-info"));
t("Info: Orte, Podien, Poster, Mining-Methode, Urheber", () => {
  assert.ok(document.querySelector("#app .venue-grid"));
  assert.ok(document.body.textContent.includes("Themen-Kompass: Methode"));
  assert.ok(document.body.textContent.includes("Achim Rabus"));
});

// Deep-Link: Filter in URL
dom.window.location.hash = "#/programm?day=2026-10-03&room=SR%20206";
await waitFor(() => document.querySelector("#app .grid"));
t("Deep-Link: Sa + SR 206 gefiltert", () => {
  const cards = [...document.querySelectorAll("#app .session-card")];
  assert.ok(cards.length >= 1 && cards.length <= 6, `${cards.length} Karten`);
});

console.log(`\n${n} Smoke-Tests bestanden.`);
process.exit(0);
