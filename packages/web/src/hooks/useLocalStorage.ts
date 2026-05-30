// Lightweight wrapper around localStorage with JSON serialization, sensible
// fallbacks, and a stable setter. Used by useUIPref, useTheme, and any
// component that needs to persist a small bit of display state across reloads.
//
// Intentionally simple — no cross-tab sync, no SSR safety beyond a typeof
// guard, no schema validation. Callers are responsible for typing the value
// they store and handling shape changes if their default ever evolves.

import { useCallback, useEffect, useState } from "react";

export interface UseLocalStorageOptions<T> {
  // Custom serializer for non-JSON values (e.g. a plain string that shouldn't
  // be wrapped in quotes). Defaults to JSON.stringify / JSON.parse.
  serialize?: (value: T) => string;
  deserialize?: (raw: string) => T;
}

const defaultSerialize = <T>(v: T): string => JSON.stringify(v);
const defaultDeserialize = <T>(raw: string): T => JSON.parse(raw) as T;

function readKey<T>(key: string, defaultValue: T, deserialize: (raw: string) => T): T {
  if (typeof localStorage === "undefined") return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return deserialize(raw);
  } catch {
    return defaultValue;
  }
}

function writeKey<T>(key: string, value: T, serialize: (value: T) => string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, serialize(value));
  } catch {
    // Quota / disabled storage — silently drop. Persistence is best-effort.
  }
}

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  opts: UseLocalStorageOptions<T> = {},
): [T, (value: T) => void] {
  const serialize = opts.serialize ?? (defaultSerialize as (value: T) => string);
  const deserialize = opts.deserialize ?? (defaultDeserialize as (raw: string) => T);

  const [value, setValue] = useState<T>(() => readKey(key, defaultValue, deserialize));

  // Re-read when the key changes (e.g. workspace-scoped prefs switching workspace).
  useEffect(() => {
    setValue(readKey(key, defaultValue, deserialize));
  }, [key, defaultValue, deserialize]);

  const set = useCallback(
    (next: T) => {
      setValue(next);
      writeKey(key, next, serialize);
    },
    [key, serialize],
  );

  return [value, set];
}

// Lower-level helpers for places that read without subscribing (e.g. the
// initial value of a dismissed flag, before the component mounts).
export const localStorageHelpers = {
  read: readKey,
  write: writeKey,
};
