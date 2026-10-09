"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  CookingPot,
  ScrollText,
  UsersRound,
} from "lucide-react";
import RenkeRecipeTip from "@/components/RenkeRecipeTip";
import { ensureLocalRecipesInitialized } from "@/components/RecipeBootstrap";
import { LocalFirstRecipeFacade } from "@/lib/recipes/facade.client";
import {
  RecipeIdSchema,
  type RecipeData,
} from "@/schemas/recipeSchema";

type DetailState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "missing" }
  | { status: "error" }
  | { status: "ready"; recipe: RecipeData };

const recipeRepository = new LocalFirstRecipeFacade();

function DetailStatus({ status }: { status: Exclude<DetailState["status"], "ready"> }) {
  const message =
    status === "loading"
      ? "Das Rezeptbuch wird geöffnet …"
      : status === "invalid"
        ? "Diese Rezeptnummer ist ungültig."
        : status === "missing"
          ? "Dieses Rezept ist lokal nicht vorhanden."
          : "Das lokale Rezeptbuch konnte nicht gelesen werden.";

  return (
    <main className="mx-auto max-w-7xl px-3 py-12 sm:px-8 sm:py-20">
      <Link
        href="/#rezepte"
        className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-[#e8bd68] hover:text-[#ffe09a]"
      >
        <ArrowLeft size={17} /> Zurück zu den Rezepten
      </Link>
      <div className="paper-panel mx-auto max-w-3xl rounded-3xl p-10 text-center text-[#4c3321]">
        <CookingPot className="mx-auto mb-4" size={42} />
        <p className="fantasy-title text-3xl">{message}</p>
      </div>
    </main>
  );
}

function ValidRecipeDetail({ id }: { id: number }) {
  const [state, setState] = useState<DetailState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    void (async () => {
      let bootstrapFailed = false;

      try {
        await ensureLocalRecipesInitialized();
      } catch {
        bootstrapFailed = true;
      }

      try {
        const recipe = await recipeRepository.getById(id);
        if (!active) return;

        if (recipe !== null) {
          setState({ status: "ready", recipe });
        } else {
          setState({ status: bootstrapFailed ? "error" : "missing" });
        }
      } catch {
        if (active) {
          setState({ status: "error" });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  if (state.status !== "ready") {
    return <DetailStatus status={state.status} />;
  }

  const { recipe } = state;
  const ingredients = recipe.ingredients.split("\n").filter(Boolean);
  const instructions = recipe.instructions.split("\n").filter(Boolean);

  return (
    <main className="mx-auto max-w-7xl px-3 py-12 sm:px-8 sm:py-20">
      <Link href="/#rezepte" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-[#e8bd68] hover:text-[#ffe09a]"><ArrowLeft size={17} /> Zurück zu den Rezepten</Link>
      <article className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-[9%] py-[10%] shadow-[0_30px_80px_rgba(0,0,0,.58)] sm:px-[11%] sm:py-[9%]">
        <Image
          src="/images/recipe-parchment.webp"
          alt=""
          fill
          unoptimized
          priority
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="z-0 object-fill"
        />
        <div className="relative z-10 text-[#352013]">
        <p className="text-sm font-bold uppercase tracking-[.22em] text-[#9a5c25]">{recipe.original_title} · {recipe.category}</p>
        <h1 className="fantasy-title mt-3 max-w-4xl text-5xl font-bold leading-none text-[#352013] sm:text-7xl">{recipe.title}</h1>
        <div className="mt-7 flex flex-wrap gap-3 text-[#604026]">
          <span className="flex items-center gap-2 rounded-full border border-[#7b4d27]/20 bg-[#7b4d27]/[.08] px-4 py-2 font-bold"><Clock3 size={18} /> {recipe.duration} Minuten</span>
          <span className="flex items-center gap-2 rounded-full border border-[#7b4d27]/20 bg-[#7b4d27]/[.08] px-4 py-2 font-bold"><UsersRound size={18} /> {recipe.servings} Portionen</span>
        </div>
        {recipe.notes && <blockquote className="mt-8 border-l-4 border-[#c57b2a] bg-[#ba7628]/[.08] p-5 font-serif text-lg italic text-[#67462f]">„{recipe.notes}“</blockquote>}

        {recipe.image && (
          <div className="relative mt-10 aspect-[3/2] overflow-hidden rounded-[1.5rem] border border-[#815126]/45 bg-[#25150f] shadow-[0_18px_45px_rgba(67,35,12,.28)]">
            <Image
              src={recipe.image}
              alt={`Gezeichnete Fantasy-Illustration von ${recipe.original_title}`}
              fill
              unoptimized
              priority
              sizes="(max-width: 1152px) 100vw, 1024px"
              className="object-cover"
            />
            <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_35px_rgba(35,17,8,.28)]" />
          </div>
        )}

        <div className="mt-10 grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <section className="rounded-2xl border border-[#79502c]/20 bg-[#fff6db]/45 p-6">
            <h2 className="fantasy-title flex items-center gap-3 text-4xl font-bold"><CookingPot size={28} /> Zutaten</h2>
            <ul className="mt-5 space-y-3 font-serif text-lg">{ingredients.map((item) => <li key={item} className="flex gap-3"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-[#a36327]" />{item}</li>)}</ul>
          </section>
          <section className="rounded-2xl border border-[#79502c]/20 bg-[#fff6db]/45 p-6">
            <h2 className="fantasy-title flex items-center gap-3 text-4xl font-bold"><ScrollText size={28} /> Zubereitung</h2>
            <ol className="mt-5 space-y-4 font-serif text-lg leading-8">{instructions.map((step, index) => <li key={`${index}-${step}`} className="grid grid-cols-[2rem_1fr] gap-3"><span className="fantasy-title text-2xl font-bold text-[#a36327]">{index + 1}.</span><span>{step}</span></li>)}</ol>
          </section>
        </div>
        <RenkeRecipeTip title={recipe.title} category={recipe.category} tags={recipe.tags} />
        </div>
      </article>
    </main>
  );
}

export default function RecipeDetailClient({ id }: { id: string }) {
  const parsedId = RecipeIdSchema.safeParse(Number(id));

  if (!parsedId.success) {
    return <DetailStatus status="invalid" />;
  }

  return <ValidRecipeDetail key={parsedId.data} id={parsedId.data} />;
}
