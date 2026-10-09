import Image from "next/image";
import Link from "next/link";

export default function GiftButton() {
  return (
    <div className="flex items-end justify-center gap-1 sm:justify-end">
      <div
        tabIndex={0}
        aria-label="Christophus sagt: Der Kessel weiß mehr, als er verrät …"
        className="group/dragon relative z-10 h-36 w-28 shrink-0 cursor-help focus-visible:rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f1c76c]"
      >
        <div
          role="tooltip"
          className="pointer-events-none absolute bottom-[94%] left-[calc(100%+4.75rem)] z-30 w-max max-w-[13rem] -translate-x-1/2 translate-y-2 rounded-2xl border border-[#e7bc66]/70 bg-[#fff0c9] px-4 py-2 text-center font-serif text-sm font-bold text-[#4a2b16] opacity-0 shadow-[0_10px_30px_rgba(0,0,0,.4)] transition duration-300 group-hover/dragon:translate-y-0 group-hover/dragon:opacity-100 group-focus-visible/dragon:translate-y-0 group-focus-visible/dragon:opacity-100"
        >
          Der Kessel weiß mehr, als er verrät …{" "}
          <span aria-hidden="true">✨</span>
          <span className="absolute -bottom-[.7rem] left-4 h-6 w-7 -rotate-[28deg] bg-[#fff0c9] [clip-path:polygon(0_0,100%_0,0_100%)]" />
        </div>
        <Image
          src="/images/CHR.webp"
          alt="Der kleine Küchendrache Christophus"
          fill
          unoptimized
          sizes="112px"
          className="object-contain object-bottom drop-shadow-[0_10px_16px_rgba(0,0,0,.38)] transition duration-300 group-hover/dragon:-translate-y-1 group-hover/dragon:scale-105 group-focus-visible/dragon:-translate-y-1 group-focus-visible/dragon:scale-105"
        />
      </div>

      <Link
        href="/danke-renke"
        aria-label="Magisches Dankesbuch für Renke öffnen"
        className="group relative block h-28 w-36 shrink-0 transition duration-300 hover:-translate-y-2 hover:rotate-3 hover:scale-105 focus-visible:rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f1c76c]"
      >
        <Image
          src="/images/magietrank-kessel-button.webp"
          alt=""
          fill
          unoptimized
          sizes="144px"
          className="object-contain drop-shadow-[0_0_24px_rgba(185,255,78,.38)] transition duration-300 group-hover:brightness-110 group-hover:drop-shadow-[0_0_34px_rgba(194,255,91,.68)]"
        />
      </Link>
    </div>
  );
}
