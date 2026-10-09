# Phase 12 – Serverabhängige Funktionen und Offlinezustände

Stand: Phase 12. Grundlage: Audit (`docs/offline-app-audit.md`, Offline-Blocker 1–10), Architektur (`docs/offline-repository-architecture.md`) und der Code nach Phase 11.

## Klassifizierung

| Funktion / Route | Abhängigkeit | Offline-Verhalten | Klasse | Zustand nach Phase 12 |
| --- | --- | --- | --- | --- |
| Rezeptliste `/`, Suche im Archiv, Detail `/recipes/[id]` | IndexedDB (`LocalFirstRecipeFacade`) | funktioniert nach dem ersten erfolgreichen Sync | **offline voll** | Phase 4–8; seit Phase 16 auch Detailseiten offline nach App-Neustart (Vorabspeicherung aller Detailseiten) |
| `/api/recipes/sync` | Neon, Next-Server | Bootstrap scheitert kontrolliert, vorhandene lokale Daten bleiben | **online nötig, kontrolliert** | unverändert (Phase 6/7); kein Hintergrund-Sync (Phase 13/14) |
| `/api/recipes/search` | Neon, Next-Server | von der UI nicht mehr verwendet | **Altlast, online** | unverändert; Abbau separat entscheiden |
| `/chinesische-rezepte` | statisches JSON im Bundle | funktioniert offline (Shell-Precache) | **offline voll** | unverändert (Phase 9) |
| Bilder | Service-Worker-Cache | 109 Kernbilder offline | **offline voll** | unverändert (Phase 10) |
| Video `/stickers` | Service-Worker-Media-Cache | nach Online-Besuch offline inkl. Range | **offline nach Besuch** | Phase 11 |
| Dankesbuch-Übersicht `/danke-renke` → `GET /api/thanks` | Neon, Next-Server | Seite offline (nach Besuch) sichtbar, Einträge nicht ladbar | **online nötig für Einträge** | klarer Hinweis im Kopfbereich statt stillem Fehler |
| Persönlicher Schreib-Link `/danke-renke/eintrag/[person]?token=…` → `POST /api/thanks` | Neon, Next-Server, Token | Seite wird wegen Token bewusst nicht gecacht → Offlineseite; bei Verbindungsverlust nach dem Laden scheitert das Speichern | **nur online** | verständliche Offline-Meldung beim Laden/Speichern, Text bleibt im Formular; Offlineseite nennt die Einschränkung |
| Websuche-Link (Google) in der Küchenmeister-Suche | externes Netz | offline toter Link | **nur online** | offline kein Öffnen, Hinweis an der bestehenden Suchmeldung |
| `/add` | keine (Platzhalterseite) | offline nach Besuch sichtbar | **statisch** | unverändert |
| `proxy.ts` (`DANKE_ONLY`) | Next-Server (Middleware) | wirkt nur bei Serveranfragen | **Server, ohne Offline-Relevanz** | unverändert |
| Schriften (`next/font/google`) | Netz nur beim Build | Laufzeit lokal im Bundle | **Build-Zeit** | unverändert |

## Gemeinsame Texte

`src/lib/offline/messages.ts` enthält die Offline-Texte und die Erkennung (`isOffline()`, `isNetworkError()`). Phase 13 (zentrale Online-/Offline-Statusschicht) baut darauf auf.

## Bewusst nicht in Phase 12
- Kein lokales Zwischenspeichern oder Nachsenden von Dankesbuch-Einträgen (Token-gebunden, Schreibzugriff auf Neon).
- Keine zentrale Statusanzeige (Phase 13), kein Update-Mechanismus (Phase 14).
- Bekannte Grenze aus Phase 11: Seiten, die nie online besucht wurden, sind offline unvollständig (seitenspezifische `/_next/static`-Chunks) → Phase 14/16.
