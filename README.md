# Slavistiktag 2026 · Themen-Kompass (Companion)

Data-Mining-Ansicht („Feature 5“ aus dem Projektplan) zum Programm des
15. Deutschen Slavistiktags 2026 in Jena (30.09.–03.10.2026).
Eigenständige PWA-ähnliche Single-Page-App, bewusst **getrennt** von der
Programm-App (`slavistiktag-2026-programm-app`).

## Was sie tut

- **Auto-Tagging** aller Vortragstitel über ein kuratiertes Keyword-Lexikon
  (Sprachen/Länder, Themen: Krieg, Erinnerung, Identität, Korpora, KI,
  Didaktik, Ökologie, Exil, Popkultur, Translation, Utopie …).
- **Cluster-Ansicht**: Vorträge nach generierten Themen gruppiert, mit
  charakteristischen Begriffen (TF-IDF über die Titel) und heuristischer
  Sprachverteilung pro Cluster.
- **Deep-Links in die Programm-App**: jede Karte verlinkt direkt zum
  Vortrag in der Programm-App (Volltextsuche-Deep-Link).

## Datenfluss

```
Uni Jena (vortraege.pdf) ──parse──▶ Programm-App: data/program.json
                                          │ (GitHub Pages, CORS offen)
                                          ▼
Companion lädt live: https://achimrabus.github.io/slavistiktag-2026-programm-app/data/program.json
                                          │ bei Fehlschlag
                                          ▼
                        lokaler Snapshot data/program.json (Fallback)
```

Das Mining läuft komplett **client-seitig** (Vanilla JS, kein Framework,
kein Build-Step, kein ML-Backend). Aktualisiert sich `program.json` in der
Programm-App (Auto-Update-Workflow), sieht der Companion die neuen Daten
beim nächsten Laden — kein eigenes Parsing nötig.

## Entwicklung / Tests

```
npm install
npm run test        # Mining-Logik, jsdom-Smoke, Layout (Playwright)
python -m http.server 8000   # lokal ansehen
```

Der Sprachdetektor ist eine **Heuristik** (Funktionswörter Deutsch/Englisch,
kyrillische Buchstaben für Russisch/Ukrainisch, Diakritika für Polnisch/
Tschechisch) — Ergebnisse sind Hinweise, keine Klassifikation.

Lizenz: MIT (siehe LICENSE). App: Achim Rabus.
