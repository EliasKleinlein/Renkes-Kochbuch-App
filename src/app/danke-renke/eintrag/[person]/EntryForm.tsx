"use client";

import { useEffect, useState } from "react";
import { OFFLINE_MESSAGES, isNetworkError, isOffline } from "@/lib/offline/messages";
import { useOnlineStatus } from "@/lib/offline/online-status";

type Props = {
  personId: string;
  name: string;
  token: string;
};

export default function EntryForm({
  personId,
  name,
  token,
}: Props) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const online = useOnlineStatus();

  useEffect(() => {
    fetch("/api/thanks")
      .then((response) => response.json())
      .then((data) => {
        if (data.messages?.[personId]) {
          setMessage(data.messages[personId]);
        }
      })
      .catch((error: unknown) => {
        setStatus(
          isOffline() || isNetworkError(error)
            ? OFFLINE_MESSAGES.thanksEntryLoad
            : "Der bisherige Eintrag konnte nicht geladen werden.",
        );
      });
  }, [personId]);

  async function save() {
    if (!message.trim()) {
      setStatus("Schreib Renke bitte erst ein paar Worte. ❤️");
      return;
    }

    if (isOffline()) {
      setStatus(OFFLINE_MESSAGES.thanksEntrySave);
      return;
    }

    setSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/thanks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personId,
          message,
          token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Speichern fehlgeschlagen");
      }

      setStatus("❤️ Dein Eintrag wurde gespeichert. Danke!");
    } catch (error) {
      setStatus(
        isOffline() || isNetworkError(error)
          ? OFFLINE_MESSAGES.thanksEntrySave
          : error instanceof Error
            ? error.message
            : "Speichern fehlgeschlagen."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#261913] px-4 py-12 text-[#4f3829]">
      <section className="mx-auto max-w-3xl rounded-[28px] border-[10px] border-[#4e2d1c] bg-[#f1dfbf] p-8 shadow-2xl sm:p-14">
        <p className="handwriting text-2xl text-[#8b674d]">
          Persönliche Seite von
        </p>

        <h1 className="mt-2 font-serif text-5xl">
          {name}
        </h1>

        <p className="mt-6 text-lg leading-relaxed">
          Schreib hier deine persönlichen Worte für Renke.
          Dein Eintrag wird anschließend dauerhaft in unserem Kochbuch gespeichert.
        </p>

        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={12}
          maxLength={5000}
          placeholder={`Was möchtest du Renke sagen, ${name}?`}
          className="handwriting mt-8 w-full resize-none rounded-2xl border border-[#8a674d]/30 bg-[#f7e8ca] p-6 text-3xl leading-relaxed outline-none focus:border-[#805b40]"
        />

        <div className="mt-3 text-right text-sm opacity-60">
          {message.length} / 5000
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving || !online}
          className="mt-6 rounded-xl bg-[#70472f] px-7 py-4 text-lg font-semibold text-[#fff3dc] transition hover:bg-[#5b3928] disabled:opacity-50"
        >
          {saving ? "Wird gespeichert …" : "Für Renke speichern ❤️"}
        </button>

        {!online && (
          <p role="status" className="mt-5 text-lg font-medium">
            {OFFLINE_MESSAGES.thanksEntryOffline}
          </p>
        )}

        {status && (
          <p className="mt-5 text-lg font-medium">
            {status}
          </p>
        )}

        <p className="mt-10 text-sm opacity-60">
          Deinen persönlichen Link bitte nicht öffentlich weitergeben.
        </p>
      </section>
    </main>
  );
}
