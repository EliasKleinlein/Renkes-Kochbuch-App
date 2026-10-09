"use client";

import { useEffect } from "react";

type OfflineMediaCachingProps = {
  src: string;
};

// Bittet den Service Worker nach einem vollstaendigen Online-Seitenaufruf, das Video
// fuer die Offline-Nutzung zu cachen. Der Service Worker prueft Freigabeliste und Speicherplatz.
export default function OfflineMediaCaching({ src }: OfflineMediaCachingProps) {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator) ||
      !navigator.onLine
    ) {
      return;
    }

    const requestCaching = () => {
      void navigator.serviceWorker.ready.then((registration) => {
        registration.active?.postMessage({ type: "CACHE_OFFLINE_MEDIA", url: src });
      });
    };

    if (document.readyState === "complete") {
      requestCaching();
      return;
    }

    window.addEventListener("load", requestCaching, { once: true });
    return () => window.removeEventListener("load", requestCaching);
  }, [src]);

  return null;
}
