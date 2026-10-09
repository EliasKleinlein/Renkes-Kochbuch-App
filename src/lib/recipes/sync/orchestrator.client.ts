import type {
  LocalDatasetMetadata,
  LocalRecipeRepository,
} from "@/lib/recipes/contract";
import { validationError } from "@/lib/recipes/errors";
import { IndexedDbLocalRecipeRepository } from "@/lib/recipes/local-repository.client";
import {
  SYNC_SCHEMA_VERSION,
  type RecipeSyncTransport,
} from "@/lib/recipes/sync/contract";
import { HttpRecipeSyncTransport } from "@/lib/recipes/sync/remote-transport.client";

export type RecipeSyncResult = {
  status: "updated" | "unchanged";
  metadata: LocalDatasetMetadata;
};

export class RecipeSyncOrchestrator {
  private inFlight: Promise<RecipeSyncResult> | null = null;

  constructor(
    private readonly localRepository: LocalRecipeRepository,
    private readonly remoteTransport: RecipeSyncTransport,
    private readonly now: () => Date = () => new Date(),
  ) {}

  sync(): Promise<RecipeSyncResult> {
    if (this.inFlight !== null) {
      return this.inFlight;
    }

    const operation = this.performSync().finally(() => {
      if (this.inFlight === operation) {
        this.inFlight = null;
      }
    });
    this.inFlight = operation;

    return operation;
  }

  private async performSync(): Promise<RecipeSyncResult> {
    const [localMetadata, localRecipes] = await Promise.all([
      this.localRepository.getMetadata(),
      this.localRepository.getAll(),
    ]);

    if (
      localMetadata !== null &&
      localMetadata.schemaVersion !== SYNC_SCHEMA_VERSION
    ) {
      throw validationError("Die lokale Schemaversion ist inkompatibel.");
    }

    const snapshot = await this.remoteTransport.fetchSnapshot();
    const lastSyncAt = this.now();

    if (
      localRecipes.length > 0 &&
      localMetadata?.datasetVersion === snapshot.datasetVersion
    ) {
      await this.localRepository.setLastSync(lastSyncAt);
      return {
        status: "unchanged",
        metadata: { ...localMetadata, lastSyncAt },
      };
    }

    const metadata: LocalDatasetMetadata = {
      schemaVersion: snapshot.schemaVersion,
      datasetVersion: snapshot.datasetVersion,
      lastSyncAt,
    };
    await this.localRepository.replaceAll(snapshot.recipes, metadata);

    return { status: "updated", metadata };
  }
}

const defaultRecipeSyncOrchestrator = new RecipeSyncOrchestrator(
  new IndexedDbLocalRecipeRepository(),
  new HttpRecipeSyncTransport(),
);

export function syncRecipes(): Promise<RecipeSyncResult> {
  return defaultRecipeSyncOrchestrator.sync();
}
