import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStorageHealth } from "@/hooks/useStorageHealth";

type Health = ReturnType<typeof useStorageHealth>;

function mockStorage(opts: { persisted?: boolean; usage?: number; quota?: number }): void {
  Object.defineProperty(navigator, "storage", {
    configurable: true,
    value: {
      estimate: async () => ({ usage: opts.usage ?? 0, quota: opts.quota ?? 1000 }),
      persisted: async () => opts.persisted ?? false,
      persist: async () => true,
    },
  });
}

beforeEach(() => {
  // Wipe any previous mock so tests can install their own.
  // biome-ignore lint/suspicious/noExplicitAny: navigator.storage is hard to type narrowly here
  delete (navigator as any).storage;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useStorageHealth", () => {
  it("starts at 'unknown' before the estimate resolves", () => {
    mockStorage({ persisted: true, usage: 100, quota: 1000 });
    const { result } = renderHook(() => useStorageHealth());
    expect((result.current as Health).kind).toBe("unknown");
  });

  it("reports 'ephemeral' when storage isn't persistent", async () => {
    mockStorage({ persisted: false, usage: 100, quota: 1000 });
    const { result } = renderHook(() => useStorageHealth());
    await waitFor(() => expect(result.current.kind).toBe("ephemeral"));
  });

  it("reports 'near-quota' when usage exceeds 85%", async () => {
    mockStorage({ persisted: true, usage: 900, quota: 1000 });
    const { result } = renderHook(() => useStorageHealth());
    await waitFor(() => expect(result.current.kind).toBe("near-quota"));
  });

  it("reports 'ok' when persistent and below 85%", async () => {
    mockStorage({ persisted: true, usage: 100, quota: 1000 });
    const { result } = renderHook(() => useStorageHealth());
    await waitFor(() => expect(result.current.kind).toBe("ok"));
  });
});
