import Image from "next/image";
import Link from "next/link";
import { ChefHat, Clock3, ScrollText, UsersRound } from "lucide-react";
import type { RecipeData } from "@/schemas/recipeSchema";

type RecipeCardProps = Pick<
  RecipeData,
  "id" | "title" | "category" | "duration" | "servings" | "notes" | "image"
> & {
  originalTitle: RecipeData["original_title"];
};

export default function RecipeCard({ id, title, originalTitle, category, duration, servings, notes, image }: RecipeCardProps) {
  const masterText =
    `${title} ${originalTitle} ${category}`.toLowerCase();

  const isWalter =
    /brot|brötchen|broetchen|focaccia|baguette|ciabatta|hefe|laib|backstube/.test(
      masterText,
    );

  const isMalte =
    /kuchen|käsekuchen|kaesekuchen|torte|dessert|brownie|brownies|keks|kekse|cookie|cookies|pancake|pancakes|schokolade|schoko|tiramisu|mousse|crumble|tarte|süß|suess|gebäck|gebaeck|cannabis-brownies/.test(
      masterText,
    );

  const isCannabisBrownie =
    masterText.includes("cannabis-brownies");

  const master = isCannabisBrownie
    ? "cannabis"
    : isWalter
      ? "walter"
      : isMalte
        ? "malte"
        : "renke";

  const isMujuSpecialRecipe = title.includes("Cannabis-Brownies à la Muju");

  const displayCategory = isMujuSpecialRecipe
    ? "Maltes Spezialrezept"
    : category;

  const displayOriginalTitle = isMujuSpecialRecipe
    ? "Maltes persönliches Cannabis-Brownie-Rezept"
    : originalTitle;

  const displayTitle = isMujuSpecialRecipe
    ? "Maltes Cannabis-Brownies à la Muju"
    : title;

  return (
    <Link data-master={master} href={`/recipes/${id}`} className="paper-panel fantasy-shine-card group block overflow-hidden rounded-[1.6rem] border border-[#7d4f25]/60 shadow-[0_18px_45px_rgba(0,0,0,.35)] transition duration-300 hover:-translate-y-2 hover:rotate-[.25deg] hover:shadow-[0_24px_55px_rgba(218,145,44,.2)]">
      <div className="relative aspect-[4/3] overflow-hidden border-b border-[#815126]/35 bg-[radial-gradient(circle_at_50%_42%,#d99a3d_0%,#75401f_38%,#17101a_100%)]">
        {image ? (
          <Image src={image} alt={originalTitle} fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover saturate-[.82] transition duration-700 group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <div className="absolute inset-5 rounded-[50%] border border-[#ffd984]/25 bg-[repeating-radial-gradient(circle_at_center,transparent_0_18px,rgba(255,220,147,.08)_19px_20px)]" />
            <div className="relative grid h-28 w-28 place-items-center rounded-full border border-[#f2ce7d]/35 bg-[#25150f]/65 text-[#f0c86f] shadow-[0_0_35px_rgba(245,173,55,.24)]">
              <ChefHat size={54} strokeWidth={1.2} aria-hidden="true" />
            </div>
            <span className="absolute bottom-4 rounded-full bg-black/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#f1d89f]">Fantasy-Illustration folgt</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#170d08]/75 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded-full border border-[#f4d18d]/35 bg-[#27160e]/80 px-3 py-1.5 text-xs font-bold text-[#f4d18d] backdrop-blur">{displayCategory}</span>
      </div>

      <div className="relative p-6 text-[#3b2718]">
        <ScrollText className="absolute right-5 top-5 rotate-6 text-[#a36a2c]/24" size={48} strokeWidth={1.2} aria-hidden="true" />
        <p className="max-w-[80%] text-xs font-bold uppercase tracking-[.18em] text-[#925421]">{displayOriginalTitle}</p>
        <h2 className="fantasy-title mt-2 text-3xl font-bold leading-[1.02] text-[#3a2415]">{displayTitle}</h2>
        <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold text-[#654328]">
          <span className="flex items-center gap-1.5 rounded-full border border-[#80512a]/20 bg-[#7f5128]/[.08] px-3 py-1.5"><Clock3 size={15} /> {duration} Min.</span>
          <span className="flex items-center gap-1.5 rounded-full border border-[#80512a]/20 bg-[#7f5128]/[.08] px-3 py-1.5"><UsersRound size={15} /> {servings} Portionen</span>
        </div>
        {notes && <p className="mt-5 border-l-2 border-[#bc782f] pl-3 font-serif text-sm italic leading-6 text-[#674a35]">„{notes}“</p>}
        <div className="mt-5 font-bold text-[#8e4d1e] transition group-hover:translate-x-1">Rezept öffnen →</div>
      </div>
    </Link>
  );
}
