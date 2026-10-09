// Gemeinsame Texte und Erkennung fuer Zustaende ohne Internetverbindung.

export const OFFLINE_MESSAGES = {
  banner: "Offline – Rezepte und bereits geöffnete Seiten bleiben verfügbar.",
  thanksEntryOffline:
    "Du bist gerade offline. Speichern geht wieder, sobald die Verbindung zurück ist – dein Text bleibt hier stehen.",
  thanksLoad:
    "Die Einträge im Dankesbuch brauchen eine Internetverbindung und können gerade nicht geladen werden.",
  thanksEntryLoad:
    "Ohne Internetverbindung kann dein bisheriger Eintrag gerade nicht geladen werden.",
  thanksEntrySave:
    "Keine Internetverbindung – dein Eintrag ist noch nicht gespeichert. Dein Text bleibt hier stehen; bitte speichere ihn erneut, sobald du wieder online bist.",
  webSearch:
    "Die Websuche braucht eine Internetverbindung. Die Suche im Rezeptarchiv funktioniert auch offline.",
} as const;

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

// fetch() wirft bei fehlender Verbindung einen TypeError (kein HTTP-Status).
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}
