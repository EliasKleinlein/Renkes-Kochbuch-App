"use client";

import { OFFLINE_MESSAGES } from "@/lib/offline/messages";
import { useOnlineStatus } from "@/lib/offline/online-status";

export default function OfflineStatusBanner() {
  const online = useOnlineStatus();

  if (online) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-offline-banner
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
    >
      <p className="rounded-full border border-[#d5b66c]/50 bg-[#2a1a10]/90 px-5 py-2 font-serif text-sm text-[#ffe5b0] shadow-lg">
        {OFFLINE_MESSAGES.banner}
      </p>
    </div>
  );
}
