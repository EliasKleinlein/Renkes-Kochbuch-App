# Phase 17 – Capacitor-Readiness-Bericht

Stand: nach Abnahme der PWA (Phase 16). Reiner Bericht, nichts installiert oder geändert.

## 1. Ausgangslage (belegt)
- PWA abgenommen: Rezeptliste, Suche, Detailseiten, chinesische Rezepte, Bilder und Video offline; Update-Mechanismus; Offline-Matrix 37/37.
- Next.js 16.3.5, App Router. Build-Routen (`next build`):

| Route | Art | Server nötig, weil |
| --- | --- | --- |
| `/`, `/add`, `/chinesische-rezepte`, `/danke-renke`, `/offline`, `/stickers`, `/manifest.webmanifest` | statisch (○) | – |
| `/recipes/[id]` | dynamisch (ƒ) | dynamische Route ohne `generateStaticParams()` |
| `/danke-renke/eintrag/[person]` | dynamisch (ƒ) | dynamische Route; Token über `searchParams` serverseitig |
| `/api/recipes/sync`, `/api/recipes/search`, `/api/thanks` | Route Handler (ƒ) | Neon-Zugriff mit `DATABASE_URL` |
| `src/proxy.ts` (`DANKE_ONLY`) | Proxy/Middleware | serverseitige Umleitung |

- `next/image`: in 12 Dateien importiert, 18 Stellen mit `unoptimized`; Standard-Loader im Einsatz (`next.config.ts` hat `remotePatterns` für `images.unsplash.com`).
- Sync-Transport ruft relativ `/api/recipes/sync` auf (`src/lib/recipes/sync/remote-transport.client.ts:36`).
- Online-Bereitstellung: im Repository nicht belegt (nur der Standard-Vercel-Hinweis der README).
- Werkzeuge auf diesem PC: **kein Java, kein Android SDK, kein Android Studio**. iOS-Builds brauchen macOS mit Xcode (nicht auf diesem PC).

## 2. Was Capacitor erwartet
Capacitor packt einen fertigen Ordner mit Web-Dateien (`webDir`) in eine native App. Laut mitgelieferter Next-16-Doku (`node_modules/next/dist/docs/01-app/02-guides/static-exports.md`) unterstützt der statische Export (`output: 'export'`) **nicht**: dynamische Routen ohne `generateStaticParams()` bzw. mit `dynamicParams: true`, Route Handler, die auf Request angewiesen sind, Proxy, Bildoptimierung mit dem Standard-Loader, Server Actions, Rewrites/Redirects/Headers.

## 3. Optionen

### A) Statischer Export in die App (empfohlen)
App-Shell, Code, Bilder und Rezeptdaten liegen lokal in der App; nur Sync und Dankesbuch brauchen einen Server.

| # | Notwendige Änderung | Aufwand |
| --- | --- | --- |
| A1 | API-Routen (`/api/recipes/sync`, `/api/thanks`) weiter online betreiben (bestehende oder neue Next-Bereitstellung); Sync-Transport auf konfigurierbare absolute URL umstellen, CORS für die App-Herkunft (`capacitor://localhost` iOS, `https://localhost` Android) freigeben | mittel |
| A2 | Detailseite unabhängig vom Build machen: Daten kommen ohnehin aus IndexedDB → statt `/recipes/[id]` eine statische Detailseite mit ID aus der URL-Query (z. B. `/rezept?id=…`) oder `generateStaticParams()` aus Neon zur Buildzeit (dann braucht jedes neue Rezept einen neuen App-Build) | mittel |
| A3 | Schreib-Links: Seite für die 10 Personen statisch erzeugen (`generateStaticParams`), Token clientseitig lesen (`useSearchParams`) | klein |
| A4 | `proxy.ts` (`DANKE_ONLY`) gilt nur für die Web-Bereitstellung → im App-Build nicht verwenden | klein |
| A5 | Bilder: `images.unoptimized: true` für den Export (Bilder sind bereits lokale Originale) | klein |
| A6 | Service Worker in der App nicht registrieren (Dateien liegen lokal); IndexedDB bleibt der Datenspeicher | klein |
| A7 | App-Größe: Bilder rund 38,6 MiB + Video 17,7 MB werden Teil des App-Pakets | Hinweis |

### B) Remote-URL-Hülle (`server.url`)
Die App lädt die Online-Website. Kaum Codeänderungen, aber Offline-Fähigkeit hängt vom Service Worker in der WebView ab (auf iOS nur eingeschränkt verfügbar – vor einer Entscheidung zu prüfen, hier nicht verifiziert), und reine Website-Hüllen können bei der App-Store-Prüfung abgelehnt werden (Hinweis, nicht geprüft). Für eine offlinefähige App nicht empfohlen.

## 4. Voraussetzungen für Phase 18 (zu entscheiden bzw. zu installieren)
1. Entscheidung A oder B (Empfehlung A).
2. Online-Ziel für Sync und Dankesbuch (A1): vorhandene Bereitstellung bestätigen oder neue festlegen; Upload/Deployment nur nach Freigabe.
3. Android: JDK und Android SDK/Android Studio installieren (neue Software, VERSIONSRICHTLINIE: stabil, mindestens 7 Tage alt, Quelle prüfen; mehrere GB Download). Emulator bzw. Gerät für Phase 19 (Emulator belastet CPU/GPU).
4. iOS: Build nur auf macOS mit Xcode (Mac von Elias); Apple-Entwicklerkonto für Gerätetests/Store.
5. Capacitor-Pakete (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`) – neue Dependencies, Version nach VERSIONSRICHTLINIE vor der Installation an der offiziellen Quelle prüfen.

## 5. Ergebnis
Die Web-Schicht ist durch die local-first-Architektur (IndexedDB, Sync-Grenze, lokale Bilder) gut vorbereitet. Für einen statischen App-Build sind die Punkte A1–A6 umzusetzen; der größte Punkt ist die Trennung von App (lokal) und Server-Funktionen (Sync, Dankesbuch). Phase 18 setzt die Entscheidungen aus Abschnitt 4 voraus.
