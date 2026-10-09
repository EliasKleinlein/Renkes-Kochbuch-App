import { RecipeSchema, type RecipeData } from "@/schemas/recipeSchema";

const RENKE_RECIPE_IMAGES: ReadonlyArray<{
  names: readonly string[];
  image: string;
}> = [
  {
    names: ["schweinehaxe", "404 knusperkruste"],
    image: "/images/recipes/schweinehaxe-404.webp",
  },
  {
    names: ["debugger-bolognese", "debugger bolognese"],
    image: "/images/recipes/spaghetti-debugger.webp",
  },
  {
    names: ["merge-conflict", "merge conflict"],
    image: "/images/recipes/lasagne-merge-conflict.webp",
  },
  {
    names: ["stack overflow"],
    image: "/images/recipes/kartoffelsuppe-stack-overflow.webp",
  },
  {
    names: ["boolean-beast", "boolean beast"],
    image: "/images/recipes/burger-boolean-beast.webp",
  },
  {
    names: ["commit-crash", "commit crash"],
    image: "/images/recipes/curry-commit-crash.webp",
  },
  {
    names: ["stable release"],
    image: "/images/recipes/kaesekuchen-stable-release.webp",
  },
  {
    names: ["dark mode"],
    image: "/images/recipes/schokokuchen-dark-mode.webp",
  },
  {
    names: ["runtime error"],
    image: "/images/recipes/brownies-runtime-error.webp",
  },
  {
    names: ["promise-all", "promise all"],
    image: "/images/recipes/pancakes-promise-all.webp",
  },
  {
    names: ["while-schleife", "while schleife"],
    image: "/images/recipes/wraps-while-schleife.webp",
  },
  {
    names: ["404-kekse", "404 kekse", "not found"],
    image: "/images/recipes/404-kekse-not-found.webp",
  },
];

export function normalizeRenkeRecipeImage(recipe: RecipeData): RecipeData {
  const searchableName = `${recipe.title} ${recipe.original_title}`.toLocaleLowerCase("de-DE");
  const illustration = RENKE_RECIPE_IMAGES.find(({ names }) =>
    names.some((name) => searchableName.includes(name)),
  );

  return RecipeSchema.parse(
    illustration ? { ...recipe, image: illustration.image } : recipe,
  );
}
