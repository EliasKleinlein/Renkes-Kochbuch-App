"use client";

import { useEffect } from "react";
import type { LocalRecipeRepository } from "@/lib/recipes/contract";
import { IndexedDbLocalRecipeRepository } from "@/lib/recipes/local-repository.client";
import { syncRecipes } from "@/lib/recipes/sync/orchestrator.client";
import { requestDetailPagePrecache } from "@/lib/offline/detail-precache.client";

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

// Wird nach einem erfolgreichen (Erneut-)Abgleich ausgeloest, damit Listen neu laden.
export const RECIPES_SYNCHRONIZED_EVENT = "renkes:recipes-synchronized";

let sharedBootstrapPromise: Promise<"ready" | "synchronized"> | null = null;

export function ensureLocalRecipesInitialized(): Promise<
  "ready" | "synchronized"
> {
  if (sharedBootstrapPromise === null) {
    const attempt = initializeLocalRecipes();
    sharedBootstrapPromise = attempt;
    attempt.then(
      (result) => {
        if (result === "synchronized" && typeof window !== "undefined") {
          window.dispatchEvent(new Event(RECIPES_SYNCHRONIZED_EVENT));
        }
      },
      () => {
        // Gescheiterter Versuch wird nicht festgehalten: ein spaeterer Aufruf versucht es erneut.
        if (sharedBootstrapPromise === attempt) {
          sharedBootstrapPromise = null;
        }
      },
    );
  }

  return sharedBootstrapPromise;
}

export default function RecipeBootstrap() {
  useEffect(() => {
    const initialize = () => {
      void ensureLocalRecipesInitialized()
        .then(async () => {
          const recipes = await new IndexedDbLocalRecipeRepository().getAll();
          await requestDetailPagePrecache(recipes.map((recipe) => recipe.id));
        })
        .catch((error: unknown) => {
          console.error("Die lokale Rezeptinitialisierung ist fehlgeschlagen.", error);
        });
    };

    initialize();
    // Nach einem gescheiterten Erststart ohne Netz erneut versuchen, sobald die Verbindung zurueck ist.
    window.addEventListener("online", initialize);
    return () => window.removeEventListener("online", initialize);
  }, []);

  return null;
}
