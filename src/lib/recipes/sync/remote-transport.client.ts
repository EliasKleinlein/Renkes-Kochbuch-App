import { RecipeRepositoryError } from "@/lib/recipes/errors";
import {
  parseRecipeSyncSnapshot,
  type RecipeSyncSnapshot,
  type RecipeSyncTransport,
} from "@/lib/recipes/sync/contract";

type SyncFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Pick<Response, "ok" | "json">>;

const DEFAULT_TIMEOUT_MS = 15_000;

function remoteUnavailable(cause?: unknown) {
  return new RecipeRepositoryError(
    "REMOTE_UNAVAILABLE",
    "Die Rezeptdaten konnten nicht synchronisiert werden.",
    cause,
  );
}

export class HttpRecipeSyncTransport implements RecipeSyncTransport {
  constructor(
    private readonly fetchImplementation: SyncFetch = (input, init) =>
      globalThis.fetch(input, init),
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {}

  async fetchSnapshot(): Promise<RecipeSyncSnapshot> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let payload: unknown;

    try {
      const response = await this.fetchImplementation("/api/recipes/sync", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw remoteUnavailable();
      }

      payload = await response.json();
    } catch (error) {
      if (error instanceof RecipeRepositoryError) {
        throw error;
      }

      throw remoteUnavailable(error);
    } finally {
      clearTimeout(timeout);
    }

    return parseRecipeSyncSnapshot(payload);
  }
}
