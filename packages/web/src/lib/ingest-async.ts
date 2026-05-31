// Async ingest wrapper. Runs ingestRecords() inside a one-shot Web Worker so
// the main thread stays responsive while large pastes are deduped + inferred.
//
// Why one-shot rather than a long-lived pool: ingest is bursty (per import,
// not per keystroke), worker startup is a few ms, and per-shot termination
// means no shared state to leak between calls. Trade-off is one extra alloc
// per import, which is invisible against infer()'s cost.
//
// Fallback: when Worker isn't available (test runners without jsdom worker
// support, SSR), we fall back to running ingestRecords inline. The DataPanel
// doesn't need to care.

import { type IngestResult, type IngestState, ingestRecords } from "./ingest-records";
import type { WorkerRequest, WorkerResponse } from "./ingest-worker";

export function ingestAsync(state: IngestState, incoming: unknown[]): Promise<IngestResult> {
  if (typeof Worker === "undefined") {
    return Promise.resolve(ingestRecords(state, incoming));
  }

  return new Promise<IngestResult>((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./ingest-worker.ts", import.meta.url), {
        type: "module",
      });
    } catch {
      // Some test environments fail to construct workers from a file URL —
      // degrade gracefully to inline ingest there too.
      resolve(ingestRecords(state, incoming));
      return;
    }

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data;
      worker.terminate();
      if (data.kind === "ok") resolve(data.result);
      else reject(new Error(data.message));
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || "ingest worker error"));
    };

    const req: WorkerRequest = { kind: "ingest", state, incoming };
    worker.postMessage(req);
  });
}
