import { localStorageError } from "@/lib/recipes/errors";

export const DATABASE_NAME = "renkes-kochbuch";
export const DATABASE_VERSION = 1;
export const RECIPE_STORE_NAME = "recipes";
export const METADATA_STORE_NAME = "metadata";
export const DATASET_METADATA_KEY = "dataset";

let databasePromise: Promise<IDBDatabase> | null = null;

function createDatabasePromise(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      localStorageError("IndexedDB ist in dieser Umgebung nicht verfügbar."),
    );
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false;
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(RECIPE_STORE_NAME)) {
        database.createObjectStore(RECIPE_STORE_NAME, { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains(METADATA_STORE_NAME)) {
        database.createObjectStore(METADATA_STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      const database = request.result;

      if (settled) {
        database.close();
        return;
      }

      settled = true;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };

    request.onerror = () => {
      if (!settled) {
        settled = true;
        reject(
          localStorageError(
            "Die lokale Rezeptdatenbank konnte nicht geöffnet werden.",
            request.error,
          ),
        );
      }
    };

    request.onblocked = () => {
      if (!settled) {
        settled = true;
        reject(
          localStorageError(
            "Die lokale Rezeptdatenbank wird durch eine andere Verbindung blockiert.",
          ),
        );
      }
    };
  });
}

export function openRecipeDatabase(): Promise<IDBDatabase> {
  if (databasePromise === null) {
    const openPromise = createDatabasePromise();
    databasePromise = openPromise;

    void openPromise.catch(() => {
      if (databasePromise === openPromise) {
        databasePromise = null;
      }
    });
  }

  return databasePromise;
}

export function requestResult<T>(
  request: IDBRequest<T>,
  errorMessage: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(localStorageError(errorMessage, request.error));
  });
}

export function transactionDone(
  transaction: IDBTransaction,
  errorMessage: string,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(localStorageError(errorMessage, transaction.error));
    transaction.onabort = () =>
      reject(localStorageError(errorMessage, transaction.error));
  });
}
