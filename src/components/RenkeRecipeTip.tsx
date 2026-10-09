import Image from "next/image";
import ChristophusAdvice from "@/components/ChristophusAdvice";
import { getMasterTip } from "@/data/recipe-advice";

type MasterId = "renke" | "walter" | "malte";

type TipProps = {
  title: string;
  category: string;
  tags?: string | null;
};

const MASTER_META: Record<
  MasterId,
  {
    label: string;
    image: string;
    alt: string;
    fallbackTip: string;
  }
> = {
  renke: {
    label: "Renkes Tipp",
    image: "/images/renke-tip-sticker.webp",
    alt: "Renke als gezeichneter Koch mit erhobenem Zeigefinger",
    fallbackTip: "Erst lesen, dann würzen – Debugging schmeckt rückwärts nicht besser.",
  },
  walter: {
    label: "Walters Backstuben-Tipp",
    image: "/images/walter-tip-sticker.webp",
    alt: "Walter als gezeichneter Bäcker mit freundlichem Hinweis",
    fallbackTip: "Gib dem Teig Zeit – gute Kruste entsteht nicht im Schnellmodus.",
  },
  malte: {
    label: "Maltes Konditor-Tipp",
    image: "/images/malte-tip-sticker.webp",
    alt: "Malte als gezeichneter Konditor mit süßem Expertenrat",
    fallbackTip: "Bei Süßem gilt: lieber mit Gefühl verfeinern als blind überzuckern.",
  },
};

const BAKER_WORDS =
  /brot|backstube|brötchen|focaccia|baguette|ciabatta|hefe|laib|kruste|teig/i;

const PASTRY_WORDS =
  /kuchen|torte|dessert|brownie|brownies|keks|kekse|cookie|cookies|pancake|pancakes|süß|suess|schokolade|gebäck|gebaeck|tarte|käsekuchen|kaesekuchen|schoko/i;

function chooseMaster(title: string, category: string, tags?: string | null): MasterId {
  const text = `${title} ${category} ${tags ?? ""}`.toLowerCase();

  if (BAKER_WORDS.test(text)) return "walter";
  if (PASTRY_WORDS.test(text)) return "malte";
  return "renke";
}

function getTip(
  title: string,
  category: string,
  tags?: string | null,
) {
  return getMasterTip(title, category, tags);
}

export default function RenkeRecipeTip({ title, category, tags }: TipProps) {
  const master = chooseMaster(title, category, tags);
  const meta = MASTER_META[master];
  const tip = getTip(title, category, tags);

  return (
    <>
      <aside
      className="ml-auto mt-12 flex max-w-2xl flex-col items-end justify-end sm:flex-row sm:items-end"
      aria-label={`${meta.label} zur Rezeptseite`}
    >
      <div className="relative z-10 mb-[-.5rem] max-w-md rounded-[1.5rem] border-2 border-[#9a5c25] bg-[#fff1c6]/95 px-5 py-4 text-[#432818] shadow-[0_12px_30px_rgba(61,31,12,.24)] sm:mb-12 sm:mr-[-1.1rem]">
        <div className="text-xs font-black uppercase tracking-[.2em] text-[#a05b20]">{meta.label}</div>
        <p className="mt-2 font-serif text-base font-bold leading-6 sm:text-lg">{tip}</p>
        <span
          className="absolute -bottom-3 right-10 h-6 w-6 rotate-45 border-b-2 border-r-2 border-[#9a5c25] bg-[#fff1c6] sm:-right-3 sm:bottom-8"
          aria-hidden="true"
        />
      </div>

      <div className="relative h-56 w-48 shrink-0 sm:h-64 sm:w-56">
        <Image
          src={meta.image}
          alt={meta.alt}
          fill
          unoptimized
          sizes="(max-width: 640px) 192px, 224px"
          className="object-contain object-bottom drop-shadow-[0_12px_16px_rgba(57,27,8,.3)]"
        />
      </div>
      </aside>

      <ChristophusAdvice
        title={title}
        category={category}
        tags={tags}
      />
    </>
  );
}
