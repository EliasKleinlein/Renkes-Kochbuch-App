"use client";

import { CookingPot, ScrollText, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

type ChineseRecipe = {
  id: number;
  title: string;
  originalTitle: string;
  image: string;
  ingredients: string[];
  preparation: string[];
};

export default function ChineseRecipeCollection({
  recipes,
}: {
  recipes: ChineseRecipe[];
}) {
  const [activeRecipe, setActiveRecipe] = useState<ChineseRecipe | null>(null);

  useEffect(() => {
    if (!activeRecipe) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveRecipe(null);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [activeRecipe]);

  return (
    <>
      <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
        {recipes.map((recipe) => (
          <button
            key={recipe.id}
            type="button"
            onClick={() => setActiveRecipe(recipe)}
            className="chinese-recipe-card paper-panel fantasy-shine-card group flex flex-col overflow-hidden rounded-[1.6rem] border border-[#8f291f]/60 text-left shadow-[0_18px_45px_rgba(0,0,0,.35)] transition duration-300 hover:-translate-y-2 hover:rotate-[.25deg]"
          >
            <div className="relative aspect-[4/3] overflow-hidden border-b border-[#8f291f]/35 bg-[#24100c]">
              <Image
                src={recipe.image}
                alt={recipe.title}
                fill
                unoptimized
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                className="object-cover saturate-[.9] transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#170806]/75 via-transparent to-transparent" />
              <span className="absolute left-4 top-4 rounded-full border border-[#f1c76c]/45 bg-[#6f1712]/85 px-3 py-1.5 text-xs font-bold text-[#ffe7a7] backdrop-blur">
                Chinesische Küche
              </span>
            </div>

            <div className="relative p-6 text-[#3b2718]">
              <ScrollText
                className="absolute right-5 top-5 rotate-6 text-[#a52d20]/20"
                size={48}
                strokeWidth={1.2}
                aria-hidden="true"
              />
              <p className="max-w-[80%] text-lg font-bold tracking-[.08em] text-[#8b2019]">
                {recipe.originalTitle}
              </p>
              <h2 className="fantasy-title mt-2 text-3xl font-bold leading-[1.02] text-[#3a2415]">
                {recipe.title}
              </h2>
              <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold text-[#654328]">
                <span className="flex items-center gap-1.5 rounded-full border border-[#80512a]/20 bg-[#7f5128]/[.08] px-3 py-1.5">
                  <CookingPot size={15} /> {recipe.ingredients.length} Zutaten
                </span>
                <span className="flex items-center gap-1.5 rounded-full border border-[#80512a]/20 bg-[#7f5128]/[.08] px-3 py-1.5">
                  <ScrollText size={15} /> {recipe.preparation.length} Schritte
                </span>
              </div>
              <p className="mt-5 border-l-2 border-[#a82b20] pl-3 font-serif text-sm italic leading-6 text-[#674a35]">
                {recipe.preparation[0]}
              </p>
              <div className="mt-5 font-bold text-[#94261c] transition group-hover:translate-x-1">
                Rezept öffnen →
              </div>
            </div>
          </button>
        ))}
      </div>

      {activeRecipe && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[#05080d]/85 p-4 backdrop-blur-sm sm:p-8"
          onClick={() => setActiveRecipe(null)}
          role="presentation"
        >
          <article
            role="dialog"
            aria-modal="true"
            aria-labelledby="chinese-recipe-title"
            onClick={(event) => event.stopPropagation()}
            className="paper-panel relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[1.8rem] border border-[#b7412e]/60 shadow-[0_30px_90px_rgba(0,0,0,.65)]"
          >
            <button
              type="button"
              onClick={() => setActiveRecipe(null)}
              aria-label="Rezept schließen"
              className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full border border-[#f1c76c]/45 bg-[#681912]/90 text-[#ffe6a4] transition hover:scale-105 hover:bg-[#842218]"
            >
              <X size={22} />
            </button>

            <div className="relative aspect-[16/7] min-h-56 overflow-hidden rounded-t-[1.7rem] border-b border-[#8f291f]/35">
              <Image
                src={activeRecipe.image}
                alt={activeRecipe.title}
                fill
                unoptimized
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a0907]/90 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 p-6 text-[#fff0c5] sm:p-8">
                <p className="text-xl font-bold tracking-[.12em] text-[#ffd779]">
                  {activeRecipe.originalTitle}
                </p>
                <h2
                  id="chinese-recipe-title"
                  className="fantasy-title mt-1 text-4xl font-bold leading-none sm:text-6xl"
                >
                  {activeRecipe.title}
                </h2>
              </div>
            </div>

            <div className="grid gap-10 p-6 text-[#3b2718] sm:p-9 lg:grid-cols-[.9fr_1.4fr]">
              <section>
                <h3 className="fantasy-title text-4xl font-bold text-[#842218]">
                  Zutaten
                </h3>
                <ul className="mt-5 space-y-3 font-serif leading-7">
                  {activeRecipe.ingredients.map((ingredient) => (
                    <li key={ingredient} className="flex gap-3">
                      <span className="mt-2.5 h-2 w-2 shrink-0 rotate-45 bg-[#b43a27]" />
                      <span>{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="fantasy-title text-4xl font-bold text-[#842218]">
                  Zubereitung
                </h3>
                <ol className="mt-5 space-y-4 font-serif leading-7">
                  {activeRecipe.preparation.map((step, index) => (
                    <li key={step} className="flex gap-4">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#7d1e17] text-sm font-bold text-[#ffe8ad]">
                        {index + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </article>
        </div>
      )}
    </>
  );
}
