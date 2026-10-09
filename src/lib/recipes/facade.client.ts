import type { RecipeData } from "@/schemas/recipeSchema";
import type {
  LocalRecipeRepository,
  RecipeRepository,
} from "@/lib/recipes/contract";
import { IndexedDbLocalRecipeRepository } from "@/lib/recipes/local-repository.client";

export class LocalFirstRecipeFacade implements RecipeRepository {
  constructor(
    private readonly localRepository: LocalRecipeRepository =
      new IndexedDbLocalRecipeRepository(),
  ) {}

  getAll(): Promise<RecipeData[]> {
    return this.localRepository.getAll();
  }

  getById(id: number): Promise<RecipeData | null> {
    return this.localRepository.getById(id);
  }

  search(query: string): Promise<RecipeData[]> {
    return this.localRepository.search(query);
  }
}
