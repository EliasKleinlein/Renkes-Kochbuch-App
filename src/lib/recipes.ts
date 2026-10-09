import "server-only";

import { NeonRecipeRepository } from "@/lib/recipes/remote-repository.server";

const recipeRepository = new NeonRecipeRepository();

export async function getRecipes() {
  return recipeRepository.getAll();
}

export async function searchRecipes(query: string) {
  return recipeRepository.search(query);
}

export async function getRecipeById(id: number) {
  return recipeRepository.getById(id);
}
