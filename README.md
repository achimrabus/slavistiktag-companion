# Slavistiktag 2026 – Programm-App mit Themen-Kompass

Inoffizielle App zum 15. Deutschen Slavistiktag 2026 in Jena (30.09.–03.10.2026).
Eine Anwendung, zwei Ebenen:

- **Programm** – alle Vorträge, Panels, Podien und Rahmenveranstaltungen mit
  Volltextsuche (global über alle Tage), Filtern (Tag, Raum, Zeit, Panel,
  Disziplin, Format), Favoriten (★, localStorage), ICS-Export, „Jetzt läuft“-
  Ansicht und Detail-Drawer pro Vortrag.
- **Themen-Kompass** (Data Mining) – alle Vorträge automatisch nach 27
  Themenfeldern gruppiert (kuratiertes Keyword-Lexikon über Titel und
  Sprechernamen), mit charakteristischen Begriffen (TF-IDF) und heuristischer
  Sprachverteilung pro Cluster. Kein ML-Backend, alles im Browser.

Vanilla JS, kein Framework, kein Build-Step. Statisch auf GitHub Pages.

## Datenfluss

```
Uni Jena (vortraege.pdf)
   │  GitHub Action update.yml (Cron alle 6 h): SHA-256-Vergleich,
   │  bei Änderung: Parser → Validierungs-Gate → Commit → Pages-Neubau
   ▼
data/program.json  (generiert, committed)
data/content.json  (kuratiert: Podien, Rahmenprogramm, Venues, Eröffnung)
   │
   ▼
App (buildModel beim Laden: Venues, Panels, Suche, Mining-Tags, Cluster)
```

Validierung schlägt fehl → kein Commit, alte Daten bleiben online, die Action
scheitert sichtbar.

## Struktur

```
repo/
├── index.html                SPA, Hash-Routing (#/heute, /programm, /mein, /themen, /info)
├── css/style.css
├── js/
│   ├── app.js                Router, State, Boot
│   ├── data.js               Laden + Verschmelzen + Mining-Pass
│   ├── lexicon.js            Kuratiertes Keyword-Lexikon (27 Themenfelder)
│   ├── mining.js             Tagging, Sprachheuristik, TF-IDF, Clustering
│   ├── search.js             Normalisierung, Filterung, Hervorhebung
│   ├── favorites.js, ics.js, now.js, util.js
│   └── views/                dashboard, program, mine, info, drawer, topics
├── data/                     program.json (generiert) + content.json (kuratiert)
├── tools/parse_program.py    PDF→JSON (pdfplumber, lokal/CI)
├── tools/verify_lexicon.mjs  Lexikon gegen echte Titel verifizieren
├── tests/                    mining, logic, realdata, smoke (jsdom), layout (Playwright)
└── .github/workflows/        deploy.yml (Pages) + update.yml (Cron 6 h)
```

## Entwicklung / Tests

```
npm install
npm run test        # 5 Suiten: Mining-Logik, Filter/ICS/Now, echte Daten, jsdom-Smoke, Layout
npm run parse       # PDF neu parsen (tools/source/*.pdf → data/program.json)
python -m http.server 8000   # lokal ansehen
```

Der Sprachdetektor ist eine **Heuristik** (Funktionswörter Deutsch/Englisch,
kyrillische Spezialzeichen für Russisch/Ukrainisch, Diakritika für Polnisch/
Tschechisch) – Zuordnungen sind Hinweise, keine Klassifikation. 76 % der
Vorträge lassen sich zuordnen; Multi-Label ist gewollt.

Lizenz: MIT (siehe LICENSE). App: Achim Rabus.
