// DOM-Smoketest: kompletter App-Boot mit jsdom + echten Daten. node tests/smoke.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const dom = new JSDOM(`<!DOCTYPE html><html><body>
  <header class="topbar">
    <a class="brand" href="#/themen"><span class="brand-mark">Сл</span></a>
    <nav id="main-nav" class="main-nav"></nav>
    <button id="theme-toggle" class="theme-toggle"></button>
  </header>
  <main id="app" class="app-main"></main>
</body></html>`, { url: "https://example.org/", pretendToBeVisual: true });

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.location = dom.window.location;
globalThis.localStorage = dom.window.localStorage;
globalThis.history = dom.window.history;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
globalThis.URL = dom.window.URL;
globalThis.URLSearchParams = dom.window.URLSearchParams;
window.scrollTo = () => {};

// fetch-Stub: lokale Daten statt Live-Fetch
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

await import("../js/app.js");
assert.equal(await waitFor(() => document.querySelectorAll("#app .cluster-card").length > 0), true, "App hat nicht gerendert");

t("Themen-Kompass gerendert mit Cluster-Karten", () => {
  assert.ok(document.querySelectorAll("#app .cluster-card").length >= 15);
  assert.ok(document.querySelector("#app .topics-intro h1").textContent.includes("Themen"));
});
t("Cluster-Karten zeigen Zähler und charakteristische Begriffe", () => {
  const card = document.querySelector("#app .cluster-card");
  assert.ok(card.querySelector(".pill.count").textContent.length >= 1);
  assert.ok(card.querySelector(".cluster-terms").textContent.length > 3);
});
t("Sprach-Pills vorhanden", () => {
  const card = document.querySelector("#app .cluster-card");
  assert.ok(card.querySelector(".cluster-meta .dim").textContent.length > 0);
});

// Cluster-Detailansicht
const firstCard = document.querySelector("#app .cluster-card");
const tagId = firstCard.getAttribute("data-tag");
dom.window.location.hash = `#/themen/${tagId}`;
await waitFor(() => document.querySelector("#app .cluster-item"));
t("Cluster-Detailansicht listet Vorträge mit Deep-Links", () => {
  const items = document.querySelectorAll("#app .cluster-item");
  assert.ok(items.length >= 2, `nur ${items.length}`);
  const href = items[0].getAttribute("href");
  assert.ok(href.includes("programm-app/#/programm?q="), href);
  assert.ok(href.includes("day="));
});
t("Zurück-Link zum Kompass", () => {
  assert.ok(document.querySelector("#app .back-link"));
});

// Info-Ansicht
dom.window.location.hash = "#/info";
await waitFor(() => document.querySelector("#app .view-info"));
t("Info: Methode + Urheber-Nennung", () => {
  assert.ok(document.querySelector("#app .view-info h1"));
  assert.ok(document.body.textContent.includes("Achim Rabus"));
});

console.log(`\n${n} Smoke-Tests bestanden.`);
process.exit(0);
