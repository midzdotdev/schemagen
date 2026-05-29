// Per-browser client ID. Generated once on first call and persisted in
// localStorage. Used to stamp every applied Change so a future sync layer
// can show "who edited this" without backfilling.
//
// localStorage is intentional (not Dexie): the clientId must be available
// before Dexie hydration completes, and survives Dexie database deletions.

const STORAGE_KEY = "schemagen.clientId";

export function getClientId(): string {
  if (typeof localStorage === "undefined") {
    // No storage in this environment — fall back to an ephemeral UUID.
    // Only happens in SSR or non-browser tests.
    return generate();
  }
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const id = generate();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}

export function resetClientIdForTests(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

function generate(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for ancient environments.
  return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2)).join("-");
}
