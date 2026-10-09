// Bittet den Service Worker, die Detailseiten aller lokal vorhandenen Rezepte vorab zu speichern,
// damit sie offline auch nach einem Neustart der App geoeffnet werden koennen.

let requestedThisSession = false;

export async function requestDetailPagePrecache(
  recipeIds: ReadonlyArray<number | string>,
): Promise<void> {
  if (
    requestedThisSession ||
    recipeIds.length === 0 ||
    process.env.NODE_ENV !== "production" ||
    !("serviceWorker" in navigator) ||
    !navigator.onLine
  ) {
    return;
  }

  requestedThisSession = true;
  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage({
    type: "CACHE_DETAIL_PAGES",
    paths: recipeIds.map((id) => `/recipes/${encodeURIComponent(String(id))}`),
  });
}
