# Offline-App-Audit – Phase 0

Stand der Bestandsaufnahme: 17. September 2026. Dieser Bericht beschreibt den vorgefundenen Zustand auf dem Branch `feature/offline-app`; er enthält noch keine Implementierung.

## Ist-Zustand

### Repository und Verzeichnisstruktur

- `src/app/`: Next.js App Router mit Seiten, Layout, Ladezustand und zwei Route Handlern.
- `src/components/`: Darstellungs- und Interaktionskomponenten.
- `src/lib/`: Neon-Verbindung (`db.ts`) und serverseitige Rezeptabfragen (`recipes.ts`).
- `src/data/`: statische Rezept-, Sticker- und Tippdaten; darunter 20 chinesische Rezepte in `chinese-recipes.json` sowie Seed-Daten für die Datenbank.
- `src/schemas/` und `src/types/`: Zod-Schemas und TypeScript-Typen.
- `src/proxy.ts`: globaler Next.js-Proxy für den optionalen `DANKE_ONLY`-Modus.
- `public/`: 156 lokale Assets mit insgesamt 78.264.076 Bytes (143 WebP, 7 PNG, 5 SVG, 1 MP4).
- `scripts/`: Datenbank-Setup, Seed, Bildsynchronisierung und Ausgabe persönlicher Dankeslinks.
- Root-Konfiguration: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `package.json` und `package-lock.json`.

Der Git-Branch ist `feature/offline-app`. Vor Erstellung dieses Berichts war der Arbeitsbaum sauber.

### Versionen und Build-Konfiguration

Die tatsächlich aufgelösten Versionen stammen aus `package-lock.json` (nicht nur aus den Bereichen in `package.json`):

| Paket | Lock-Version |
| --- | --- |
| Next.js | 16.3.5 |
| React / React DOM | 19.3.0 / 19.3.0 |
| TypeScript | 6.0.3 |
| `@neondatabase/serverless` | 1.1.0 |
| ESLint / `eslint-config-next` | 9.39.5 / 16.3.5 |
| Tailwind CSS | 4.3.3 |

`package.json` definiert nur `dev`, `build`, `start` und `lint`; Test-, PWA- oder Export-Skripte fehlen. `next.config.ts` enthält ausschließlich ein `images.remotePatterns`-Muster für `https://images.unsplash.com`. Insbesondere sind weder statischer Export noch PWA-/Service-Worker-Konfiguration, Cache-Header oder eine Offline-Fallbackseite konfiguriert. `tsconfig.json` nutzt unter anderem `strict`, `noEmit`, Bundler-Modulauflösung und den Alias `@/* -> ./src/*`. `postcss.config.mjs` aktiviert `@tailwindcss/postcss`.

Die von `AGENTS.md` genannte lokale Next.js-Dokumentation unter `node_modules/next/dist/docs/` ist im untersuchten Arbeitsbaum nicht vorhanden. Es wurde entsprechend der Vorgabe keine Installation ausgelöst.

### Routes

| Route | Quelldatei | Daten/Verhalten | Offline-Auswirkung im Ist-Zustand |
| --- | --- | --- | --- |
| `/` | `src/app/page.tsx` | Server Component; `getRecipes()` liest Neon, Übergabe an interaktive Rezeptauswahl | Bricht ohne Netzwerk/Datenbank bereits beim serverseitigen Laden. |
| `/recipes/[id]` | `src/app/recipes/[id]/page.tsx` | dynamische Serverroute; `getRecipeById()` liest Neon; `loading.tsx` zeigt Ladezustand | Bricht ohne Netzwerk/Datenbank; es gibt kein `generateStaticParams`. |
| `/chinesische-rezepte` | `src/app/chinesische-rezepte/page.tsx` | statische JSON-Daten aus `src/data/chinese-recipes.json`, interaktive Client-Komponente | Inhalt ist datenmäßig lokal, aber ohne Service Worker/Precache ist die Route bei kaltem Offline-Start nicht verfügbar. |
| `/stickers` | `src/app/stickers/page.tsx` | lokales Video `/video/test_video.mp4` | Datenmäßig lokal; bei kaltem Offline-Start nicht verfügbar. Das 17.747.760-Byte-Video ist für Precache/Storage relevant. |
| `/add` | `src/app/add/page.tsx` | rein statischer Platzhalter; nennt Neon nur im Text | Datenmäßig lokal, aber bei kaltem Offline-Start nicht verfügbar. |
| `/danke-renke` | `src/app/danke-renke/page.tsx` | Shell als Server Component; `ClassThankYouBook` lädt per `GET /api/thanks` | Shell kann gerendert werden, Nachrichten laden offline nicht; kein persistenter lokaler Ersatz. |
| `/danke-renke/eintrag/[person]` | `src/app/danke-renke/eintrag/[person]/page.tsx` | dynamischer Personen-Slug aus statischer Map; `token` aus Query; Clientformular lädt/speichert über `/api/thanks` | Formular-Shell ist lokal ableitbar, Laden und Speichern brechen offline. |
| `GET /api/recipes/search?q=…` | `src/app/api/recipes/search/route.ts` | ruft `searchRecipes()` und damit Neon auf | Offline nicht funktionsfähig. |
| `GET /api/thanks` | `src/app/api/thanks/route.ts` | liest alle Dankesnachrichten aus Neon | Offline nicht funktionsfähig. |
| `POST /api/thanks` | `src/app/api/thanks/route.ts` | validiert mit Zod und aktualisiert über Person-ID plus Edit-Token in Neon | Offline nicht funktionsfähig; keine Queue oder lokale Speicherung. |
| `/favicon.ico` | `src/app/favicon.ico` | statisches Icon | Lokal vorhanden, aber nicht explizit vorab gecacht. |

`src/proxy.ts` gilt mit `matcher: "/:path*"` für alle Pfade. Bei `DANKE_ONLY=true` lässt er nur Dankesbuch-, API-, `_next`-, Bild- und Favicon-Pfade zu und leitet den Rest auf `/danke-renke` um. Dieser serverseitige, umgebungsabhängige Kontrollfluss hat keinen Offline-Ersatz.

### Server- und Client-Komponenten

Explizite Client-Grenzen (`"use client"`) wurden in folgenden Dateien gefunden:

- `src/components/KitchenMasterExperience.tsx`: Filter, Archivsuche und externer Google-Suchlink. Die importierten `GiftButton`, `RecipeGrid` und darüber `RecipeCard` gehören dadurch ebenfalls zum Client-Modulgraphen.
- `src/components/ChineseRecipeCollection.tsx`: interaktive Auswahl der statisch importierten chinesischen Rezepte.
- `src/components/thanks/ClassThankYouBook.tsx`: Animation, Bild-Preload und API-Laden der Nachrichten.
- `src/app/danke-renke/eintrag/[person]/EntryForm.tsx`: API-Laden und -Speichern eines Eintrags.
- `src/components/ChristophusCompanion.tsx`: zeitgesteuerte/interaktive Sprüche; im aktuellen App-Routen-Importgraphen wurde keine Verwendung gefunden.
- `src/components/stickers/RandomRenkeSticker.tsx`: Zufallsauswahl; im aktuellen `/stickers`-Routen-Importgraphen wurde keine Verwendung gefunden.

Alle `page.tsx`, `layout.tsx` und `loading.tsx` besitzen keine Client-Direktive und sind Server Components. Ebenso sind unter anderem `Navbar`, `Hero`, `FantasyFooter`, `RenkeRecipeTip` und `ChristophusAdvice` serverseitig verwendete Komponenten. Eine `"use server"`-Direktive oder Server Action wurde nicht gefunden.

### Datenquellen und Datenbank

Statische Datenquellen:

- `src/data/chinese-recipes.json`: 20 Rezepte, direkt von `/chinesische-rezepte` importiert.
- `src/data/seed-recipes.ts`, `extra-recipes.ts`, `special-recipes.ts`: vollständige Rezeptobjekte, derzeit nur von `scripts/seed.ts` zum Befüllen von Neon verwendet; sie sind keine Laufzeitquelle der Rezeptseiten.
- `src/data/recipe-advice.ts`: lokale Tipps für `RenkeRecipeTip` und `ChristophusAdvice`.
- `src/data/renke-stickers.ts`: lokale Stickerdaten für die derzeit nicht in `/stickers` eingehängte Zufallskomponente.
- Statische Personenzuordnungen stehen getrennt in `src/app/danke-renke/eintrag/[person]/page.tsx`, `src/components/thanks/ClassThankYouBook.tsx` und `scripts/setup-thanks.ts`.

Dynamische Datenquellen:

- `src/lib/db.ts` validiert `process.env.DATABASE_URL` beim Modulimport und erzeugt über `neon(databaseUrl)` den SQL-Client. Fehlt die Variable, schlägt bereits der Import jedes abhängigen Moduls fehl.
- Tabelle `recipes`: Laufzeitquelle für Liste, Detail und Suche.
- Tabelle `thank_you_messages`: Laufzeitquelle für Anzeige und Bearbeitung der Dankesnachrichten.

#### Alle direkten Imports von `@/lib/db`

1. `src/lib/recipes.ts`: importiert `sql`; verwendet es in `getRecipes`, `searchRecipes` und `getRecipeById`.
2. `src/app/api/thanks/route.ts`: importiert `sql`; verwendet es in `GET` und `POST`.

Weitere direkte `@/lib/db`-Imports wurden durch repositoryweite Suche nicht gefunden. `src/app/page.tsx`, `src/app/recipes/[id]/page.tsx` und `src/app/api/recipes/search/route.ts` hängen indirekt über `src/lib/recipes.ts` davon ab.

#### Alle direkten SQL-Zugriffe

- `src/lib/recipes.ts`: `SELECT * FROM recipes ORDER BY created_at DESC`; `SELECT` mit sechs `ILIKE`-Feldern und `LIMIT 50`; `SELECT` nach `id` mit `LIMIT 1`.
- `src/app/api/thanks/route.ts`: `SELECT person_id, name, message, updated_at FROM thank_you_messages`; tokengebundenes `UPDATE thank_you_messages ... RETURNING`.
- `scripts/seed.ts`: `INSERT INTO recipes ... ON CONFLICT (original_title) DO NOTHING RETURNING id`.
- `scripts/sync-extra-recipe-images.ts`: `UPDATE recipes SET image ... RETURNING id`.
- `scripts/setup-thanks.ts`: `CREATE TABLE IF NOT EXISTS thank_you_messages`, je Person ein `INSERT ... ON CONFLICT DO NOTHING`, anschließend `SELECT`.
- `scripts/print-thanks-links.ts`: `SELECT person_id, name, edit_token FROM thank_you_messages`.

Die vier Skripte erstellen jeweils einen eigenen Neon-Client aus `DATABASE_URL`; sie importieren `src/lib/db.ts` nicht.

### Netzwerkabhängigkeiten

Runtime-Netzwerkabhängigkeiten:

- Jeder Aufruf des Neon-Clients in den oben genannten App- und Skriptdateien benötigt eine Verbindung zum externen Neon-Endpunkt aus `DATABASE_URL`.
- `KitchenMasterExperience.searchArchive()` ruft relativ `GET /api/recipes/search` auf; der Route Handler greift auf Neon zu.
- `ClassThankYouBook` und `EntryForm` rufen relativ `/api/thanks` auf; dessen GET und POST greifen auf Neon zu.
- `KitchenMasterExperience.tsx` erzeugt für die Web-Weitersuche einen Link zu `https://www.google.com/search`; dieser ist offline unbrauchbar.
- `scripts/print-thanks-links.ts` erzeugt Links für `https://renkes-kochbuch.vercel.app`; `scripts/setup-thanks.ts` erzeugt lokale HTTP-Links. Dies sind Administrationsausgaben, keine Requests der App.
- `next.config.ts` erlaubt optimierte Bilder von `images.unsplash.com`. Im statisch untersuchten Source/Seed-Bestand wurde kein fest codierter Unsplash-Bildwert gefunden; da `recipe.image` aus Neon stammt, ist nicht belegbar, ob Produktionsdaten solche Remote-URLs enthalten. Das ist eine ausdrücklich offene Datenunsicherheit.

Es wurden keine WebSockets, EventSource-, XMLHttpRequest- oder Beacon-Aufrufe gefunden.

### Bilder, Video und Fonts

- Die App verwendet überwiegend `next/image` mit Pfaden unter `public/images`. Ohne erreichbaren Next-Server oder explizit vorab gespeicherte optimierte Antworten sind die von `next/image` erzeugten `_next/image`-Requests kein belastbarer Offline-Pfad.
- Rezeptbilder kommen als `recipe.image` aus Neon. `src/lib/recipes.ts` überschreibt einige bekannte Rezepte auf lokale `/images/recipes/*.webp`; die Seed-Dateien verwenden bei der Quelltextprüfung lokale Bildpfade. Produktionswerte bleiben ohne Datenbankabfrage unbekannt.
- Zwei referenzierte Dateien fehlen im Repository: `ClassThankYouBook.tsx` erwartet `/images/class/marco-stafford.png`, vorhanden ist nur `public/images/class/marco-stafford.webp`; außerdem erwartet die Komponente `/images/kitchen-masters/pavel.png`, während im entsprechenden Verzeichnis nur `pavel.webp` gefunden wurde. Das ist bereits online ein Assetfehler und würde auch einen Precache unvollständig machen.
- `/stickers` bindet `public/video/test_video.mp4` mit `preload="auto"`, Autoplay und Loop ein. Das Video ist 17.747.760 Bytes groß; eine Offline-Strategie muss Speicherquota und Installationsgröße berücksichtigen.
- `src/app/layout.tsx` nutzt `Geist` und `Geist_Mono` über `next/font/google` sowie Caveat über das lokale npm-Paket `@fontsource/caveat`. Caveat liegt nach dem Build lokal im Bundle. Google Fonts werden durch Next.js üblicherweise in Build-Artefakte überführt; ein reproduzierbarer Build kann jedoch beim Erzeugen dieser Artefakte Netzwerkzugriff benötigen. Dies wurde mangels Build in Phase 0 nicht verifiziert.

### Authentifizierung und Autorisierung

Eine Benutzeranmeldung oder Session-Authentifizierung wurde nicht gefunden. Die Suchgrundlage umfasste Abhängigkeiten und repositoryweite Suchen nach Auth-/Session-/Login-Begriffen sowie nach Cookies, Headern und bekannten Auth-Bibliotheken.

Das Dankesformular besitzt lediglich eine anwendungsnahe Autorisierungsprüfung: Ein `token` wird aus der URL-Query gelesen, als Prop an `EntryForm` weitergereicht und im POST-Body gesendet; SQL vergleicht `person_id` und `edit_token`. Es gibt keine Session, kein Login und kein Cookie. `GET /api/thanks` liefert alle Nachrichten ohne Token. Für Offline-Speicherung ist zu entscheiden, ob und wie diese Token lokal geschützt bzw. überhaupt weitergeführt werden; ein Query-Token ist kein Ersatz für Geräteauthentifizierung.

### Caching, Manifest, PWA und Service Worker

Es wurden keine expliziten App-Cachemechanismen gefunden: kein `revalidate`, kein `unstable_cache`/`use cache`, keine Cache-Tags, kein `Cache-Control`, keine Cache-Storage-Nutzung, kein IndexedDB/localStorage und keine Offline-Queue. Browser- und Next.js-Standardcaches sind damit die einzigen möglichen Zwischenspeicher und garantieren keinen kalten Offline-Start.

Es existieren weder Web-App-Manifest noch Service Worker, Workbox-Konfiguration, Installationsmetadaten oder Offline-Fallback. Das Repository ist daher im Ist-Zustand keine installierbare Offline-PWA.

### Tests und ESLint

- Es wurden keine Projekt-Testdateien und keine Jest-, Vitest-, Playwright- oder Cypress-Konfiguration gefunden. Der Playwright-Text im Lockfile gehört nur zu optionalen/transitiven Paketmetadaten; es gibt kein Projekttestskript.
- `eslint.config.mjs` verwendet ESLint Flat Config mit `eslint-config-next/core-web-vitals` und `eslint-config-next/typescript`. Ignoriert werden `.next/**`, `out/**`, `build/**` und `next-env.d.ts`.
- Phase 0 führt gemäß Auftrag keinen Build und keine Installation aus. Die Abschlussprüfungen stehen unter „Prüfgrundlage“.

## Offline-Blocker

1. **Keine Offline-Auslieferung:** Ohne Manifest und Service Worker kann die Anwendung bei kaltem Offline-Start weder App-Shell, Routen noch Assets zuverlässig laden. Dies betrifft sämtliche Seiten.
2. **Neon als zwingende Laufzeitquelle:** `/`, `/recipes/[id]`, `/api/recipes/search`, `/api/thanks` sowie dadurch Teile von `/danke-renke` und `/danke-renke/eintrag/[person]` benötigen `DATABASE_URL`, Next-Server und Netzwerk.
3. **Keine lokale Rezept-Laufzeitquelle:** Obwohl Seed-Rezepte im Repository stehen, verwenden Liste, Detail und Suche ausschließlich Neon. Offline sind vorhandene lokale Daten somit nicht zugänglich.
4. **Keine lokale Dankesbuch-Persistenz:** Nachrichten werden weder initial lokal bereitgestellt noch lokal gespeichert oder für spätere Synchronisierung vorgemerkt.
5. **Servergebundene dynamische Routen und API:** Es gibt keine statisch erzeugten Rezeptdetailseiten (`generateStaticParams` fehlt) und keinen lokalen Suchindex.
6. **`next/image` ohne Offline-Assetstrategie:** Lokale Originalbilder allein reichen nicht als Garantie, wenn die UI optimierte `_next/image`-Antworten erwartet. Dynamische Bildwerte aus Neon können zusätzlich extern sein.
7. **Externer Web-Suchlink:** Die Google-Suche funktioniert prinzipbedingt nicht offline und benötigt einen klaren Offline-Zustand.
8. **Fehlende Assets:** Zwei Bildreferenzen im Dankesbuch zeigen auf nicht vorhandene PNG-Dateien.
9. **Große Offline-Nutzlast:** Rund 78,3 MB öffentliche Assets, darunter ein rund 17,7-MB-Video, können Precache-Zeit, Gerätequota und Updates beeinträchtigen.
10. **Kein belegtes Offline-Testnetz:** Es gibt keine automatisierten Tests für Installation, Navigation, Refresh, Suche, Detailansicht, Persistenz oder Updateverhalten ohne Netzwerk.

## Betroffene Dateien

| Bereich | Dateien | Relevanz |
| --- | --- | --- |
| Datenbankkern | `src/lib/db.ts`, `src/lib/recipes.ts` | Zentraler Neon-Client und alle Rezeptqueries. |
| DB-abhängige App-Routen | `src/app/page.tsx`, `src/app/recipes/[id]/page.tsx`, `src/app/api/recipes/search/route.ts`, `src/app/api/thanks/route.ts` | Direkte oder indirekte Onlinepflicht. |
| DB-abhängige Clients | `src/components/KitchenMasterExperience.tsx`, `src/components/thanks/ClassThankYouBook.tsx`, `src/app/danke-renke/eintrag/[person]/EntryForm.tsx` | Relative API-Requests, Fehlerzustände, keine Offline-Persistenz. |
| Statische mögliche Rezeptbasis | `src/data/seed-recipes.ts`, `src/data/extra-recipes.ts`, `src/data/special-recipes.ts`, `src/data/chinese-recipes.json` | Bereits vorhandene lokale Daten, aktuell teils nur Seed-Input. |
| Assets und Fonts | `public/**`, `src/app/layout.tsx`, `next.config.ts` | Precache-/Quota-/Bildoptimierungsfragen; zwei falsche Bildreferenzen. |
| Routing/Modus | `src/proxy.ts`, alle `src/app/**/page.tsx` | Serverproxy und Offline-Navigation/Fallback. |
| Datenpflege | `scripts/seed.ts`, `scripts/setup-thanks.ts`, `scripts/sync-extra-recipe-images.ts`, `scripts/print-thanks-links.ts` | Neon-gebundene Wartungswege; nicht zwingend Teil der späteren Client-Laufzeit. |
| Fehlende Offline-Infrastruktur | derzeit keine Dateien | Manifest, Service Worker, lokale Datenablage und Offline-Tests müssen erst architektonisch festgelegt werden. |

## Empfohlene Architektur

Empfohlen wird eine schrittweise **local-first App-Router-PWA**, die die vorhandene Komponenten- und Routenstruktur beibehält und Datenzugriffe über klar getrennte Adapter kapselt:

1. **`RecipeRepository` als UI-unabhängigen Vertrag einführen.** Liste, Detailansicht, Suche und spätere Schreibvorgänge greifen ausschließlich auf diese Abstraktion zu. Die UI kennt weder IndexedDB noch Neon und entscheidet nicht selbst zwischen online und offline. `RecipeSchema` bleibt der gemeinsame Datenvertrag an allen Repository-Grenzen.
2. **`LocalRepository` mit IndexedDB als lokale Laufzeitquelle verwenden.** Normale beziehungsweise dynamische Rezeptdaten werden für Liste, Detail und lokale Suche aus IndexedDB gelesen. Damit hängt der Kernlesepfad nach dem Bootstrap nicht von Netzwerk, Route Handler oder Neon ab. Der genaue Index- und Migrationsentwurf ist Gegenstand einer späteren Phase.
3. **`RemoteRepository` als Neon-Adapter abgrenzen.** Die bestehenden Neon-Abfragen werden hinter dem Remote-Adapter gekapselt. Neon bleibt Quelle für kontrollierten Import und Abgleich, ist aber nicht mehr der unmittelbare Datenzugriff der UI und nicht die einzige Laufzeitquelle.
4. **Synchronisierung orchestrieren.** Eine separate Sync-Orchestrierung koordiniert Bootstrap, Aktualitätsprüfung, Pull/Push, Fehlerzustände und Konfliktbehandlung zwischen Local- und RemoteRepository. Sie muss wiederholbar und unterbrochene Synchronisationen müssen sicher fortsetzbar sein. Online-Status allein darf nicht als Beleg für eine erreichbare oder erfolgreiche Synchronisierung gelten.
5. **Seed-Daten nur als geprüften Bootstrap-/Fallback-Kandidaten behandeln.** `seed-recipes.ts`, `extra-recipes.ts` und `special-recipes.ts` dürfen IndexedDB initial befüllen oder einen Fallback ermöglichen, sind aber ohne Abgleich nicht die kanonische Produktionsquelle. Vor Bootstrap oder Sync müssen Datenparität, stabile IDs, Eindeutigkeit und ein Migrations-/Versionsverfahren gegenüber dem Neon-Bestand geklärt werden; Phase 0 hat keine Produktionsdaten abgerufen.
6. **Bereits statische Sammlungen getrennt lassen, wo technisch sinnvoll.** Die 20 chinesischen Rezepte aus `src/data/chinese-recipes.json` funktionieren bereits als gebündelte statische Daten. Sie sollten nicht allein aus Vereinheitlichungsgründen zusätzlich in IndexedDB dupliziert werden. Dasselbe gilt für andere tatsächlich statische Special-Daten, sofern sie keine dynamische Bearbeitung oder Synchronisierung benötigen. Die Repository-Schicht kann solche Quellen lesen beziehungsweise zusammenführen, ohne ihre physische Ablage zu vereinheitlichen.
7. **Statische/offlinefähige Routen ermöglichen.** Detailnavigation und lokale Suche müssen aus dem `RecipeRepository` bedient werden können; die bestehende Server-API darf nicht der einzige Suchweg bleiben. Ob Rezeptdetailseiten zusätzlich vorgerendert werden, ist gegen IndexedDB-Verfügbarkeit beim Direktaufruf und die gewählte App-Shell-Strategie zu entscheiden.
8. **PWA-Schicht ergänzen.** Manifest, Service Worker, versionsbasierte Cache-Namen, Offline-Fallback und eine kontrollierte Precache-Liste für Shell, Route-Artefakte und kritische Assets sind nötig. Große optionale Assets wie das Video sollten bedarfsgesteuert statt zwingend im Installations-Precache gespeichert werden.
9. **Bildstrategie explizit machen.** Für vollständig lokale Assets sollten vorhersehbare, precache-fähige URLs verwendet werden; alternativ müssen die konkreten Next-Image-Varianten vorab erzeugt und gecacht werden. Remote-Bildwerte müssen beim Datenexport lokalisiert oder mit einem dokumentierten Online-Fallback versehen werden.
10. **Dankesbuch getrennt behandeln.** Lesbare Snapshot-Daten können lokal gebündelt oder in einer eigenen IndexedDB-Struktur gespeichert werden. Änderungen sollten lokal transaktional gespeichert und nur mit festgelegtem Konflikt- und Sicherheitsmodell synchronisiert werden. Ohne definierte Synchronisierung darf die UI keine dauerhafte Server-Speicherung versprechen. Edit-Tokens gehören nicht unverschlüsselt in allgemein zugängliche statische Dateien.
11. **Online-Zusatzfunktionen degradieren.** Google-Websuche und Synchronisierung sollten bei fehlender Verbindung deaktiviert beziehungsweise verständlich als online erforderlich gekennzeichnet werden; Kernrezepte und lokale Suche müssen davon unabhängig bleiben.
12. **Offline-Abnahmetests vorsehen.** Installierter Kaltstart, Erst-Bootstrap, Direktaufruf einer Rezeptdetailroute, Navigation, Reload, lokale Suche, Bild-/Fontdarstellung, unterbrochene und wiederholte Synchronisierung, Dankesbuchverhalten, Cacheupdate und Quota-Verhalten sollten automatisiert oder reproduzierbar geprüft werden.

Diese Empfehlung ersetzt nicht App Router, bestehende UI-Komponenten oder Schemas. Sie verschiebt die technische Datenquellenwahl vollständig hinter `RecipeRepository`: `LocalRepository` stellt den offlinefähigen Laufzeitbestand bereit, `RemoteRepository` kapselt Neon und die Sync-Orchestrierung verbindet beide kontrolliert.

## Risiken und offene Unsicherheiten

- **Datenparität:** Ohne Zugriff auf Neon ist nicht belegt, ob lokale Seed-Daten sämtliche Produktionsrezepte, IDs, Bilder und Änderungen enthalten. Ein Export-/Vergleichsschritt ist vor der Migration erforderlich.
- **Stabile IDs:** Statische Detailrouten und gespeicherte Links benötigen dieselben IDs wie die Produktion; die Seed-Daten enthalten nach Quelltextprüfung keine garantierten Datenbank-IDs, da Neon sie beim Insert vergibt.
- **Dankesbuch-Konflikte:** Offline-Änderungen von mehreren Geräten erfordern eine fachliche Konfliktstrategie. Diese ist im Repository nicht definiert.
- **Token-Schutz:** Persönliche Edit-Tokens in Query-URLs und Offline-Speichern bergen Offenlegungsrisiken.
- **Cachegröße:** Ein unselektiver Precache aller 78,3 MB kann Installation und Updates verschlechtern oder Quotas überschreiten.
- **Next.js-16-Verhalten:** Die lokale versionsspezifische Dokumentation war nicht vorhanden. Cache-, Build- und Exportdetails müssen in der Implementierungsphase gegen die tatsächlich installierte Version verifiziert werden.
- **Produktionsbilder:** Ob Neon Remote-Bild-URLs enthält, ist unbekannt; `remotePatterns` zeigt nur, dass Unsplash erlaubt ist, nicht dass es genutzt wird.
- **Vorhandene Assetfehler:** Die zwei fehlenden PNG-Referenzen müssen vor einer vollständigen Offline-Assetprüfung geklärt werden.
- **Kein Testbaseline:** Änderungen können derzeit nur über Lint/Build und manuelle Prüfung abgesichert werden, solange keine Projekttests existieren.

## Prüfgrundlage / ausgeführte read-only Prüfungen

- `git branch --show-current` und `git status --short` für Branch und Ausgangszustand.
- Vollständige Dateiliste außerhalb von `.git`/`node_modules` und gezielte Sichtung von `src/app`, `src/lib`, `src/components`, `src/data`, `scripts`, `public` sowie Root-Konfigurationen.
- Lockfile-Auswertung für exakte installierte Paketversionen.
- Repositoryweite Suchen nach Client-/Server-Direktiven, `@/lib/db`, SQL-Templates/Neon, Requests und URLs, Umgebungsvariablen, Auth/Session/Cookies, Cache-APIs, PWA-/Manifest-/Service-Worker-Dateien und Testframeworks.
- Abgleich aller im Source fest codierten `/images`- und `/video`-Referenzen gegen `public` (zwei fehlende Referenzen gefunden).
- Assetanzahl, Dateitypen und Gesamt-/Videogröße wurden aus dem Dateisystem ermittelt.
- Keine Dependency-Installation, kein Build, kein Datenbankzugriff und keine Produktcodeänderung wurden durchgeführt.
