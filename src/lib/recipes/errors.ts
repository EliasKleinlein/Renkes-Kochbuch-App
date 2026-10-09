export type RecipeRepositoryErrorCode =
  | "VALIDATION"
  | "LOCAL_STORAGE"
  | "REMOTE_UNAVAILABLE"
  | "SYNC_CONFLICT"
  | "UNKNOWN";

export class RecipeRepositoryError extends Error {
  readonly code: RecipeRepositoryErrorCode;
  override readonly cause?: unknown;

  constructor(
    code: RecipeRepositoryErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "RecipeRepositoryError";
    this.code = code;
    this.cause = cause;
  }
}

export function validationError(message: string, cause?: unknown) {
  return new RecipeRepositoryError("VALIDATION", message, cause);
}

export function localStorageError(message: string, cause?: unknown) {
  return new RecipeRepositoryError("LOCAL_STORAGE", message, cause);
}

export function mapLocalStorageError(error: unknown, message: string) {
  return error instanceof RecipeRepositoryError
    ? error
    : localStorageError(message, error);
}
