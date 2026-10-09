import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative mx-auto flex w-full justify-center px-4 py-8 sm:px-6">
      <Image
        src="/images/hero/renkes-kochbuch-container-neu-final.png"
        alt="Renkes Kochbuch mit Renke und Christophus"
        unoptimized
        width={1102}
        height={1376}
        priority
        sizes="(max-width: 768px) 92vw, 850px"
        className="block h-auto w-full max-w-[850px]"
      />
    </section>
  );
}
