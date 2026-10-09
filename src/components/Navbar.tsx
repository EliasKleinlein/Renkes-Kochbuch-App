import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 px-1 pb-4 pt-5 sm:px-2 sm:pb-6 sm:pt-8 xl:-mb-48 2xl:-mb-[225px]">
      <nav
        aria-label="Hauptnavigation"
        className="relative mx-auto flex aspect-[1774/887] w-full max-w-[1500px] items-center justify-center gap-3 px-3 py-2 text-[#3b2514] sm:justify-between sm:px-6 sm:py-3 lg:px-10 xl:[clip-path:inset(0_0_10%_0)]"
        style={{
          marginTop: "calc(-1 * clamp(2.75rem, 13vw, 10.25rem))",
          backgroundImage: "url('/images/header-renkes-kochbuch.webp')",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
        }}
      >
        <Link
          href="/"
          className="group absolute left-1/2 top-[calc(31%+12px)] z-10 aspect-[1978/653] w-[45%] origin-[81%_18%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[40%] transition-transform duration-500 ease-out hover:-rotate-[4deg]"
          style={{ position: "relative" }}
          aria-label="Renkes Kochbuch – Startseite"
        >
          <Image
            src="/images/header-home-sign.webp"
            alt=""
            unoptimized
            fill
            sizes="(max-width: 1500px) 45vw, 675px"
            className="object-contain transition duration-300 group-hover:brightness-110"
          />
        </Link>

        <Link
          href="/stickers"
          aria-label="Sticker"
          className="group absolute right-[3%] top-[calc(36%+12px)] z-20 aspect-[1122/1378] w-[22%] origin-[82%_5%] overflow-hidden rounded-[15%] transition-transform duration-500 ease-out hover:-rotate-[4deg] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c451e] sm:w-[17%] lg:w-[15%]"
          style={{ position: "absolute" }}
        >
          <Image
            src="/images/storytime-sticker-button.webp"
            alt=""
            unoptimized
            fill
            sizes="(max-width: 640px) 22vw, (max-width: 1024px) 17vw, 15vw"
            className="object-contain transition duration-300 group-hover:brightness-110"
          />
        </Link>

        <Link
          href="/#rezepte"
          aria-label="Rezepte"
          className="group absolute right-[3%] top-[calc(55%+60px)] z-[19] aspect-[1099/906] w-[22%] origin-[82%_5%] overflow-hidden rounded-[15%] transition-transform duration-500 ease-out hover:-rotate-[4deg] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c451e] sm:w-[17%] lg:w-[15%]"
          style={{ position: "absolute" }}
        >
          <Image
            src="/images/recipes-hanging-button.webp"
            alt=""
            unoptimized
            fill
            sizes="(max-width: 640px) 22vw, (max-width: 1024px) 17vw, 15vw"
            className="object-contain transition duration-300 group-hover:brightness-110"
          />
        </Link>

        <Link
          href="/chinesische-rezepte"
          aria-label="Chinesische Rezepte"
          className="group absolute left-[calc(3%-16px)] top-[calc(36%+24px)] z-20 aspect-[1120/819] w-[27%] origin-[82%_5%] overflow-hidden rounded-[15%] transition-transform duration-500 ease-out hover:-rotate-[4deg] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c451e] sm:w-[21%] lg:w-[18%]"
          style={{ position: "absolute" }}
        >
          <Image
            src="/images/chinese-recipes-button.webp"
            alt=""
            unoptimized
            fill
            sizes="(max-width: 640px) 27vw, (max-width: 1024px) 21vw, 18vw"
            className="object-contain transition duration-300 group-hover:brightness-110"
          />
        </Link>
      </nav>
    </header>
  );
}
