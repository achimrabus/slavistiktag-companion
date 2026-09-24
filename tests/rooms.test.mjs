// rooms.test.mjs – Raum-Mapping vollständig + Deep-Links valide
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const { ROOMS, roomMeta, roomMapUrl, unmappedRooms } = await import("../js/rooms.js");
const program = JSON.parse(await readFile(new URL("../data/program.json", import.meta.url), "utf-8"));

let n = 0;
const t = (name, fn) => { fn(); n++; console.log("  ok", name); };

// 1. Alle Programm-Räume sind gemappt
t("Alle Programm-Räume gemappt (keine Lücken)", () => {
  const all = [...new Set(program.sessions.map((s) => s.room).filter(Boolean))];
  const missing = unmappedRooms(all);
  assert.deepEqual(missing, [], `fehlend: ${missing.join(", ")}`);
});

// 1b. Alle Event-Räume sind gemappt
t("Alle Event-Räume gemappt", () => {
  const all = [...new Set(program.events.map((e) => e.room).filter(Boolean))];
  const missing = unmappedRooms(all);
  assert.deepEqual(missing, [], `fehlend: ${missing.join(", ")}`);
});

// 2. Jeder Eintrag hat Gebäude + Adresse + Koordinaten
t("Alle Einträge: building + address + lat/lon", () => {
  for (const [name, m] of Object.entries(ROOMS)) {
    assert.ok(m.building, `${name}: building fehlt`);
    assert.ok(m.address, `${name}: address fehlt`);
    assert.equal(typeof m.lat, "number", `${name}: lat`);
    assert.equal(typeof m.lon, "number", `${name}: lon`);
  }
});

// 3. SR 223 ist dem UHG zugeordnet (nicht CZS 3)
t("SR 223 → UHG (Fürstengraben 1)", () => {
  assert.equal(roomMeta("SR 223").building, "UHG");
  assert.equal(roomMeta("SR 223").address, "Fürstengraben 1");
});

// 4. MMZ 220 → Ernst-Abbe-Platz 8
t("MMZ 220 → Ernst-Abbe-Platz 8", () => {
  assert.equal(roomMeta("MMZ 220").address, "Ernst-Abbe-Platz 8");
});

// 5. Deep-Link-Format valide
t("roomMapUrl erzeugt OSM-Link mit Marker", () => {
  const url = roomMapUrl("SR 206");
  assert.ok(url.startsWith("https://www.openstreetmap.org/?mlat="));
  assert.ok(url.includes("map=19/"));
  assert.equal(roomMapUrl("Unbekannt 999"), null);
});

// 6. Koordinaten plausibel (Jena-Zentrum)
t("Koordinaten im Jena-Zentrum (50.92–50.93 / 11.58)", () => {
  for (const m of Object.values(ROOMS)) {
    assert.ok(m.lat > 50.92 && m.lat < 50.93, `lat ${m.lat}`);
    assert.ok(m.lon > 11.57 && m.lon < 11.60, `lon ${m.lon}`);
  }
});

console.log(`\n${n} Raum-Tests bestanden.`);
process.exit(0);
