import { z } from "zod";
import type { RecipeData } from "@/schemas/recipeSchema";
import { RecipeRepositoryError, validationError } from "@/lib/recipes/errors";
import {
  deserializeRecipe,
  serializeRecipes,
  type SerializedRecipe,
} from "@/lib/recipes/serialization";

export const SYNC_SCHEMA_VERSION = 1 as const;

const DatasetVersionSchema = z
  .string()
  .regex(/^sha256:[a-f0-9]{64}$/);

const SyncEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(SYNC_SCHEMA_VERSION),
    datasetVersion: DatasetVersionSchema,
    recipes: z.array(z.unknown()),
  })
  .strict();

export type RecipeSyncSnapshot = {
  schemaVersion: typeof SYNC_SCHEMA_VERSION;
  datasetVersion: string;
  recipes: RecipeData[];
};

export type RecipeSyncWireSnapshot = {
  schemaVersion: typeof SYNC_SCHEMA_VERSION;
  datasetVersion: string;
  recipes: SerializedRecipe[];
};

export interface RecipeSyncTransport {
  fetchSnapshot(): Promise<RecipeSyncSnapshot>;
}

function rejectDuplicateIds(recipes: readonly RecipeData[]) {
  const ids = new Set<number>();

  for (const recipe of recipes) {
    if (ids.has(recipe.id)) {
      throw validationError(`Doppelte Rezept-ID: ${recipe.id}`);
    }
    ids.add(recipe.id);
  }
}

export function parseRecipeSyncSnapshot(value: unknown): RecipeSyncSnapshot {
  try {
    const envelope = SyncEnvelopeSchema.parse(value);
    const recipes = envelope.recipes.map(deserializeRecipe);
    rejectDuplicateIds(recipes);

    return {
      schemaVersion: envelope.schemaVersion,
      datasetVersion: envelope.datasetVersion,
      recipes,
    };
  } catch (error) {
    if (error instanceof RecipeRepositoryError) {
      throw error;
    }

    throw validationError("Der Synchronisationsdatensatz ist ungültig.", error);
  }
}

export function createRecipeSyncWireSnapshot(
  recipes: readonly RecipeData[],
  datasetVersion: string,
): RecipeSyncWireSnapshot {
  try {
    const serializedRecipes = serializeRecipes(recipes);
    DatasetVersionSchema.parse(datasetVersion);
    rejectDuplicateIds(recipes);

    return {
      schemaVersion: SYNC_SCHEMA_VERSION,
      datasetVersion,
      recipes: serializedRecipes,
    };
  } catch (error) {
    if (error instanceof RecipeRepositoryError) {
      throw error;
    }

    throw validationError("Der Synchronisationsdatensatz ist ungültig.", error);
  }
}
