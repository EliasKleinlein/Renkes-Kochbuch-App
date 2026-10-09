"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(
      (error: unknown) => {
        console.error("Service Worker konnte nicht registriert werden:", error);
      },
    );
  }, []);

  return null;
}
