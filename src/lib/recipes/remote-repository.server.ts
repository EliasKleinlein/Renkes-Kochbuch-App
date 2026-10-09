import "server-only";

import { sql } from "@/lib/db";
import type { RecipeRepository } from "@/lib/recipes/contract";
import {
  RecipeRepositoryError,
  validationError,
} from "@/lib/recipes/errors";
import { normalizeRenkeRecipeImage } from "@/lib/recipes/image-normalization";
import {
  RecipeIdSchema,
  RecipeSchema,
  type RecipeData,
} from "@/schemas/recipeSchema";
import { z } from "zod";

function parseRecipes(value: unknown): RecipeData[] {
  try {
    return z
      .array(RecipeSchema)
      .parse(value)
      .map(normalizeRenkeRecipeImage);
  } catch (error) {
    if (error instanceof RecipeRepositoryError) {
      throw error;
    }

    if (error instanceof z.ZodError) {
      throw validationError("Die Rezeptdaten sind ungültig.", error);
    }

    throw new RecipeRepositoryError(
      "UNKNOWN",
      "Die Rezeptdaten konnten nicht verarbeitet werden.",
      error,
    );
  }
}

async function runRemoteQuery(
  query: () => PromiseLike<unknown>,
): Promise<unknown> {
  try {
    return await query();
  } catch (error) {
    if (error instanceof RecipeRepositoryError) {
      throw error;
    }

    throw new RecipeRepositoryError(
      "REMOTE_UNAVAILABLE",
      "Die entfernten Rezeptdaten sind derzeit nicht verfügbar.",
      error,
    );
  }
}

export class NeonRecipeRepository implements RecipeRepository {
  async getAll(): Promise<RecipeData[]> {
    const recipes = await runRemoteQuery(() => sql`
      SELECT *
      FROM recipes
      ORDER BY created_at DESC
    `);

    return parseRecipes(recipes);
  }

  async getById(id: number): Promise<RecipeData | null> {
    let recipeId: number;

    try {
      recipeId = RecipeIdSchema.parse(id);
    } catch (error) {
      throw validationError("Die Rezept-ID ist ungültig.", error);
    }

    const rows = await runRemoteQuery(() => sql`
      SELECT *
      FROM recipes
      WHERE id = ${recipeId}
      LIMIT 1
    `);
    const parsedRows = parseRecipes(rows);

    return parsedRows[0] ?? null;
  }

  async search(query: string): Promise<RecipeData[]> {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return [];
    }

    const pattern = `%${normalizedQuery}%`;
    const recipes = await runRemoteQuery(() => sql`
      SELECT *
      FROM recipes
      WHERE
        title ILIKE ${pattern}
        OR original_title ILIKE ${pattern}
        OR category ILIKE ${pattern}
        OR ingredients ILIKE ${pattern}
        OR notes ILIKE ${pattern}
        OR tags ILIKE ${pattern}
      ORDER BY created_at DESC
      LIMIT 50
    `);

    return parseRecipes(recipes);
  }
}
