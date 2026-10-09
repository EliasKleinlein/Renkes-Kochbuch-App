import "server-only";

import { createHash } from "node:crypto";
import type { RecipeData } from "@/schemas/recipeSchema";
import { serializeRecipes } from "@/lib/recipes/serialization";

export function createRecipeDatasetVersion(
  recipes: readonly RecipeData[],
): string {
  const canonicalSnapshot = serializeRecipes(recipes)
    .sort((left, right) => left.id - right.id)
    .map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      original_title: recipe.original_title,
      category: recipe.category,
      duration: recipe.duration,
      servings: recipe.servings,
      image: recipe.image,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      notes: recipe.notes,
      tags: recipe.tags,
      created_at: recipe.created_at,
    }));
  const digest = createHash("sha256")
    .update(JSON.stringify(canonicalSnapshot))
    .digest("hex");

  return `sha256:${digest}`;
}
