"use client";

import { useEffect, useState } from "react";
import KitchenMasterExperience from "@/components/KitchenMasterExperience";
import {
  RECIPES_SYNCHRONIZED_EVENT,
  ensureLocalRecipesInitialized,
} from "@/components/RecipeBootstrap";
import { LocalFirstRecipeFacade } from "@/lib/recipes/facade.client";
import type { RecipeData } from "@/schemas/recipeSchema";

type RecipeExperienceState =
  | { status: "loading"; recipes: RecipeData[] }
  | { status: "ready"; recipes: RecipeData[] }
  | { status: "empty"; recipes: RecipeData[] }
  | { status: "error"; recipes: RecipeData[] };

const recipeRepository = new LocalFirstRecipeFacade();

export default function RecipeExperienceClient() {
  const [state, setState] = useState<RecipeExperienceState>({
    status: "loading",
    recipes: [],
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      let bootstrapFailed = false;

      try {
        await ensureLocalRecipesInitialized();
      } catch {
        bootstrapFailed = true;
      }

      try {
        const recipes = await recipeRepository.getAll();
        if (!active) return;

        if (recipes.length > 0) {
          setState({ status: "ready", recipes });
        } else if (bootstrapFailed) {
          setState({ status: "error", recipes: [] });
        } else {
          setState({ status: "empty", recipes: [] });
        }
      } catch {
        if (active) {
          setState({ status: "error", recipes: [] });
        }
      }
    };

    void load();
    const reload = () => void load();
    window.addEventListener(RECIPES_SYNCHRONIZED_EVENT, reload);

    return () => {
      active = false;
      window.removeEventListener(RECIPES_SYNCHRONIZED_EVENT, reload);
    };
  }, []);

  return (
    <KitchenMasterExperience recipes={state.recipes} status={state.status} />
  );
}
