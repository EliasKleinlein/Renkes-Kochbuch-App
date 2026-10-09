"use client";

import { useEffect, useState } from "react";
import { OFFLINE_MESSAGES, isNetworkError, isOffline } from "@/lib/offline/messages";
import { useOnlineStatus } from "@/lib/offline/online-status";
import { motion } from "framer-motion";
import Image from "next/image";
type Person = {
  id: string;
  name: string;
  portrait?: string;
};

const people: Person[] = [
  { id: "muju", name: "Muju", portrait: "/images/class/muju.webp" },
  { id: "elias", name: "Elias", portrait: "/images/class/optimized/elias-robotik.webp" },
  { id: "eric", name: "Eric", portrait: "/images/class/eric.png" },
  { id: "marco", name: "Marco", portrait: "/images/class/marco-stafford.webp" },
  { id: "christoph", name: "Christopher", portrait: "/images/class/optimized/christoph-matrix.webp" },
  { id: "kevin", name: "Kevin", portrait: "/images/class/optimized/kevin-leetcode.webp" },
  { id: "niko", name: "Niko", portrait: "/images/class/optimized/niko.webp" },
  { id: "marlin", name: "Marlin", portrait: "/images/class/optimized/marlin.webp" },
  { id: "daniel", name: "Daniel", portrait: "/images/class/daniel.png" },
  { id: "pavel", name: "Pavel", portrait: "/images/kitchen-masters/pavel.webp" },
];

const names = people.map((person) => person.name).join(" · ");


const MESSAGE_PAGE_LIMIT = 520;

const EMPTY_MESSAGE = "Noch kein persönlicher Eintrag vorhanden. ❤️";

function paginateMessage(message: string, limit = MESSAGE_PAGE_LIMIT) {
  const normalized = message.trim();

  if (!normalized) {
    return [EMPTY_MESSAGE];
  }

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const pages: string[] = [];
  let current = "";

  function pushCurrent() {
    if (current.trim()) {
      pages.push(current.trim());
      current = "";
    }
  }

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/);
    let paragraphPart = "";

    for (const word of words) {
      const candidate = paragraphPart
        ? `${paragraphPart} ${word}`
        : word;

      if (candidate.length <= limit) {
        paragraphPart = candidate;
        continue;
      }

      if (paragraphPart) {
        const combined = current
          ? `${current}\n\n${paragraphPart}`
          : paragraphPart;

        if (combined.length <= limit) {
          current = combined;
        } else {
          pushCurrent();
          current = paragraphPart;
        }
      }

      paragraphPart = word;
    }

    if (paragraphPart) {
      const combined = current
        ? `${current}\n\n${paragraphPart}`
        : paragraphPart;

      if (combined.length <= limit) {
        current = combined;
      } else {
        pushCurrent();
        current = paragraphPart;
      }
    }
  }

  pushCurrent();

  return pages.length ? pages : [EMPTY_MESSAGE];
}


export default function ClassThankYouBook() {
  // -1 = Widmung, 0 = Muju, 1 = Elias ...
  const [page, setPage] = useState(-1);
  const [textPage, setTextPage] = useState(0);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [loadNotice, setLoadNotice] = useState("");
  const online = useOnlineStatus();

  useEffect(() => {
    people
      .map((person) => person.portrait)
      .filter((portrait): portrait is string => Boolean(portrait))
      .forEach((portrait) => {
        const img = new window.Image();
        img.src = portrait;
      });
  }, []);

  useEffect(() => {
    if (!online) {
      return;
    }

    fetch("/api/thanks")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Einträge konnten nicht geladen werden.");
        }
        return response.json();
      })
      .then((data) => {
        setMessages(data.messages ?? {});
        setLoadNotice("");
      })
      .catch((error) => {
        console.error("Dankes-Einträge laden:", error);
        setLoadNotice(
          isOffline() || isNetworkError(error)
            ? OFFLINE_MESSAGES.thanksLoad
            : "Die Einträge konnten gerade nicht geladen werden.",
        );
      });
  }, [online]);
  const [turning, setTurning] = useState(false);
  const [targetPage, setTargetPage] = useState<number | null>(null);
  const [targetTextPage, setTargetTextPage] = useState(0);
  const [turnDirection, setTurnDirection] = useState<1 | -1>(1);
  const [revealBackwardTarget, setRevealBackwardTarget] = useState(false);

  function turnTo(
    nextPage: number,
    direction: 1 | -1,
    nextTextPage = 0,
  ) {
    if (turning) return;
    if (nextPage < -1 || nextPage >= people.length) return;

    setTargetPage(nextPage);
    setTargetTextPage(nextTextPage);
    setTurnDirection(direction);
    setRevealBackwardTarget(false);
    setTurning(true);
  }

  function finishTurn() {
    if (targetPage !== null) {
      setPage(targetPage);
      setTextPage(targetPage === -1 ? 0 : targetTextPage);
    }

    setTargetPage(null);
    setTargetTextPage(0);
    setRevealBackwardTarget(false);
    setTurning(false);
  }

  function DedicationLeft() {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#ead8b5]">
        <div className="absolute bottom-0 left-0 top-0 -right-[36px]">
          <Image
            src="/images/thanks/renke-dankesbuch-cover.webp"
            alt="Widmungsseite Für Renke"
            fill
            priority
            sizes="50vw"
            className="object-cover object-center"
          />
        </div>
      </div>
    );
  }

  function DedicationRight() {
    return (
      <div className="relative flex h-full flex-col overflow-hidden bg-[#f1dfbf] px-10 py-7 text-[#4a3528] sm:px-12">
        <PaperTexture />

        <div className="relative z-10 flex h-full flex-col">
          <h2 className="font-[cursive] text-4xl leading-none">
            Lieber Renke,
          </h2>

          <div className="mt-4 space-y-4 font-serif text-[17px] leading-[1.55]">
            <p>
              dieses Kochbuch ist eigentlich als Schulprojekt entstanden.
              Aber mit der Zeit wurde daraus viel mehr als nur Code, Rezepte
              und Aufgaben.
            </p>

            <p>
              Es ist ein kleines Dankeschön für deine Geduld, deinen Humor
              und deine Art, Wissen zu vermitteln.
            </p>

            <p>
              Vor allem aber dafür, dass du{" "}
              <strong>immer ein Lächeln im Gesicht hast</strong> und durch
              deine Art{" "}
              <strong>
                immer – aber wirklich immer – positive Energie ausstrahlst.
              </strong>{" "}
              Genau das macht die Zeit mit dir so besonders.
            </p>

            <p>
              Du hast uns gezeigt, dass Fehler nicht das Ende sind, sondern
              oft einfach nur der Anfang vom nächsten Versuch. Vielleicht
              vergessen wir irgendwann den einen oder anderen Syntaxbefehl
              oder warum ein Build mal wieder nicht laufen wollte.
            </p>

            <p className="font-semibold">
              Aber an die gemeinsame Zeit mit dir werden wir uns erinnern.
            </p>

            <p>
              Deshalb haben wir dir hier noch ein paar Seiten dagelassen.
              Jeder von uns mit seinem eigenen kleinen Eintrag, seinen
              Gedanken und seinem Dank.
            </p>
          </div>

          <div className="my-4 text-center">
            <div className="inline-block rotate-[-1deg] bg-[#e8cfa7]/70 px-8 py-3 font-[cursive] text-3xl">
              Danke für alles, Renke. ♥
            </div>
          </div>

          <p className="text-center font-serif text-sm leading-relaxed text-[#654b39]">
            {names}
          </p>

          <div className="mx-auto my-5 flex w-56 items-center gap-4 text-[#74543d]">
            <div className="h-px flex-1 bg-[#74543d]/40" />
            <span>♥</span>
            <div className="h-px flex-1 bg-[#74543d]/40" />
          </div>

          <div className="mt-auto flex items-end justify-between gap-5">
            <div className="font-mono text-[12px] leading-relaxed text-[#594333]">
              <div>$ git commit -m &quot;Danke Renke&quot;</div>
              <div>$ git push origin erinnerungen</div>
            </div>

            <div className="rotate-[-5deg] text-right font-[cursive] text-base text-[#705440]">
              Manche Menschen
              <br />
              machen alles
              <br />
              ein bisschen besser. ♥
            </div>
          </div>
        </div>
      </div>
    );
  }

  function PersonLeft({ person }: { person: Person }) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-[#ead8b5] p-10 text-center text-[#533b2c]">
        <PaperTexture />

        <div className="relative z-10">
          <p className="font-[cursive] text-2xl text-[#805b3e]">
            Seite von
          </p>

          <h2 className="mt-2 font-serif text-6xl">
            {person.name}
          </h2>

          <div className="relative mx-auto mt-7 flex h-[390px] w-[390px] items-center justify-center overflow-hidden rounded-full">
            {person.portrait ? (
              <Image
                src={person.portrait}
                alt={`${person.name} als Bleistiftzeichnung`}
                fill
                sizes="390px"
                className="object-contain mix-blend-multiply"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center border-2 border-[#8d6b4b]/30 bg-[#efe1bd]/40 font-serif text-8xl text-[#6f5339]/70">
                {person.name.slice(0, 1)}
              </div>
            )}
          </div>

          <p className="mx-auto mt-9 max-w-sm font-[cursive] text-2xl leading-relaxed">
            Ein paar persönliche Worte für Renke.
          </p>
        </div>
      </div>
    );
  }

  function PersonRight({
    person,
    textPage: requestedTextPage,
  }: {
    person: Person;
    textPage: number;
  }) {
    const personPages = paginateMessage(messages[person.id] ?? "");
    const safeTextPage = Math.min(
      requestedTextPage,
      personPages.length - 1,
    );

    return (
      <div className="relative flex h-full flex-col overflow-hidden bg-[#f1dfbf] p-10 text-[#523a2c] sm:p-14">
        <PaperTexture />

        <div className="relative z-10 flex h-full min-h-0 flex-col">
          <p className="font-[cursive] text-xl text-[#8b674d]">
            {person.name} schreibt:
          </p>

          <h3 className="mt-2 font-serif text-4xl">
            Ein paar Worte für Renke
          </h3>

          <div className="my-7 h-px w-40 bg-[#856044]/35" />

          <div className="handwriting min-h-0 flex-1 w-full whitespace-pre-wrap overflow-hidden rounded-xl border border-[#8a674d]/20 bg-[#f6e8ca]/35 p-5 text-[23px] leading-[1.55]">
            {personPages[safeTextPage]}
          </div>

          <div className="mt-3 flex items-center justify-between gap-4 text-sm opacity-55">
            <p>
              Persönlicher Eintrag aus unserem digitalen Gästebuch.
            </p>

            {personPages.length > 1 && (
              <p className="shrink-0 font-semibold">
                Textseite {safeTextPage + 1} von {personPages.length}
              </p>
            )}
          </div>

          <div className="mt-auto flex items-center gap-4 pb-2 pt-5 text-[#76553d]">
            <div className="h-px flex-1 bg-[#76553d]/25" />
            <span>♥</span>
            <div className="h-px flex-1 bg-[#76553d]/25" />
          </div>
        </div>
      </div>
    );
  }


  function PaperTexture() {
    return (
      <>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.28),transparent_35%),radial-gradient(circle_at_80%_75%,rgba(105,70,40,.10),transparent_32%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.055] [background-image:repeating-linear-gradient(0deg,#4d3527_0,#4d3527_1px,transparent_1px,transparent_4px)]" />
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_45px_rgba(77,46,26,.17)]" />
      </>
    );
  }

  const currentPerson = page >= 0 ? people[page] : null;
  const targetPerson =
    targetPage !== null && targetPage >= 0 ? people[targetPage] : null;

  function getPagesForPerson(person: Person) {
    return paginateMessage(messages[person.id] ?? "");
  }

  const currentTextPageCount = currentPerson
    ? getPagesForPerson(currentPerson).length
    : 1;

  function goBack() {
    if (turning || page === -1) return;

    if (textPage > 0) {
      turnTo(page, -1, textPage - 1);
      return;
    }

    if (page === 0) {
      turnTo(-1, -1, 0);
      return;
    }

    const previousPerson = people[page - 1];
    const previousPageCount = getPagesForPerson(previousPerson).length;

    turnTo(page - 1, -1, previousPageCount - 1);
  }

  function goForward() {
    if (turning) return;

    if (page === -1) {
      turnTo(0, 1, 0);
      return;
    }

    if (textPage < currentTextPageCount - 1) {
      turnTo(page, 1, textPage + 1);
      return;
    }

    if (page < people.length - 1) {
      turnTo(page + 1, 1, 0);
    }
  }

  const canGoBack = page !== -1 && !turning;

  const canGoForward =
    !turning &&
    (
      page === -1 ||
      textPage < currentTextPageCount - 1 ||
      page < people.length - 1
    );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#120b08] px-4 py-7">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-80"
        style={{
          backgroundImage: "url('/images/thanks/castle-library.webp')",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,8,5,.28),rgba(20,10,6,.48)_55%,rgba(10,5,3,.72))]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-5 text-center">
          <h1 className="font-serif text-4xl text-[#ffe5b0] drop-shadow-[0_3px_14px_rgba(255,170,72,.35)] sm:text-5xl">
            Danke Renke
          </h1>
          {(loadNotice || !online) && (
            <p role="status" className="mt-2 font-serif text-base text-[#ffe5b0]/85">
              {online ? loadNotice : OFFLINE_MESSAGES.thanksLoad}
            </p>
          )}
        </div>

        <div
          className="relative mx-auto w-full max-w-[1320px]"
          style={{ perspective: "2600px" }}
        >
          <div className="relative grid h-[900px] overflow-hidden rounded-[24px] border-[10px] border-[#4e2d1c] bg-[#4e2d1c] shadow-[0_35px_120px_rgba(0,0,0,.75)] lg:grid-cols-2">
            {turning && targetPage !== null ? (
              turnDirection === 1 ? (
                <>
                  {/* Vorwärts:
                      links bleibt die alte Seite,
                      rechts liegt die neue Seite bereits darunter */}
                  {page === -1 ? (
                    <DedicationLeft />
                  ) : (
                    <PersonLeft person={currentPerson!} />
                  )}

                  {targetPage === -1 ? (
                    <DedicationRight />
                  ) : targetPerson ? (
                    <PersonRight
                      person={targetPerson}
                      textPage={targetTextPage}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  {/* Rückwärts:
                      links liegt bereits die Zielseite,
                      rechts bleibt noch die aktuelle Seite */}
                  {targetPage === -1 ? (
                    <DedicationLeft />
                  ) : targetPerson ? (
                    <PersonLeft person={targetPerson} />
                  ) : null}

                  {revealBackwardTarget ? (
                    targetPage === -1 ? (
                      <DedicationRight />
                    ) : targetPerson ? (
                      <PersonRight
                        person={targetPerson}
                        textPage={targetTextPage}
                      />
                    ) : null
                  ) : page === -1 ? (
                    <DedicationRight />
                  ) : (
                    <PersonRight
                      person={currentPerson!}
                      textPage={textPage}
                    />
                  )}
                </>
              )
            ) : page === -1 ? (
              <>
                <DedicationLeft />
                <DedicationRight />
              </>
            ) : (
              <>
                <PersonLeft person={currentPerson!} />
                <PersonRight
                  person={currentPerson!}
                  textPage={textPage}
                />
              </>
            )}

            {/* umblätterndes Blatt */}
            {turning && (
              <motion.div
                initial={{ rotateY: 0 }}
                animate={{
                  rotateY: turnDirection === 1 ? -180 : 180,
                }}
                transition={{
                  duration: 1.15,
                  ease: [0.45, 0.05, 0.15, 1],
                }}
                onUpdate={(latest) => {
                  if (turnDirection !== -1 || revealBackwardTarget) return;

                  const rotateY =
                    typeof latest.rotateY === "number"
                      ? latest.rotateY
                      : Number.parseFloat(String(latest.rotateY ?? "0"));

                  if (rotateY >= 90) {
                    setRevealBackwardTarget(true);
                  }
                }}
                onAnimationComplete={finishTurn}
                style={{
                  transformStyle: "preserve-3d",
                  transformOrigin:
                    turnDirection === 1
                      ? "left center"
                      : "right center",
                }}
                className={
                  turnDirection === 1
                    ? "absolute bottom-0 right-0 top-0 z-40 w-1/2"
                    : "absolute bottom-0 left-0 top-0 z-40 w-1/2"
                }
              >
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  {page === -1 ? (
                    <DedicationRight />
                  ) : turnDirection === 1 ? (
                    PersonRight({ person: currentPerson!, textPage })
                  ) : (
                    PersonLeft({ person: currentPerson! })
                  )}
                </div>

                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{
                    transform: "rotateY(180deg)",
                    backfaceVisibility: "hidden",
                  }}
                >
                  {targetPage === -1 ? (
                    turnDirection === 1 ? (
                      <DedicationLeft />
                    ) : (
                      <DedicationRight />
                    )
                  ) : targetPerson ? (
                    turnDirection === 1 ? (
                      <PersonLeft person={targetPerson} />
                    ) : (
                      <PersonRight
                        person={targetPerson}
                        textPage={targetTextPage}
                      />
                    )
                  ) : null}
                </div>
              </motion.div>
            )}

            {/* Buchfalz */}
            <div className="pointer-events-none absolute bottom-0 left-1/2 top-0 z-30 hidden w-16 -translate-x-1/2 bg-gradient-to-r from-black/20 via-black/5 to-black/20 lg:block" />
          </div>

          <div className="relative z-50 mx-auto mt-5 flex max-w-3xl items-center justify-between">
            <button
              type="button"
              disabled={!canGoBack}
              onClick={goBack}
              className="rounded-full border border-[#d0ac82] bg-[#342116]/90 px-6 py-3 text-[#f4ddbd] transition hover:bg-[#4a3022] disabled:opacity-25"
            >
              ← Zurück
            </button>

            <div className="text-center text-[#ead1ae]">
              <p className="font-[cursive] text-xl">
                {page === -1 ? "Widmung" : currentPerson?.name}
              </p>
              <p className="text-xs opacity-60">
                {page === -1
                  ? "Für Renke"
                  : currentTextPageCount > 1
                    ? `${page + 1} von ${people.length} · Textseite ${textPage + 1} von ${currentTextPageCount}`
                    : `${page + 1} von ${people.length}`}
              </p>
            </div>

            <button
              type="button"
              disabled={!canGoForward}
              onClick={goForward}
              className="rounded-full bg-[#7a4a2e] px-6 py-3 text-[#fff0d5] transition hover:bg-[#925a38] disabled:opacity-25"
            >
              Weiter →
            </button>
          </div>
        </div>
      </div>
    
      <style jsx global>{`
        @keyframes castleCandleFlicker {
          0%,
          100% {
            transform: translateX(-50%) scaleX(1) scaleY(1) rotate(-1deg);
            filter: brightness(1);
          }
          20% {
            transform: translateX(-50%) scaleX(.88) scaleY(1.08) rotate(2deg);
            filter: brightness(1.12);
          }
          42% {
            transform: translateX(-50%) scaleX(1.08) scaleY(.94) rotate(-2deg);
            filter: brightness(.96);
          }
          63% {
            transform: translateX(-50%) scaleX(.93) scaleY(1.12) rotate(1deg);
            filter: brightness(1.16);
          }
          82% {
            transform: translateX(-50%) scaleX(1.04) scaleY(.98) rotate(-1deg);
          }
        }

        @keyframes castleInnerFlame {
          0%,
          100% {
            opacity: .72;
            transform: translateX(-50%) scale(.92);
          }
          50% {
            opacity: 1;
            transform: translateX(-50%) scale(1.08);
          }
        }

        @keyframes castleGlow {
          0%,
          100% {
            opacity: .55;
            transform: translateX(-50%) scale(.94);
          }
          50% {
            opacity: .9;
            transform: translateX(-50%) scale(1.08);
          }
        }

        @keyframes castleDust {
          from {
            background-position:
              0 0,
              30px 80px,
              120px 40px;
          }
          to {
            background-position:
              35px -110px,
              5px -45px,
              85px -85px;
          }
        }

        .candle-flame {
          animation: castleCandleFlicker 1.35s ease-in-out infinite;
        }

        .candle-flame-inner {
          animation: castleInnerFlame .9s ease-in-out infinite;
        }

        .candle-glow {
          animation: castleGlow 2.1s ease-in-out infinite;
        }

        .castle-dust {
          background-image:
            radial-gradient(circle, rgba(255,222,155,.8) 0 1px, transparent 1.5px),
            radial-gradient(circle, rgba(255,186,91,.55) 0 1px, transparent 1.5px),
            radial-gradient(circle, rgba(255,238,191,.45) 0 1px, transparent 1.5px);
          background-size: 145px 145px, 215px 215px, 285px 285px;
          animation: castleDust 18s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .candle-flame,
          .candle-flame-inner,
          .candle-glow,
          .castle-dust {
            animation: none !important;
          }
        }
      `}</style>
</main>
  );
}
