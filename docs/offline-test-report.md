# Offline-Testbericht (Phase 15)

## Verfahren
- **Automatisiert, ohne neue Dependency:** `node tests/e2e/offline-matrix.mjs` (setzt `next build` voraus) startet `next start` (Port 3311) und ein headless Chrome ohne GPU mit eigenem Wegwerf-Profil, beide mit niedriger Priorität. Steuerung über das Chrome-DevTools-Protokoll (`tests/e2e/cdp-client.mjs`, eingebautes WebSocket von Node).
- **Offline heißt:** Der Produktionsserver wird beendet **und** der Browser per DevTools offline geschaltet (`navigator.onLine === false`).
- **Unit-Tests Service Worker:** `node --test tests/sw/media-cache.test.mjs` (23 Fälle, Phasen 11–14).
- Umgebung: `CHROME_PATH`, `E2E_PORT`, `E2E_DEBUG_PORT` überschreibbar.

## Ergebnis der Matrix (Lauf vom Phase-15-Abschluss): 32/34

| Bereich | Prüfung | Ergebnis |
| --- | --- | --- |
| Statusschicht | Erststart ohne Abgleich: 0 Karten, IndexedDB leer | bestanden |
| Statusschicht | Verbindung zurück: Abgleich nachgeholt, 69 Karten ohne Reload | bestanden |
| Installation | Service Worker aktiv, Seite kontrolliert | bestanden |
| Installation | Shell-Precache enthält `/`, `/offline`, `/chinesische-rezepte`, `/stickers`, `/danke-renke`, `/add` | bestanden |
| Installation | Seiten-JS/CSS vorab gespeichert (18 Dateien) | bestanden |
| Installation | 109 Kernbilder im Cache | bestanden |
| Installation | IndexedDB mit 69 Rezepten | bestanden |
| Statusschicht | Online kein Hinweis, Websuche sichtbar / offline Hinweis, Websuche ersetzt / zurück | bestanden (3) |
| Statusschicht | Schreibformular offline gesperrt, online aktiv | bestanden |
| Statusschicht | Dankesbuch: Hinweis bei fehlenden Einträgen, nach Rückkehr nachgeladen | bestanden |
| Video | nach Online-Besuch vollständig im Media-Cache (17.747.760 Bytes) | bestanden |
| Detail | online direkt aufgerufen | bestanden |
| Update | neue Version wartet, Hinweis, kein Reload vor Klick / nach Klick aktiv, genau ein Reload / `sw.js` wiederhergestellt | bestanden (3) |
| Ausschlüsse | keine API-Antworten, keine Token-URLs im Cache (155 Einträge) | bestanden |
| Speicher | Belegung 67,7 MiB, unter der Quota | bestanden |
| Offline | Server beendet, Browser offline | bestanden |
| Navigation | Startseite offline 69 Karten + Statushinweis | bestanden |
| Neu laden | Startseite nach Reload offline 69 Karten | bestanden |
| Suche | Offline-Suche „Hähnchen“: 5 Treffer ohne Netz | bestanden |
| Navigation | chinesische Rezepte offline | bestanden |
| Video | offline spielt aus dem Cache; Range 206 / außerhalb 416 | bestanden (2) |
| Navigation | Dankesbuch offline mit Hinweis; `/add` offline | bestanden (2) |
| **Detail** | **(a) online direkt geladene Detailseite offline direkt aufrufbar** | **nicht bestanden** |
| **Detail** | **(b) offline in der App per Karte geöffnet** | **nicht bestanden** |
| Detail | (c) nie geladene Detailseite kalt offline → Offlineseite | bestanden (erwartete Grenze) |
| Navigation | persönlicher Schreib-Link offline → eigene Offlineseite; unbekannte Route → Offlineseite | bestanden (2) |
| Persistenz | nach Browser-Neustart offline 69 Karten | bestanden |

## Befund (Hauptmangel)
- `/recipes/[id]` ist eine dynamische Route; Next liefert sie mit `Cache-Control: no-store` → der Service Worker speichert das Dokument nicht (`canCache`). Ein Offline-Direktaufruf scheitert deshalb auch nach einem Online-Besuch (a).
- Eine Kartennavigation lädt die RSC-Daten per `fetch` (`?_rsc=`); offline scheitert sie, Next weicht auf eine Dokumentnavigation aus, für die kein Cache-Eintrag existiert → Offlineseite (b).
- Folge: **Nach einem Neustart der App lässt sich offline kein Rezept öffnen.** Die in Phase 8 dokumentierte Grenze wirkt damit breiter als dort beschrieben (vermutlich dort innerhalb derselben Browsersitzung mit Router-Cache geprüft).
- Die Detailseite selbst enthält nur die URL-ID (Daten kommen aus IndexedDB, Phase 8) – ihr HTML enthält keine Rezeptdaten oder Geheimnisse und kann gefahrlos gespeichert werden.

→ Behebung als Nachbesserung in Phase 16 (Gesamtabnahme), danach erneuter Matrixlauf.

## Phase 16 – Nachbesserung und Gesamtabnahme: 37/37

**Nachbesserung Detailroute:** Der Service Worker speichert Rezept-Detailseiten in `renkes-pages-v3` (trotz `no-store`; das HTML enthält nur die URL-ID), beim Online-Besuch und als Vorabspeicherung aller in IndexedDB vorhandenen Rezepte (Nachricht `CACHE_DETAIL_PAGES` nach dem Bootstrap, nur online, Quotaprüfung 200 KB je Seite, höchstens 500 Pfade, nur `/recipes/<id>` ohne Query). Seiten-JS/CSS aus dem HTML wird mitgespeichert. Bei jeder Aktivierung (Update) wird der Cache geleert und beim nächsten Online-Start neu befüllt. Offline-Navigation auf eine Detailseite bedient den Cache; eine Kartennavigation offline fällt über Nexts Dokumentnavigation ebenfalls darauf zurück.

**Weitere Abnahme-Korrekturen:** die zwei fehlerhaften Bildpfade im Dankesbuch (`marco-stafford.png`, `pavel.png` → vorhandene `.webp`); danach existiert jeder im Code referenzierte Bildpfad.

**Neue bzw. geänderte Matrixprüfungen (alle bestanden):**
- Installierbarkeit: Manifest mit Name, `start_url` `/`, `display` `standalone`, Icons 192 und 512.
- Installation: alle 69 Rezept-Detailseiten vorab gespeichert.
- Detail (a): online direkt geladene Detailseite offline direkt aufrufbar.
- Detail (b): offline in der App per Karte geöffnet (z. B. „Renkes Pizza Bianca à la White Theme“).
- Detail (c): nie besuchte Detailseite kalt offline mit Titel.
- Gegenfall: unbekannte Rezept-ID offline → Offlineseite.

Unit-Tests Service Worker: 29/29 (`node --test tests/sw/media-cache.test.mjs`).

**Verbleibende, bewusste Grenzen:** kein periodischer oder Hintergrund-Sync der Rezeptdaten (Abgleich beim Erststart und nach gescheitertem Erststart bei Rückkehr der Verbindung); Dankesbuch-Einträge nur online; persönliche Schreib-Links nur online; Video erst nach einem Online-Besuch von `/stickers` offline.
