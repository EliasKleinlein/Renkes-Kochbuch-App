import type { RecipeData } from "@/schemas/recipeSchema";

export interface RecipeRepository {
  getAll(): Promise<RecipeData[]>;
  getById(id: number): Promise<RecipeData | null>;
  search(query: string): Promise<RecipeData[]>;
}

export type LocalDatasetMetadata = {
  schemaVersion: number;
  datasetVersion: string;
  lastSyncAt: Date | null;
};

export interface LocalRecipeRepository extends RecipeRepository {
  replaceAll(
    recipes: readonly RecipeData[],
    metadata: LocalDatasetMetadata,
  ): Promise<void>;
  getMetadata(): Promise<LocalDatasetMetadata | null>;
  setLastSync(lastSyncAt: Date): Promise<void>;
}
