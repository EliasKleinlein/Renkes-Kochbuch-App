export default function OfflinePage() {
  return (
    <main className="fantasy-page grid min-h-screen place-items-center px-5 py-16">
      <section className="paper-panel ink-border max-w-2xl rounded-[2rem] p-10 text-center text-[#3b2718] sm:p-14">
        <p className="text-sm font-bold uppercase tracking-[.22em] text-[#9e6029]">
          Keine Verbindung
        </p>
        <h1 className="fantasy-title mt-3 text-5xl font-bold">
          Diese Seite ist offline noch nicht verfügbar.
        </h1>
        <p className="mx-auto mt-6 max-w-lg font-serif text-lg leading-8 text-[#654a36]">
          Bitte prüfe deine Internetverbindung und versuche es anschließend
          erneut.
        </p>
        <p className="mx-auto mt-4 max-w-lg font-serif text-base leading-7 text-[#654a36]">
          Rezepte, chinesische Rezepte und bereits geöffnete Seiten sind auch
          offline verfügbar. Persönliche Schreib-Links für das Dankesbuch
          funktionieren nur mit Internetverbindung.
        </p>
      </section>
    </main>
  );
}
