import { z } from "zod";
import { RecipeSchema, type RecipeData } from "@/schemas/recipeSchema";
import type { LocalDatasetMetadata } from "@/lib/recipes/contract";
import { validationError } from "@/lib/recipes/errors";

const SerializedRecipeSchema = RecipeSchema.omit({ created_at: true })
  .extend({
    created_at: z.string().datetime({ offset: true }),
  })
  .strict();

const MetadataSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    datasetVersion: z.string().trim().min(1),
    lastSyncAt: z.date().nullable(),
  })
  .strict();

const SerializedMetadataSchema = MetadataSchema.omit({ lastSyncAt: true })
  .extend({
    lastSyncAt: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();

const LastSyncSchema = z.date();

export type SerializedRecipe = z.infer<typeof SerializedRecipeSchema>;
export type SerializedMetadata = z.infer<typeof SerializedMetadataSchema>;

export function serializeRecipe(value: RecipeData): SerializedRecipe {
  try {
    const recipe = RecipeSchema.parse(value);
    return SerializedRecipeSchema.parse({
      ...recipe,
      created_at: recipe.created_at.toISOString(),
    });
  } catch (error) {
    throw validationError("Rezeptdaten sind ungültig.", error);
  }
}

export function serializeRecipes(
  values: readonly RecipeData[],
): SerializedRecipe[] {
  try {
    const recipes = z.array(RecipeSchema).parse(values);
    return recipes.map((recipe) => ({
      ...recipe,
      created_at: recipe.created_at.toISOString(),
    }));
  } catch (error) {
    throw validationError("Der Rezeptbestand ist ungültig.", error);
  }
}

export function deserializeRecipe(value: unknown): RecipeData {
  try {
    const serialized = SerializedRecipeSchema.parse(value);
    return RecipeSchema.parse(serialized);
  } catch (error) {
    throw validationError("Persistierte Rezeptdaten sind ungültig.", error);
  }
}

export function serializeMetadata(
  value: LocalDatasetMetadata,
): SerializedMetadata {
  try {
    const metadata = MetadataSchema.parse(value);
    return SerializedMetadataSchema.parse({
      ...metadata,
      lastSyncAt: metadata.lastSyncAt?.toISOString() ?? null,
    });
  } catch (error) {
    throw validationError("Metadaten sind ungültig.", error);
  }
}

export function deserializeMetadata(value: unknown): LocalDatasetMetadata {
  try {
    const serialized = SerializedMetadataSchema.parse(value);
    return MetadataSchema.parse({
      ...serialized,
      lastSyncAt:
        serialized.lastSyncAt === null
          ? null
          : new Date(serialized.lastSyncAt),
    });
  } catch (error) {
    throw validationError("Persistierte Metadaten sind ungültig.", error);
  }
}

export function serializeLastSyncAt(value: Date): string {
  try {
    return LastSyncSchema.parse(value).toISOString();
  } catch (error) {
    throw validationError("Der Synchronisationszeitpunkt ist ungültig.", error);
  }
}
