# ADR: Offline-Repository-Architektur für Rezeptdaten

- **Phase:** 1
- **Status:** BESTANDEN / FREIGEGEBEN durch Codex
- **Datum:** 18. September 2026
- **Geltungsbereich:** normale beziehungsweise dynamische Rezeptdaten; statisch gebündelte Sammlungen werden gesondert behandelt

## Kontext

Die Anwendung liest normale Rezeptdaten derzeit direkt aus Neon:

- `src/lib/recipes.ts` importiert `sql` aus `@/lib/db` und implementiert `getRecipes()`, `searchRecipes()` und `getRecipeById()`.
- `src/app/page.tsx` und `src/app/recipes/[id]/page.tsx` sind Server Components und rufen diese Funktionen direkt auf.
- Die Client-Suche in `KitchenMasterExperience` ruft `src/app/api/recipes/search/route.ts` auf; der Route Handler delegiert ebenfalls an `searchRecipes()` und damit an Neon.
- `src/schemas/recipeSchema.ts` definiert mit `RecipeSchema`, `RecipeIdSchema` und dem abgeleiteten `RecipeData` bereits einen validierten Datenvertrag. `created_at` ist nach Validierung ein `Date`, weil `z.coerce.date()` verwendet wird.
- `src/types/recipe.ts` enthält parallel einen manuell gepflegten `Recipe`-Typ mit denselben Feldern. Zwei unabhängig gepflegte Domänenmodelle würden langfristig auseinanderlaufen.
- IndexedDB ist ausschließlich im Browser verfügbar. Server Components und Route Handler können sie nicht lesen.

Ziel ist ein lokaler Lesepfad, bei dem die UI weder IndexedDB noch Neon kennt. Neon bleibt ein entfernter Adapter für Abgleich und Bootstrap; Synchronisierung ist eine eigene Verantwortlichkeit.

## Entscheidung

### 1. Maßgeblicher Datenvertrag

`RecipeSchema` und der daraus abgeleitete Typ `RecipeData` bleiben der einzige maßgebliche Domänenvertrag für normale Rezeptdaten:

```ts
type RecipeData = z.infer<typeof RecipeSchema>;
```

Der manuelle Typ aus `src/types/recipe.ts` wird nicht als zweites Modell fortgeführt. Eine spätere Implementierungsphase soll Importe auf `RecipeData` vereinheitlichen und den redundanten Typ erst dann entfernen, wenn keine Verwendung mehr besteht. Phase 1 ändert keinen Code.

`RecipeIdSchema` bleibt die verbindliche Validierung für IDs. Repository-Implementierungen dürfen keine schwächeren, eigenen ID-Regeln einführen.

### 2. Minimale Lese-Schnittstelle

Die UI-nahe Schnittstelle bleibt bewusst klein und datenquellenneutral:

```ts
interface RecipeRepository {
  getAll(): Promise<RecipeData[]>;
  getById(id: number): Promise<RecipeData | null>;
  search(query: string): Promise<RecipeData[]>;
}
```

Verbindliche Semantik:

- `getAll()` liefert eine Liste validierter Rezepte. Ohne Datensätze liefert es `[]`, niemals `null`. Die bestehende Standardsortierung `created_at` absteigend bleibt erhalten.
- `getById(id)` validiert die Eingabe mit `RecipeIdSchema`. Eine gültige, aber unbekannte ID liefert `null`. Eine ungültige ID ist ein Validierungsfehler und wird nicht als „nicht gefunden“ behandelt.
- `search(query)` trimmt die Eingabe. Eine leere Suchanfrage liefert ohne Datenzugriff `[]`. Die Suchsemantik bleibt zunächst kompatibel zum Bestand: `title`, `original_title`, `category`, `ingredients`, `notes` und `tags`, ohne Beachtung der Groß-/Kleinschreibung, Standardsortierung `created_at` absteigend und höchstens 50 Ergebnisse.
- Jede erfolgreiche Rückgabe erfüllt `RecipeSchema`; ungeprüfte Daten dürfen die Repository-Grenze nicht überschreiten.
- Die Schnittstelle enthält keine Cache-, Netzwerk-, IndexedDB-, SQL- oder Sync-Optionen. Die UI darf daraus keine konkrete Datenquelle ableiten.

### 3. `LocalRepository`: IndexedDB und lokale Metadaten

`LocalRecipeRepository` implementiert `RecipeRepository` im Browser und ist die primäre Laufzeitquelle für normale/dynamische Rezepte. Nur diese lokale Spezialisierung erhält Schreib- und Metadatenoperationen:

```ts
type LocalDatasetMetadata = {
  schemaVersion: number;
  datasetVersion: string;
  lastSyncAt: Date | null;
};

interface LocalRecipeRepository extends RecipeRepository {
  replaceAll(
    recipes: readonly RecipeData[],
    metadata: LocalDatasetMetadata,
  ): Promise<void>;
  getMetadata(): Promise<LocalDatasetMetadata | null>;
  setLastSync(lastSyncAt: Date): Promise<void>;
}
```

Festlegungen:

- `replaceAll()` validiert den vollständigen neuen Datenbestand und die Metadaten, bevor geschrieben wird. Rezeptbestand, `schemaVersion`, `datasetVersion` und `lastSyncAt` werden in einer gemeinsamen IndexedDB-Transaktion ersetzt. Bei Validierungs-, Quota-, Abbruch- oder Schreibfehlern bleibt der zuvor bestätigte lokale Bestand vollständig erhalten.
- Es gibt absichtlich kein öffentliches `clear()` im minimalen Vertrag. Ein Sync-Fehler darf nicht durch vorsorgliches Löschen lokaler Daten behandelt werden.
- `setLastSync()` aktualisiert nur den Zeitpunkt eines nachweislich erfolgreichen Abgleichs. Ein bloßer Versuch oder erkannte Online-Verbindung zählt nicht als erfolgreicher Sync.
- `schemaVersion` versioniert das lokale Speicherformat beziehungsweise erforderliche Migrationen. `datasetVersion` identifiziert den fachlichen Remote-Snapshot. Beide Bedeutungen dürfen nicht vermischt werden.
- Ob eine spätere Implementierung zusätzlich atomisches Upsert für inkrementelle Synchronisation benötigt, wird erst entschieden, wenn das Remote-Protokoll feststeht. Für den ersten vollständigen Snapshot ist `replaceAll()` die minimale sichere Schreiboperation.
- Es wird in Phase 1 keine IndexedDB-Bibliothek gewählt. Auswahlkriterien für später sind Transaktionssicherheit, Schema-/Upgrade-Unterstützung, TypeScript-Typisierung, Bundlegröße, Browserunterstützung, Wartungsstatus und Testbarkeit. Native IndexedDB bleibt ebenfalls eine zulässige Option.

### 4. `RemoteRepository`: Neon-Adapter

`NeonRecipeRepository` implementiert ausschließlich den Lesevertrag `RecipeRepository` und bleibt server-only. Es kapselt die vorhandenen Neon-Abfragen:

- `getAll()` übernimmt die heutige Verantwortung von `getRecipes()`.
- `getById()` übernimmt die heutige Verantwortung von `getRecipeById()`.
- `search()` übernimmt die heutige Verantwortung von `searchRecipes()`.

Der Remote-Adapter erhält keine künstlichen IndexedDB-Operationen wie `replaceAll()`, `getMetadata()` oder `setLastSync()`. Er kennt weder lokalen Speicher noch Browserzustand. Seine Abhängigkeit zeigt ausschließlich in Richtung des bestehenden serverseitigen DB-Zugriffs (`@/lib/db`).

Der bestehende lokale Bildabgleich in `src/lib/recipes.ts` (`withRenkeRecipeImage`) ist Teil der heutigen Normalisierung nach einer Neon-Abfrage. Vor der Verschiebung ist verbindlich zu entscheiden, ob diese Zuordnung:

1. in eine von Local- und RemoteRepository gemeinsam verwendete, reine Normalisierungsfunktion überführt wird, oder
2. einmalig beim Remote-Import angewendet und als normalisierter Bildpfad in IndexedDB gespeichert wird.

Sie darf nicht unbemerkt nur im Remote-Lesepfad verbleiben, weil lokale und entfernte Ergebnisse sonst voneinander abweichen.

### 5. Fassade und Abhängigkeitsrichtung

Die verbindliche Abhängigkeitsrichtung lautet:

```text
UI
  -> Recipe-Fassade / RecipeRepository
       -> LocalRecipeRepository (Browser, IndexedDB)
       -> Sync-Orchestrator
            -> Remote-Transport
                 -> NeonRecipeRepository (Server)
                      -> @/lib/db / Neon
```

- Die UI importiert nur die Fassade beziehungsweise den gemeinsamen Lesevertrag und `RecipeData`.
- Normale UI-Leseoperationen werden durch die Fassade local-first an `LocalRecipeRepository` delegiert.
- Die Fassade darf Synchronisierung anstoßen, führt sie aber nicht selbst aus und enthält keine SQL-/Fetch-/IndexedDB-Details.
- Der Sync-Orchestrator koordiniert Local und Remote konzeptionell. Wegen der Next.js-Laufzeitgrenze greift Clientcode nicht durch einen direkten Import auf `NeonRecipeRepository` zu, sondern über einen schmalen HTTP-Transport zu einem serverseitigen Route Handler. Dieser Route Handler instanziiert beziehungsweise verwendet den Remote-Adapter.
- Gemeinsam nutzbare Contracts, Schemas und reine Serialisierung enthalten keine Imports aus `@/lib/db`, `server-only`, Browser-APIs oder React.

### 6. Next.js-Server-/Client-Grenze

Folgende Grenzen sind verbindlich:

- IndexedDB darf weder aus Server Components noch aus Route Handlern, Server Actions, Proxy-Code oder anderen Node-/Edge-Laufzeiten aufgerufen werden.
- Module des `LocalRecipeRepository` werden ausschließlich aus Clientcode geladen. Eine spätere Implementierung soll diese Grenze durch Dateibenennung und/oder einen Client-only-Guard absichern.
- `NeonRecipeRepository`, `@/lib/db` und `DATABASE_URL` bleiben in explizit server-only Modulen. Kein Clientmodul und kein transitiv von einem Client Component importiertes Modul darf sie importieren.
- Der Sync-Route-Handler liefert ausschließlich validierte, serialisierte Transportdaten. Er legt weder `DATABASE_URL` noch SQL-Details im Client offen.

Geplanter Übergang ohne Designänderung:

| Bereich | Heute | Zielgrenze |
| --- | --- | --- |
| Startseite | `src/app/page.tsx` lädt in der Server Component mit `getRecipes()` aus Neon. | Die Seite bleibt eine dünne Server-Shell; ein gezielter Client-Datencontainer liest nach Hydration über die Fassade aus IndexedDB und reicht dieselben `RecipeData`-Felder an die bestehende Darstellung. Kein Import des lokalen Repositorys in `page.tsx`. |
| Detailseite | `src/app/recipes/[id]/page.tsx` lädt serverseitig mit `getRecipeById()`. | Die Serverroute übergibt nur die URL-ID an einen Client-Datencontainer. Dieser validiert die ID und liest `getById()` über die Fassade. Lade-, Nicht-gefunden- und Speicherfehlerzustände müssen clientseitig eindeutig sein. Die spätere PWA-Routenbereitstellung ist nicht Teil dieser Phase. |
| Suche | Client ruft `/api/recipes/search` auf, das serverseitig Neon abfragt. | Die interaktive Suche verwendet `RecipeRepository.search()` der Client-Fassade und damit IndexedDB. Der bestehende Such-Route-Handler kann während einer Übergangsphase bestehen, ist aber nicht der Offline-Lesepfad. Remote-Daten gelangen nur über den getrennten Sync-Transport in den lokalen Bestand. |

Eine optionale serverseitig gelieferte Erstansicht darf später die wahrgenommene Ladezeit verbessern, aber nicht zum einzigen Datenpfad werden und nicht dazu führen, dass die UI Neon direkt kennt.

### 7. Serialisierung und Validierung an Grenzen

Im Anwendungs- und Repositoryvertrag ist `RecipeData.created_at` immer ein echtes `Date`.

An serialisierten Grenzen gilt:

- **Neon -> RemoteRepository:** Unbekannte DB-Zeilen werden unmittelbar als `unknown` behandelt und mit `RecipeSchema` beziehungsweise `z.array(RecipeSchema)` validiert. `z.coerce.date()` normalisiert den DB-Wert zu `Date`.
- **Server -> JSON/API:** Vor `JSON.stringify` wird `created_at` explizit als ISO-8601-Zeichenkette ausgegeben. Eine gegebenenfalls benannte Wire-Struktur ist nur ein Transportformat, kein zweites Domänenmodell.
- **JSON/API -> Sync:** Empfangene Daten gelten als `unknown` und werden als vollständiges Array mit `RecipeSchema` validiert. Die ISO-Zeichenkette wird dabei wieder zu `Date` koerziert. Ein einzelner ungültiger Datensatz verwirft den gesamten neuen Snapshot; der alte lokale Bestand bleibt erhalten.
- **RecipeData -> IndexedDB:** Der lokale Adapter serialisiert `created_at` in eine ISO-8601-Zeichenkette und speichert nur validierte Records. Dieses festgelegte Format vereinfacht Schema-Migration, Export und Tests, obwohl IndexedDB technisch `Date` strukturiert klonen könnte.
- **IndexedDB -> RecipeData:** Records werden als `unknown` gelesen und erneut mit `RecipeSchema` validiert; erst danach verlassen sie das lokale Repository. `created_at` ist dann wieder `Date`.
- **Metadaten:** `lastSyncAt` wird persistent ebenfalls als ISO-Zeichenkette gespeichert und vom LocalRepository als `Date | null` zurückgegeben.

Damit existiert genau ein Domänenmodell. Persistenz- und Wire-Records sind interne serialisierte Repräsentationen der Adapter.

#### Verbindliche Dataset-Version (Phase 6)

Die `datasetVersion` ist ein Inhaltsfingerabdruck des vollständigen, bereits validierten und bildnormalisierten Remote-Snapshots. Vor der Berechnung werden alle Rezepte nach `id` aufsteigend sortiert und mit festgelegter Feldreihenfolge kanonisch als JSON serialisiert; `created_at` liegt dabei als ISO-8601-Zeichenkette vor. Über diese Bytefolge wird serverseitig mit Node `crypto` SHA-256 berechnet. Das Transportformat lautet exakt `sha256:<64 lowercase hex>`. Damit ist die Version unabhängig von der Eingabereihenfolge, ändert sich aber bei jeder inhaltlichen Änderung des synchronisierten Bestands. `schemaVersion` bleibt davon getrennt und ist für den aktuellen Vertrag `1`.

### 8. Fehlervertrag

Repositoryfehler werden nicht als leere Erfolgswerte getarnt. Vorgesehen ist ein kleiner, datenquellenneutraler Fehlervertrag, zum Beispiel:

```ts
type RecipeRepositoryErrorCode =
  | "VALIDATION"
  | "LOCAL_STORAGE"
  | "REMOTE_UNAVAILABLE"
  | "SYNC_CONFLICT"
  | "UNKNOWN";
```

- Erfolgreich, aber ohne Datensätze: `[]` beziehungsweise `null` wie oben definiert.
- Ungültige IDs, ungültige Remote-/Persistenzdaten oder inkompatible Schemaversion: Fehlercode `VALIDATION`.
- IndexedDB nicht verfügbar, Quota überschritten, Transaktion abgebrochen oder Browserzugriff verweigert: `LOCAL_STORAGE`.
- HTTP-/Neon-/Netzwerkfehler im Remote- oder Sync-Pfad: `REMOTE_UNAVAILABLE`.
- Nicht automatisch lösbare Versions-/Änderungskonflikte: `SYNC_CONFLICT`.
- Unerwartete Fehler: `UNKNOWN`, mit ursprünglicher Ursache für Logging, aber ohne sensible Serverdetails in der Clientmeldung.

Die konkrete Klasse beziehungsweise Result-Form wird erst bei Implementierung festgelegt. Verbindlich ist die Semantik: Die UI erhält quellenneutrale Zustände und muss keine Browser- oder Neon-Fehlermeldungen parsen.

### 9. Local-first-Lesefluss und späterer Hintergrund-Sync

Konzeptioneller Lesefluss:

1. Die UI fordert Daten über die Fassade an.
2. Die Fassade liefert sofort den validierten lokalen Bestand aus IndexedDB, sofern vorhanden.
3. Fehlt ein lokaler Bestand, wird ein klarer Bootstrap-Zustand zurückgemeldet. Vorhandene Seed-Daten können nach Prüfung als Bootstrap-/Fallback-Kandidat dienen, sind aber nicht ungeprüft die kanonische Produktionsquelle.
4. Ein separater Sync-Orchestrator darf im Hintergrund einen Remote-Abgleich anstoßen.
5. Erst nachdem der vollständige Remote-Snapshot übertragen, gegen `RecipeSchema` validiert und seine Versionsinformation geprüft wurde, ruft der Orchestrator das atomische `replaceAll()` auf.
6. Nach erfolgreicher Transaktion kann die Fassade Abonnenten über neue lokale Daten informieren. Die UI liest weiterhin aus dem lokalen Repository.

Bei Remote-, Validierungs-, Versions-, Quota- oder Transaktionsfehlern gilt: vorhandene lokale Rezepte und ihre zuletzt bestätigten Metadaten bleiben unverändert nutzbar. Weder ein fehlgeschlagener Fetch noch eine teilweise Antwort darf `replaceAll()` mit einem leeren oder unvollständigen Bestand auslösen.

Push-Synchronisierung, Konfliktauflösung und automatische Zeitplanung werden in Phase 1 nicht festgelegt oder implementiert. Der Vertrag lässt sie später zu, ohne den UI-Lesepfad an Neon zu koppeln.

### 10. Statisch gebündelte Rezeptdaten

`src/data/chinese-recipes.json` bleibt als statisch gebündelte Quelle außerhalb von IndexedDB, solange diese Sammlung unveränderlich ist und keine Remote-Synchronisierung benötigt. Eine Duplizierung allein für eine einheitliche Ablage ist nicht gerechtfertigt. Die chinesische Seite kann ihren bestehenden direkten Import behalten oder später über eine zusammensetzende Fassade lesen; physisch muss die Sammlung deshalb nicht in `LocalRecipeRepository` kopiert werden.

Für als „Special“ bezeichnete Daten gilt dieselbe technische Entscheidung, nicht allein der Dateiname: Bleiben sie statisch gebündelt und unveränderlich, werden sie nicht dupliziert. Sind sie Teil des normalen, von Neon synchronisierten Rezeptbestands oder benötigen dieselben stabilen IDs und Änderungen, gehören sie in den geprüften Sync-Datensatz. Diese Zuordnung ist vor dem Bootstrap anhand der tatsächlichen Datenparität zu entscheiden.

### 11. Vorgeschlagene spätere Dateistruktur

Die Struktur ist eine Zielrichtung, keine Dateierstellung in Phase 1:

```text
src/lib/recipes/
  contract.ts                    # RecipeRepository, Metadaten, Fehlervertrag
  serialization.ts              # reine Wire-/Persistenz-Konvertierung
  local-repository.client.ts     # IndexedDB; LocalRecipeRepository
  remote-repository.server.ts    # Neon; server-only
  facade.client.ts               # UI-Zugang, local-first
  image-normalization.ts         # reine gemeinsame Bildzuordnung, falls gewählt
  sync/
    orchestrator.client.ts       # Ablauf, atomarer Austausch, Status
    remote-transport.client.ts   # HTTP zum serverseitigen Sync-Endpunkt
src/app/api/recipes/sync/route.ts # server-only Transport -> RemoteRepository
```

Schema und Domänentyp verbleiben in `src/schemas/recipeSchema.ts`; es wird keine neue Recipe-Modelldatei angelegt. Die endgültigen Dateinamen dürfen sich bei der Umsetzung an Next.js-Konventionen anpassen, solange Laufzeitgrenzen und Verantwortlichkeiten erhalten bleiben.

### 12. Zuordnung bestehender Funktionen

| Bestehende Funktion | Neue Verantwortung | Übergangshinweis |
| --- | --- | --- |
| `getRecipes()` | `NeonRecipeRepository.getAll()` | SQL und Neon bleiben server-only; UI verwendet künftig `RecipeRepository.getAll()` über die Client-Fassade. |
| `getRecipeById(id)` | `NeonRecipeRepository.getById(id)` | ID-Validierung bleibt über `RecipeIdSchema`; lokaler UI-Pfad verwendet dieselbe Signatur. |
| `searchRecipes(query)` | `NeonRecipeRepository.search(query)` | Bleibt für Remote-/Adminbedarf verfügbar; interaktive Offline-Suche verwendet `LocalRecipeRepository.search()`. |
| `withRenkeRecipeImage()` | gemeinsame reine Normalisierung oder normalisierter Import | Entscheidung vor Implementierung nötig, damit lokale und Remote-Ergebnisse identisch sind. |
| `/api/recipes/search` | Übergangs-/Online-Endpunkt, nicht Kernlesepfad | Darf nicht vom lokalen Repository importiert werden; späterer Abbau separat entscheiden. |

## Bewusst ausgeschlossen

Phase 1 enthält ausdrücklich nicht:

- Implementierung eines Repositorys, einer Fassade oder Synchronisierung;
- Auswahl oder Installation einer IndexedDB-Abhängigkeit;
- PWA-Gerüst, Web-App-Manifest, Service Worker, Caching oder Offline-Fallback;
- UI-, Design-, Routing- oder Component-Änderungen;
- Datenbankmigrationen oder Änderungen an Neon;
- Datenexport, Seed-Ausführung oder Abgleich mit Produktionsdaten;
- Festlegung von Sync-Intervall, Push-Protokoll oder Konfliktalgorithmus;
- Phase 2 oder spätere Arbeit.

## Offene Architekturfragen und Risiken

1. **Stabile IDs:** Neon vergibt IDs beim Insert. Vor Bootstrap und Sync muss nachgewiesen werden, dass lokale IDs dauerhaft dieselben Rezepte bezeichnen und keine Seed-Reihenfolge als Identität verwendet wird.
2. **Datenparität:** Der lokale Seed-Bestand wurde nicht gegen die Produktionsdatenbank verglichen. Fehlende, zusätzliche oder abweichende Datensätze müssen vor einer Erstbefüllung erkannt werden.
3. **Dataset-Versionierung:** Seit Phase 6 wird der vollständige normalisierte Snapshot in kanonischer ID-Reihenfolge als SHA-256-Inhaltsfingerabdruck versioniert. Die Version ist bewusst nicht monoton; ein Vergleich beantwortet nur, ob der vollständige Inhalt identisch ist, und erfordert für jeden Remote-Abgleich den vollständigen Snapshot.
4. **Schema-Migration:** Für Änderungen an `RecipeSchema` und IndexedDB-Stores wird eine Upgrade-Strategie benötigt. Ein inkompatibler Record darf nicht stillschweigend verworfen werden.
5. **Browser-Speicherfehler:** Private Modi, Quota, Berechtigungen, Eviction und abgebrochene Transaktionen können IndexedDB unbrauchbar machen. Die UI braucht einen quellenneutralen Fehler-/Fallbackzustand.
6. **Bildzuordnung:** `withRenkeRecipeImage()` darf zwischen Local und Remote keine unterschiedlichen Ergebnisse erzeugen. Zusätzlich bleiben mögliche Remote-Bildwerte aus Neon ungeklärt.
7. **Erststart ohne Netz:** Ein geprüfter Bootstrap-Snapshot ist erforderlich, wenn die App schon beim allerersten Offline-Start Rezepte zeigen soll. Seed-Daten dürfen dafür erst nach ID-/Paritätsprüfung verwendet werden.
8. **Direktaufruf dynamischer Route:** IndexedDB steht erst nach Clientstart bereit. Lade- und Nicht-gefunden-Zustand der Detailseite sowie spätere Service-Worker-Navigation müssen getrennt behandelt werden.
9. **Mehrere Tabs:** Gleichzeitiger Sync oder Schema-Upgrade in mehreren Tabs kann konkurrieren; Locking beziehungsweise Leader-Wahl ist vor Implementierung zu entscheiden.
10. **Statische Sonderdaten:** Die Grenze zwischen statisch gebündelten Specials und synchronisierten normalen Rezepten muss anhand Änderbarkeit und Produktionszugehörigkeit dokumentiert werden, um Duplikate zu vermeiden.

## Abnahmekriterien für diesen Entscheid

Der Architekturentscheid ist umsetzungsreif, sobald Codex bestätigt, dass:

- `RecipeSchema`/`RecipeData` der einzige Domänenvertrag bleibt;
- UI, LocalRepository, RemoteRepository und Sync-Orchestrierung klar getrennt sind;
- IndexedDB nicht in Serverlaufzeiten und Neon nicht in Clientbundles gelangen kann;
- Rückgaben, Null-/Leerlistenverhalten, Serialisierung und Fehlersemantik eindeutig sind;
- vorhandene lokale Daten bei jedem Sync-Fehler erhalten bleiben;
- statische chinesische beziehungsweise technisch statische Special-Daten nicht unnötig dupliziert werden;
- stabile IDs, Datenparität und Versionierung ausdrücklich als Voraussetzungen vor Implementierung geführt werden.
