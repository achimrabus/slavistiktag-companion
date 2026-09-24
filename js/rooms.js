// rooms.js – Raum → Gebäude/Stockwerk/Koordinate + Karten-Deep-Link (OSM).
// Quellen: uni-jena.de Medientechnik-Liste (Gebäude: SR 206/207 CZS3, SR 223 UHG,
// MMZ 220 EAP8), Open-Campus-Raumliste (HS/SR in Carl-Zeiß-Straße 3),
// Nominatim-Geocoding (2026-09-24). Koordinaten = Gebäudeeingang/Marker.
import { h } from "./util.js";
export const ROOMS = {
  "HS 6":    { building: "CZS 3", address: "Carl-Zeiß-Straße 3", floor: null, lat: 50.92879, lon: 11.58161 },
  "HS 7":    { building: "CZS 3", address: "Carl-Zeiß-Straße 3", floor: null, lat: 50.92879, lon: 11.58161 },
  "HS 8":    { building: "CZS 3", address: "Carl-Zeiß-Straße 3", floor: null, lat: 50.92879, lon: 11.58161 },
  "SR 113":  { building: "CZS 3", address: "Carl-Zeiß-Straße 3", floor: "1. OG", lat: 50.92879, lon: 11.58161 },
  "SR 114":  { building: "CZS 3", address: "Carl-Zeiß-Straße 3", floor: "1. OG", lat: 50.92879, lon: 11.58161 },
  "SR 121":  { building: "CZS 3", address: "Carl-Zeiß-Straße 3", floor: "1. OG", lat: 50.92879, lon: 11.58161 },
  "SR 124":  { building: "CZS 3", address: "Carl-Zeiß-Straße 3", floor: "1. OG", lat: 50.92879, lon: 11.58161 },
  "SR 125":  { building: "CZS 3", address: "Carl-Zeiß-Straße 3", floor: "1. OG", lat: 50.92879, lon: 11.58161 },
  "SR 127":  { building: "CZS 3", address: "Carl-Zeiß-Straße 3", floor: "1. OG", lat: 50.92879, lon: 11.58161 },
  "SR 209":  { building: "CZS 3", address: "Carl-Zeiß-Straße 3", floor: "2. OG", lat: 50.92879, lon: 11.58161 },
  "SR 206":  { building: "CZS 3", address: "Carl-Zeiß-Straße 3", floor: "2. OG", lat: 50.92879, lon: 11.58161 },
  "SR 207":  { building: "CZS 3", address: "Carl-Zeiß-Straße 3", floor: "2. OG", lat: 50.92879, lon: 11.58161 },
  "SR 208":  { building: "CZS 3", address: "Carl-Zeiß-Straße 3", floor: "2. OG", lat: 50.92879, lon: 11.58161 },
  "SR 221":  { building: "CZS 3", address: "Carl-Zeiß-Straße 3", floor: "2. OG", lat: 50.92879, lon: 11.58161 },
  "SR 222":  { building: "CZS 3", address: "Carl-Zeiß-Straße 3", floor: "2. OG", lat: 50.92879, lon: 11.58161 },
  "SR 224":  { building: "CZS 3", address: "Carl-Zeiß-Straße 3", floor: "2. OG", lat: 50.92879, lon: 11.58161 },
  "SR 226":  { building: "CZS 3", address: "Carl-Zeiß-Straße 3", floor: "2. OG", lat: 50.92879, lon: 11.58161 },
  "SR 223":  { building: "UHG",  address: "Fürstengraben 1",     floor: "2. OG", lat: 50.92945, lon: 11.58944 },
  "MMZ 220": { building: "MMZ",  address: "Ernst-Abbe-Platz 8",  floor: "2. OG", lat: 50.92810, lon: 11.58256 },
  // Rahmendprogram-Orte (Events)
  "Foyer CZS 3": { building: "CZS 3", address: "Carl-Zeiß-Straße 3", floor: "EG", lat: 50.92879, lon: 11.58161 },
  "Aula UHG":    { building: "UHG",  address: "Fürstengraben 1",     floor: "1. OG", lat: 50.92945, lon: 11.58944 },
};

export function roomMeta(name) {
  return ROOMS[name] || null;
}

// OSM-Deep-Link: Marker auf Gebäude, Zoom 19 (building) / 17 (fallback)
export function roomMapUrl(name) {
  const m = roomMeta(name);
  if (!m) return null;
  return `https://www.openstreetmap.org/?mlat=${m.lat}&mlon=${m.lon}#map=19/${m.lat}/${m.lon}`;
}

// Kurzlabel für Pills: "SR 206 · CZS 3" (Gebäude nur wenn abweichend nötig)
export function roomLabel(name) {
  const m = roomMeta(name);
  return m ? `${name}` : name;
}

// Klickbarer Raum als <a> (OSM-Deep-Link); ohne Mapping: schlichter Pill-Text
export function roomLink(name) {
  if (!name) return null;
  const url = roomMapUrl(name);
  if (!url) return h("span", { class: "pill room", text: name });
  const m = roomMeta(name);
  return h("a", {
    class: "pill room room-link", href: url, target: "_blank", rel: "noopener",
    "aria-label": `Raum ${name} (${m.building}, ${m.address}) auf Karte zeigen`,
    onclick: (e) => e.stopPropagation(),
    text: `${name}`,
  });
}

// Gebäude+Adresse als Zusatzzeile für den Drawer
export function roomWhere(name) {
  const m = roomMeta(name);
  if (!m) return null;
  return h("span", { class: "room-where", text: `${m.building} · ${m.address}${m.floor ? ` · ${m.floor}` : ""}` });
}

// Alle im Programm vorkommenden Räume, die NICHT gemappt sind (für Tests/Check)
export function unmappedRooms(allRooms) {
  return allRooms.filter((r) => !ROOMS[r]);
}
