import Image from "next/image";
import { getChristophusTip } from "@/data/recipe-advice";

type ChristophusAdviceProps = {
  title: string;
  category: string;
  tags?: string | null;
};

function getAdvice(
  title: string,
  category: string,
  tags?: string | null,
) {
  return getChristophusTip(title, category, tags);
}

export default function ChristophusAdvice({
  title,
  category,
  tags,
}: ChristophusAdviceProps) {
  const advice = getAdvice(title, category, tags);

  return (
    <aside
      className="mx-auto mt-1 flex max-w-2xl flex-col items-start sm:flex-row sm:items-end"
      aria-label="Christophus prüft das Rezept"
    >
      <div className="relative h-44 w-40 shrink-0 sm:h-52 sm:w-48">
        <Image
          src="/images/kitchen-masters/christophus.webp"
          alt="Der Drache Christophus als aufmerksamer Fehlerfinder"
          fill
          unoptimized
          sizes="(max-width: 640px) 160px, 192px"
          className="object-contain object-bottom drop-shadow-[0_12px_18px_rgba(36,24,10,.3)]"
        />
      </div>

      <div className="relative z-10 mb-5 max-w-md rounded-[1.5rem] border-2 border-[#705a2a] bg-[#f4ecd2]/95 px-5 py-4 text-[#30291d] shadow-[0_12px_30px_rgba(52,43,24,.22)] sm:mb-8 sm:ml-[-1rem]">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-[#75602f]">
          <span aria-hidden="true">🐉</span>
          Christophus prüft nach
        </div>

        <p className="mt-2 font-serif text-base font-bold italic leading-6 sm:text-lg">
          „{advice}“
        </p>

        <span
          className="absolute -bottom-3 left-10 h-6 w-6 rotate-45 border-b-2 border-r-2 border-[#705a2a] bg-[#f4ecd2] sm:-left-3 sm:bottom-8 sm:border-b-0 sm:border-l-2 sm:border-r-0 sm:border-t-2"
          aria-hidden="true"
        />
      </div>
    </aside>
  );
}
