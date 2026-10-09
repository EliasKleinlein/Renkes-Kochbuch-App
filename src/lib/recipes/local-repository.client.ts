import { RecipeIdSchema, type RecipeData } from "@/schemas/recipeSchema";
import type {
  LocalDatasetMetadata,
  LocalRecipeRepository,
} from "@/lib/recipes/contract";
import {
  localStorageError,
  mapLocalStorageError,
  RecipeRepositoryError,
  validationError,
} from "@/lib/recipes/errors";
import {
  DATASET_METADATA_KEY,
  METADATA_STORE_NAME,
  openRecipeDatabase,
  RECIPE_STORE_NAME,
  requestResult,
  transactionDone,
} from "@/lib/recipes/indexed-db.client";
import {
  deserializeMetadata,
  deserializeRecipe,
  serializeLastSyncAt,
  serializeMetadata,
  serializeRecipes,
  type SerializedMetadata,
} from "@/lib/recipes/serialization";

type StoredMetadataRecord = SerializedMetadata & {
  key: typeof DATASET_METADATA_KEY;
};

const SEARCH_RESULT_LIMIT = 50;

function sortByCreatedAtDescending(recipes: RecipeData[]) {
  return recipes.sort(
    (left, right) => right.created_at.getTime() - left.created_at.getTime(),
  );
}

function metadataPayload(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value;
  }

  const metadata = { ...(value as Record<string, unknown>) };
  delete metadata.key;
  return metadata;
}

function abortTransaction(transaction: IDBTransaction) {
  try {
    transaction.abort();
  } catch {
    // Die Transaktion ist bereits abgeschlossen oder abgebrochen.
  }
}

export class IndexedDbLocalRecipeRepository
  implements LocalRecipeRepository
{
  async getAll(): Promise<RecipeData[]> {
    try {
      const database = await openRecipeDatabase();
      const transaction = database.transaction(RECIPE_STORE_NAME, "readonly");
      const completion = transactionDone(
        transaction,
        "Der lokale Rezeptbestand konnte nicht gelesen werden.",
      );
      const [records] = await Promise.all([
        requestResult<unknown[]>(
          transaction.objectStore(RECIPE_STORE_NAME).getAll(),
          "Der lokale Rezeptbestand konnte nicht gelesen werden.",
        ),
        completion,
      ]);
      return sortByCreatedAtDescending(records.map(deserializeRecipe));
    } catch (error) {
      throw mapLocalStorageError(
        error,
        "Der lokale Rezeptbestand konnte nicht gelesen werden.",
      );
    }
  }

  async getById(id: number): Promise<RecipeData | null> {
    let recipeId: number;

    try {
      recipeId = RecipeIdSchema.parse(id);
    } catch (error) {
      throw validationError("Die Rezept-ID ist ungültig.", error);
    }

    try {
      const database = await openRecipeDatabase();
      const transaction = database.transaction(RECIPE_STORE_NAME, "readonly");
      const completion = transactionDone(
        transaction,
        "Das lokale Rezept konnte nicht gelesen werden.",
      );
      const [record] = await Promise.all([
        requestResult<unknown>(
          transaction.objectStore(RECIPE_STORE_NAME).get(recipeId),
          "Das lokale Rezept konnte nicht gelesen werden.",
        ),
        completion,
      ]);
      return record === undefined ? null : deserializeRecipe(record);
    } catch (error) {
      throw mapLocalStorageError(
        error,
        "Das lokale Rezept konnte nicht gelesen werden.",
      );
    }
  }

  async search(query: string): Promise<RecipeData[]> {
    const normalizedQuery = query.trim().toLocaleLowerCase("de-DE");

    if (!normalizedQuery) {
      return [];
    }

    const recipes = await this.getAll();

    return recipes
      .filter((recipe) => {
        const searchableFields = [
          recipe.title,
          recipe.original_title,
          recipe.category,
          recipe.ingredients,
          recipe.notes ?? "",
          recipe.tags ?? "",
        ];

        return searchableFields.some((field) =>
          field.toLocaleLowerCase("de-DE").includes(normalizedQuery),
        );
      })
      .slice(0, SEARCH_RESULT_LIMIT);
  }

  async replaceAll(
    recipes: readonly RecipeData[],
    metadata: LocalDatasetMetadata,
  ): Promise<void> {
    const serializedRecipes = serializeRecipes(recipes);
    const serializedMetadata = serializeMetadata(metadata);
    const ids = new Set<number>();

    for (const recipe of serializedRecipes) {
      if (ids.has(recipe.id)) {
        throw validationError(`Doppelte Rezept-ID: ${recipe.id}`);
      }
      ids.add(recipe.id);
    }

    let transaction: IDBTransaction | null = null;
    let completion: Promise<void> | null = null;

    try {
      const database = await openRecipeDatabase();
      transaction = database.transaction(
        [RECIPE_STORE_NAME, METADATA_STORE_NAME],
        "readwrite",
      );
      completion = transactionDone(
        transaction,
        "Der lokale Rezeptbestand konnte nicht ersetzt werden.",
      );

      const recipeStore = transaction.objectStore(RECIPE_STORE_NAME);
      const metadataStore = transaction.objectStore(METADATA_STORE_NAME);
      const operations: Promise<unknown>[] = [
        requestResult(
          recipeStore.clear(),
          "Der lokale Rezeptbestand konnte nicht geleert werden.",
        ),
        requestResult(
          metadataStore.clear(),
          "Die lokalen Metadaten konnten nicht geleert werden.",
        ),
      ];

      for (const recipe of serializedRecipes) {
        operations.push(
          requestResult(
            recipeStore.put(recipe),
            "Ein lokales Rezept konnte nicht gespeichert werden.",
          ),
        );
      }

      const metadataRecord: StoredMetadataRecord = {
        key: DATASET_METADATA_KEY,
        ...serializedMetadata,
      };
      operations.push(
        requestResult(
          metadataStore.put(metadataRecord),
          "Die lokalen Metadaten konnten nicht gespeichert werden.",
        ),
      );

      await Promise.all(operations);
      await completion;
    } catch (error) {
      if (transaction !== null) {
        abortTransaction(transaction);
      }
      if (completion !== null) {
        await completion.catch(() => undefined);
      }
      throw mapLocalStorageError(
        error,
        "Der lokale Rezeptbestand konnte nicht ersetzt werden.",
      );
    }
  }

  async getMetadata(): Promise<LocalDatasetMetadata | null> {
    try {
      const database = await openRecipeDatabase();
      const transaction = database.transaction(METADATA_STORE_NAME, "readonly");
      const completion = transactionDone(
        transaction,
        "Die lokalen Metadaten konnten nicht gelesen werden.",
      );
      const [record] = await Promise.all([
        requestResult<unknown>(
          transaction.objectStore(METADATA_STORE_NAME).get(
            DATASET_METADATA_KEY,
          ),
          "Die lokalen Metadaten konnten nicht gelesen werden.",
        ),
        completion,
      ]);
      return record === undefined
        ? null
        : deserializeMetadata(metadataPayload(record));
    } catch (error) {
      throw mapLocalStorageError(
        error,
        "Die lokalen Metadaten konnten nicht gelesen werden.",
      );
    }
  }

  async setLastSync(lastSyncAt: Date): Promise<void> {
    const serializedLastSyncAt = serializeLastSyncAt(lastSyncAt);
    let transaction: IDBTransaction | null = null;
    let completion: Promise<void> | null = null;

    try {
      const database = await openRecipeDatabase();
      transaction = database.transaction(METADATA_STORE_NAME, "readwrite");
      completion = transactionDone(
        transaction,
        "Der Synchronisationszeitpunkt konnte nicht gespeichert werden.",
      );
      const metadataStore = transaction.objectStore(METADATA_STORE_NAME);
      const record = await requestResult<unknown>(
        metadataStore.get(DATASET_METADATA_KEY),
        "Die lokalen Metadaten konnten nicht gelesen werden.",
      );

      if (record === undefined) {
        throw localStorageError(
          "Der Synchronisationszeitpunkt kann ohne lokale Metadaten nicht gesetzt werden.",
        );
      }

      const metadata = deserializeMetadata(metadataPayload(record));
      const updatedRecord: StoredMetadataRecord = {
        key: DATASET_METADATA_KEY,
        ...serializeMetadata({
          ...metadata,
          lastSyncAt: new Date(serializedLastSyncAt),
        }),
      };

      await requestResult(
        metadataStore.put(updatedRecord),
        "Der Synchronisationszeitpunkt konnte nicht gespeichert werden.",
      );
      await completion;
    } catch (error) {
      if (transaction !== null) {
        abortTransaction(transaction);
      }
      if (completion !== null) {
        await completion.catch(() => undefined);
      }

      if (error instanceof RecipeRepositoryError) {
        throw error;
      }

      throw mapLocalStorageError(
        error,
        "Der Synchronisationszeitpunkt konnte nicht gespeichert werden.",
      );
    }
  }
}
