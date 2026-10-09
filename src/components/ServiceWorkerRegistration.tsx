"use client";

import { useEffect, useState } from "react";

// Nur nach ausdruecklicher Zustimmung neu laden (nicht bei der ersten Installation).
let updateRequested = false;

export default function ServiceWorkerRegistration() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;
    let reloading = false;

    const offerUpdate = (worker: ServiceWorker | null) => {
      if (worker && navigator.serviceWorker.controller) {
        setWaitingWorker(worker);
      }
    };

    const watch = (current: ServiceWorkerRegistration) => {
      offerUpdate(current.waiting);
      current.addEventListener("updatefound", () => {
        const installing = current.installing;
        installing?.addEventListener("statechange", () => {
          if (installing.state === "installed") {
            offerUpdate(installing);
          }
        });
      });
    };

    const checkForUpdate = () => {
      void registration?.update().catch(() => undefined);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
      }
    };

    const onControllerChange = () => {
      if (!updateRequested || reloading) {
        return;
      }
      reloading = true;
      window.location.reload();
    };

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((current) => {
        registration = current;
        watch(current);
      })
      .catch((error: unknown) => {
        console.error("Service Worker konnte nicht registriert werden:", error);
      });

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", checkForUpdate);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", checkForUpdate);
    };
  }, []);

  if (!waitingWorker) {
    return null;
  }

  return (
    <div
      role="status"
      data-update-banner
      className="fixed inset-x-0 top-4 z-50 flex justify-center px-4"
    >
      <div className="flex flex-wrap items-center justify-center gap-3 rounded-full border border-[#d5b66c]/50 bg-[#2a1a10]/90 px-5 py-2 font-serif text-sm text-[#ffe5b0] shadow-lg">
        <span>Eine neue Version von Renkes Kochbuch ist bereit.</span>
        <button
          type="button"
          onClick={() => {
            updateRequested = true;
            waitingWorker.postMessage({ type: "SKIP_WAITING" });
          }}
          className="rounded-full bg-[#70472f] px-3 py-1 font-semibold text-[#fff3dc] transition hover:bg-[#5b3928]"
        >
          Jetzt aktualisieren
        </button>
      </div>
    </div>
  );
}
