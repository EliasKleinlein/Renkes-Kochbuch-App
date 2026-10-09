import { NextResponse } from "next/server";
import { RecipeRepositoryError } from "@/lib/recipes/errors";
import { NeonRecipeRepository } from "@/lib/recipes/remote-repository.server";
import { createRecipeSyncWireSnapshot } from "@/lib/recipes/sync/contract";
import { createRecipeDatasetVersion } from "@/lib/recipes/sync/dataset-version.server";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const recipes = await new NeonRecipeRepository().getAll();
    const datasetVersion = createRecipeDatasetVersion(recipes);

    return NextResponse.json(
      createRecipeSyncWireSnapshot(recipes, datasetVersion),
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    const status =
      error instanceof RecipeRepositoryError && error.code === "VALIDATION"
        ? 500
        : 503;

    return NextResponse.json(
      { error: "Die Rezeptdaten konnten nicht synchronisiert werden." },
      { status, headers: NO_STORE_HEADERS },
    );
  }
}
