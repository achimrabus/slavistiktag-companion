// Layout-Tests mit echtem Chromium: Überlauf, Theming, Responsivität.
// Startet eigenen http.server. node tests/layout.test.mjs
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8127;
const server = spawn("python", ["-m", "http.server", String(PORT)], { cwd: ROOT, shell: true, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1800));

const BASE = `http://localhost:${PORT}/`;
const VIEWPORTS = [
  { name: "Android-M 360", width: 360, height: 800, mobile: true },
  { name: "iPhone 390", width: 390, height: 844, mobile: true, iphone: true },
  { name: "iPad 820", width: 820, height: 1180, mobile: true },
  { name: "Desktop 1280", width: 1280, height: 800 },
  { name: "Desktop 1920", width: 1920, height: 1080 },
];

let n = 0, failures = 0;
async function t(name, fn) {
  try { await fn(); n++; console.log("  ok", name); }
  catch (e) { failures++; console.log("  FAIL", name, "::", (e.message || e).split?.("\n")[0] || e); }
}

async function overflowIssues(page) {
  return page.evaluate(() => {
    const out = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > doc.clientWidth + 1) {
      out.push(`Dokument scrollt horizontal: ${doc.scrollWidth} > ${doc.clientWidth}`);
    }
    const inScrollableX = (el) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth) return true;
      }
      return false;
    };
    const selectors = ".card, .cluster-card, .cluster-item, .topics-intro, .topbar, .cluster-list";
    for (const el of document.querySelectorAll(selectors)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > window.innerWidth + 1 && !inScrollableX(el)) {
        out.push(`${(el.className || el.tagName).toString().split(" ")[0]} ragt rechts heraus (+${Math.round(r.right - window.innerWidth)}px)`);
      }
    }
    return [...new Set(out)];
  });
}

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: 2,
    colorScheme: "dark",
    userAgent: vp.iphone
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      : undefined,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  console.log(`\n=== ${vp.name} ===`);
  await page.goto(BASE + "#/heute");
  await page.waitForSelector("#app .card");

  await t(`${vp.name}: Dashboard ohne Überlauf`, async () => {
    assert.deepEqual(await overflowIssues(page), []);
  });
  await t(`${vp.name}: keine JS-Fehler`, () => assert.deepEqual(errors, []));

  // Themen-Kompass
  await page.goto(BASE + "#/themen");
  await page.waitForSelector("#app .cluster-card");
  await page.waitForTimeout(250);
  await t(`${vp.name}: Themen-Kompass ohne Überlauf`, async () => {
    assert.deepEqual(await overflowIssues(page), []);
  });

  // Cluster-Detail
  const tagId = await page.getAttribute("#app .cluster-card", "data-tag");
  await page.goto(`${BASE}#/themen/${tagId}`);
  await page.waitForSelector("#app .cluster-item");
  await page.waitForTimeout(250);
  await t(`${vp.name}: Cluster-Detail ohne Überlauf`, async () => {
    assert.deepEqual(await overflowIssues(page), []);
  });

  // Programm
  await page.goto(BASE + "#/programm");
  await page.waitForSelector("#app .results");
  await page.waitForTimeout(250);

  await t(`${vp.name}: Programm-Liste ohne Überlauf`, async () => {
    assert.deepEqual(await overflowIssues(page), []);
  });

  // Info
  await page.goto(BASE + "#/info");
  await page.waitForSelector("#app .view-info");
  await page.waitForTimeout(200);
  await t(`${vp.name}: Info ohne Überlauf`, async () => {
    assert.deepEqual(await overflowIssues(page), []);
  });

  // Light-Theme
  await page.goto(BASE + "#/themen");
  await page.waitForSelector("#theme-toggle");
  await page.click("#theme-toggle");
  const theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  await t(`${vp.name}: Theme-Toggle wechselt`, () => assert.equal(theme, "light"));
  await t(`${vp.name}: Light-Theme ohne Überlauf`, async () => {
    assert.deepEqual(await overflowIssues(page), []);
  });

  await ctx.close();
}

// ---------- Print-Stylesheet (Item 9) ----------
{
  const page = await browser.newPage();
  await page.goto(BASE + "#/programm", { waitUntil: "networkidle" });
  await page.waitForSelector("#app .session-card");
  await page.emulateMedia({ media: "print" });
  await t("Print: Nav unsichtbar", async () => {
    assert.equal(await page.locator("#main-nav").isVisible(), false);
  });
  await t("Print: Filterleiste unsichtbar", async () => {
    assert.equal(await page.locator("#app .filter-bar").isVisible(), false);
  });
  await t("Print: Karten sichtbar (Schwarz auf Weiß)", async () => {
    const card = page.locator("#app .session-card").first();
    assert.equal(await card.isVisible(), true);
    const colors = await card.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, shadow: cs.boxShadow };
    });
    assert.ok(!colors.shadow || colors.shadow === "none", `Schatten im Druck: ${colors.shadow}`);
  });
  await t("Print: Grid einspaltig", async () => {
    const cols = await page.locator("#app .grid").first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    assert.equal(cols, 1);
  });
  await page.emulateMedia({ media: "screen" });
  await page.close();
}

await browser.close();
server.kill();
console.log(`\n${n} Layout-Checks, ${failures} Fehler.`);
process.exit(failures ? 1 : 0);
