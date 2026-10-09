"use client";

import { useEffect } from "react";
import type { LocalRecipeRepository } from "@/lib/recipes/contract";
import { IndexedDbLocalRecipeRepository } from "@/lib/recipes/local-repository.client";
import { syncRecipes } from "@/lib/recipes/sync/orchestrator.client";

type BootstrapLocalRepository = Pick<
  LocalRecipeRepository,
  "getAll" | "getMetadata"
>;

export async function initializeLocalRecipes(
  localRepository: BootstrapLocalRepository =
    new IndexedDbLocalRecipeRepository(),
  synchronize: () => Promise<unknown> = syncRecipes,
): Promise<"ready" | "synchronized"> {
  const [metadata, recipes] = await Promise.all([
    localRepository.getMetadata(),
    localRepository.getAll(),
  ]);

  if (metadata === null || recipes.length === 0) {
    await synchronize();
    return "synchronized";
  }

  return "ready";
}

let sharedBootstrapPromise: Promise<"ready" | "synchronized"> | null = null;

export function ensureLocalRecipesInitialized(): Promise<
  "ready" | "synchronized"
> {
  if (sharedBootstrapPromise === null) {
    sharedBootstrapPromise = initializeLocalRecipes();
  }

  return sharedBootstrapPromise;
}

export default function RecipeBootstrap() {
  useEffect(() => {
    void ensureLocalRecipesInitialized().catch((error: unknown) => {
      console.error("Die lokale Rezeptinitialisierung ist fehlgeschlagen.", error);
    });
  }, []);

  return null;
}
