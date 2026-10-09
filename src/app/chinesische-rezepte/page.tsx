import ChineseRecipeCollection from "@/components/ChineseRecipeCollection";
import FantasyFooter from "@/components/FantasyFooter";
import Navbar from "@/components/Navbar";
import chineseRecipes from "@/data/chinese-recipes.json";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Chinesische Rezepte | Renkes Kochbuch",
  description: "20 chinesische Gerichte aus Renkes Rezeptbibliothek.",
};

export default function ChineseRecipesPage() {
  return (
    <div className="fantasy-page">
      <Navbar />
      <main className="relative">
        <section className="mx-auto max-w-[1500px] px-5 pb-6 pt-16 sm:px-8 sm:pb-8 sm:pt-24">
          <Image
            src="/images/chinese-recipes-hero-landscape-v2.webp"
            alt="Chinesische Rezeptbibliothek"
            width={2172}
            height={724}
            unoptimized
            priority
            className="h-auto w-full rounded-[2rem] shadow-[0_24px_70px_rgba(0,0,0,.38)]"
          />
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
          <ChineseRecipeCollection recipes={chineseRecipes} />
        </section>
      </main>
      <FantasyFooter />
    </div>
  );
}
