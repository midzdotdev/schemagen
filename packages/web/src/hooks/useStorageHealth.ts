import { useEffect, useState } from "react";

export type StorageStatus =
  | { kind: "unknown" } // browser doesn't expose the API
  | { kind: "ok"; persistent: boolean; usagePct: number }
  | { kind: "near-quota"; usagePct: number; persistent: boolean }
  | { kind: "ephemeral" }; // not persistent; eviction risk

// Polls Storage.estimate once at mount. The numbers don't move quickly enough
// to warrant continuous polling — re-mount on workspace switch is plenty.
export function useStorageHealth(): StorageStatus {
  const [status, setStatus] = useState<StorageStatus>({ kind: "unknown" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (
        typeof navigator === "undefined" ||
        !navigator.storage ||
        typeof navigator.storage.estimate !== "function"
      ) {
        return;
      }
      try {
        const persistent =
          typeof navigator.storage.persisted === "function"
            ? await navigator.storage.persisted()
            : false;
        const { quota = 0, usage = 0 } = await navigator.storage.estimate();
        if (cancelled) return;
        if (!persistent) {
          // Some browsers (notably Safari) will evict non-persistent
          // IndexedDB after ~7 days of inactivity. Warn separately from quota.
          setStatus({ kind: "ephemeral" });
          return;
        }
        const usagePct = quota > 0 ? usage / quota : 0;
        if (usagePct > 0.85) {
          setStatus({ kind: "near-quota", usagePct, persistent });
        } else {
          setStatus({ kind: "ok", persistent, usagePct });
        }
      } catch {
        // Storage API can throw in private windows / sandboxed iframes.
        if (!cancelled) setStatus({ kind: "unknown" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}

// Best-effort request for persistent storage. The browser may decline silently.
// Call from a user gesture (e.g. clicking "Make persistent" in the banner).
export async function requestPersistence(): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    typeof navigator.storage.persist !== "function"
  ) {
    return false;
  }
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
