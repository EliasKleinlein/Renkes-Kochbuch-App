"use client";

import GiftButton from "@/components/GiftButton";
import RecipeGrid from "@/components/RecipeGrid";
import { CookingPot, Flame, Search, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { LocalFirstRecipeFacade } from "@/lib/recipes/facade.client";
import type { RecipeData } from "@/schemas/recipeSchema";
import { OFFLINE_MESSAGES } from "@/lib/offline/messages";
import { useOnlineStatus } from "@/lib/offline/online-status";

type RecipeCardData = Pick<
  RecipeData,
  | "id"
  | "title"
  | "original_title"
  | "category"
  | "duration"
  | "servings"
  | "notes"
  | "image"
>;

type RecipeExperienceStatus = "loading" | "ready" | "empty" | "error";

type MasterId = "all" | "renke" | "walter" | "malte" | "brixel";

const MASTERS: Array<{
  id: Exclude<MasterId, "all">;
  name: string;
  role: string;
  image: string;
  glow: string;
}> = [
  {
    id: "renke",
    name: "Renke",
    role: "Herzhafte Küche",
    image: "/images/kitchen-masters/renke-portal-transparent.png",
    glow: "drop-shadow-[0_18px_22px_rgba(213,154,63,.2)]",
  },
  {
    id: "walter",
    name: "Walter",
    role: "Brot & Backstube",
    image: "/images/kitchen-masters/walter-portal-v2.webp",
    glow: "drop-shadow-[0_18px_22px_rgba(214,180,119,.2)]",
  },
  {
    id: "malte",
    name: "Malte",
    role: "Kuchen & Desserts",
    image: "/images/kitchen-masters/malte-portal-transparent.webp",
    glow: "drop-shadow-[0_18px_22px_rgba(167,70,53,.24)]",
  },
  {
    id: "brixel",
    name: "Meister Brixel",
    role: "Online-Rezeptzauber",
    image: "/images/kitchen-masters/meister-brixel-transparent.webp",
    glow: "drop-shadow-[0_18px_22px_rgba(84,116,186,.28)]",
  },
];

const WALTER_WORDS = /gebäck|brot|brötchen|backstube|baguette|pizza/i;
const MALTE_WORDS =
  /kuchen|torte|dessert|brownie|pancake|keks|muffin|süß|schokolade/i;
const recipeRepository = new LocalFirstRecipeFacade();

function recipeText(recipe: RecipeCardData) {
  return `${recipe.title} ${recipe.original_title} ${recipe.category} ${recipe.notes ?? ""}`;
}

function belongsToMaster(recipe: RecipeCardData, master: MasterId) {
  const text = recipeText(recipe);

  if (master === "walter") return WALTER_WORDS.test(text);
  if (master === "malte") return MALTE_WORDS.test(text);
  if (master === "renke")
    return !WALTER_WORDS.test(text) && !MALTE_WORDS.test(text);
  return true;
}

export default function KitchenMasterExperience({
  recipes,
  status = "ready",
}: {
  recipes: RecipeCardData[];
  status?: RecipeExperienceStatus;
}) {
  const [activeMaster, setActiveMaster] = useState<MasterId>("all");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RecipeCardData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const online = useOnlineStatus();

  const filteredRecipes = useMemo(() => {
    const sourceRecipes = submittedQuery ? searchResults : recipes;

    return sourceRecipes.filter((recipe) =>
      belongsToMaster(recipe, activeMaster),
    );
  }, [activeMaster, recipes, searchResults, submittedQuery]);

  const activeLabel = MASTERS.find(
    (master) => master.id === activeMaster,
  )?.name;
  const webSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${submittedQuery || query} Rezept`)}`;

  function chooseMaster(master: Exclude<MasterId, "all">) {
    setActiveMaster((current) => (current === master ? "all" : master));
    setSubmittedQuery("");
    if (master !== "brixel") setQuery("");
  }

  async function searchArchive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (status === "loading") {
      return;
    }

    const normalizedQuery = query.trim();

    setActiveMaster("brixel");
    setSearchError("");

    if (!normalizedQuery) {
      setSubmittedQuery("");
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const results = await recipeRepository.search(normalizedQuery);

      setSearchResults(results);
      setSubmittedQuery(normalizedQuery);

      document.querySelector("#rezepte")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch {
      setSearchError(
        "Meister Brixel konnte das Rezeptarchiv gerade nicht durchsuchen.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  function resetSelection() {
    setActiveMaster("all");
    setQuery("");
    setSubmittedQuery("");
    setSearchResults([]);
    setSearchError("");
  }

  return (
    <>
      <section
        id="kuechenmeister"
        className="mx-auto max-w-[1500px] scroll-mt-28 px-5 pb-8 pt-20 sm:px-8 sm:pt-28"
      >
        <div className="mx-auto w-full max-w-[1100px]">
          <Image
            src="/images/ui/kuechenmeister-schild.png"
            alt="Wähle deinen Küchenmeister"
            unoptimized
            width={2048}
            height={640}
            className="block h-auto w-full"
          />
        </div>

        <div className="mt-12 grid items-end gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {MASTERS.map((master) => {
            const active = activeMaster === master.id;
            return (
              <button
                key={master.id}
                data-master={master.id}
                type="button"
                onClick={() => chooseMaster(master.id)}
                aria-pressed={active}
                className={`group relative aspect-[6/7] min-w-0 w-full bg-transparent transition duration-300 hover:-translate-y-2 hover:scale-[1.025] focus-visible:rounded-[1.5rem] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f1c76c] ${master.glow} ${active ? "-translate-y-2 scale-[1.025] brightness-110 drop-shadow-[0_0_22px_rgba(245,211,130,.52)]" : ""}`}
              >
                <Image
                  src={master.image}
                  alt={`${master.name} – ${master.role}`}
                  unoptimized
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                  className="object-contain object-bottom transition duration-500 group-hover:brightness-110"
                />
                <span className="sr-only">
                  {active
                    ? "Portal geöffnet"
                    : master.id === "brixel"
                      ? "Suchzauber öffnen"
                      : "Rezepte anzeigen"}
                </span>
              </button>
            );
          })}
        </div>

        {activeMaster === "brixel" && (
          <div className="mx-auto mt-8 max-w-3xl rounded-[1.8rem] border border-[#7da2ed]/45 bg-[radial-gradient(circle_at_50%_0%,rgba(74,112,193,.34),rgba(7,17,31,.96)_64%)] p-5 shadow-[0_0_45px_rgba(70,111,205,.2)] sm:p-7">
            <div className="flex items-center gap-3 text-[#f5d88d]">
              <Search size={22} />
              <h3 className="fantasy-title text-3xl font-bold">
                Meister Brixels Suchzauber
              </h3>
            </div>
            <p className="mt-2 font-serif text-[#c9c5b8]">
              Durchsuche zuerst Renkes Archiv. Wenn dort nichts passt, öffnet
              Brixel das große Web-Archiv.
            </p>
            <form
              onSubmit={searchArchive}
              className="mt-5 flex flex-col gap-3 sm:flex-row"
            >
              <label htmlFor="brixel-query" className="sr-only">
                Gericht oder Zutaten suchen
              </label>
              <input
                id="brixel-query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Welche Zutaten hast du?"
                className="min-w-0 flex-1 rounded-full border border-[#d5b66c]/45 bg-[#fff1c9] px-5 py-3 font-serif text-[#382414] outline-none placeholder:text-[#7f6a54] focus:border-[#f0cb72] focus:ring-2 focus:ring-[#f0cb72]/35"
              />
              <button
                type="submit"
                disabled={isSearching || status === "loading"}
                className="magic-glow rounded-full bg-[#294477] px-6 py-3 font-bold text-[#fff0c1] transition hover:-translate-y-1 hover:bg-[#385a98] disabled:cursor-wait disabled:opacity-60"
              >
                {isSearching ? "Brixel sucht..." : "Archiv durchsuchen"}
              </button>
            </form>
            {searchError && (
              <p className="mt-4 rounded-xl border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-200">
                {searchError}
              </p>
            )}

            {(query || submittedQuery) && !online && (
              <p data-websearch-offline className="mt-4 text-sm font-bold text-[#f1ca72]">
                {OFFLINE_MESSAGES.webSearch}
              </p>
            )}

            {(query || submittedQuery) && online && (
              <a
                href={webSearchUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#f1ca72] underline decoration-[#f1ca72]/35 underline-offset-4 hover:text-[#ffe5a5]"
              >
                Mit „{submittedQuery || query}“ im Web weitersuchen ↗
              </a>
            )}
          </div>
        )}
      </section>

      <section
        id="rezepte"
        className="mx-auto max-w-7xl scroll-mt-28 px-5 py-20 sm:px-8 sm:py-24"
      >
        <div className="mb-12 flex flex-col gap-9 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full">
            {activeLabel ? (
              <>
                <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[.28em] text-[#dda64c]">
                  <Flame size={17} /> Aus Renkes Zauberküche
                </p>

                <h2 className="fantasy-title text-5xl font-bold leading-none text-[#fff0c5] sm:text-7xl">
                  {`${activeLabel}s Auswahl`}
                </h2>

                <div className="ornament-divider mt-5 max-w-lg">
                  <Sparkles size={17} />
                </div>
              </>
            ) : (
              <Image
                src="/images/ui/renkes-beliebteste-rezepte.png"
                alt="Renkes beliebteste Rezepte"
                unoptimized
                width={2048}
                height={768}
                priority
                className="block h-auto w-full max-w-[1250px]"
              />
            )}
            {(activeMaster !== "all" || submittedQuery) && (
              <button
                type="button"
                onClick={resetSelection}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#d2ad62]/45 bg-[#1b140f]/75 px-4 py-2 text-sm font-bold text-[#f0ce84] transition hover:bg-[#2b1e14]"
              >
                <X size={16} /> Alle Rezepte anzeigen
              </button>
            )}
          </div>
          <div className="mb-4 self-center sm:self-auto">
            <GiftButton />
          </div>
        </div>
        {status === "loading" ? (
          <div className="paper-panel rounded-3xl p-10 text-center text-[#4c3321]">
            <CookingPot className="mx-auto mb-4" size={42} />
            <p className="fantasy-title text-3xl">Das Rezeptbuch wird geöffnet …</p>
          </div>
        ) : status === "error" ? (
          <div className="paper-panel rounded-3xl p-10 text-center text-[#4c3321]">
            <CookingPot className="mx-auto mb-4" size={42} />
            <p className="fantasy-title text-3xl">Das lokale Rezeptbuch ist gerade nicht verfügbar.</p>
          </div>
        ) : (
          <RecipeGrid recipes={filteredRecipes} />
        )}
      </section>
    </>
  );
}
