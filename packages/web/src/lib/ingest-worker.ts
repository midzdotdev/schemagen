// Web Worker entry: runs the pure ingestRecords pipeline off the main
// thread. The DataPanel uses ingestAsync() (see ingest-async.ts) which spawns
// this worker, posts the inputs, and resolves with the result.
//
// This file is a real worker (no DOM access). Vite bundles it via the
// `new Worker(new URL(...), { type: "module" })` pattern in the wrapper.
//
// Protocol: { kind: "ingest", state, incoming } in, then either
// { kind: "ok", result } or { kind: "err", message } out — one response per
// request. The wrapper terminates the worker after the response so there's
// no lifecycle to manage on the caller side.

import { type IngestResult, type IngestState, ingestRecords } from "./ingest-records";

export type WorkerRequest = {
  kind: "ingest";
  state: IngestState;
  incoming: unknown[];
};

export type WorkerResponse =
  | { kind: "ok"; result: IngestResult }
  | { kind: "err"; message: string };

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  try {
    const { state, incoming } = event.data;
    const result = ingestRecords(state, incoming);
    const response: WorkerResponse = { kind: "ok", result };
    (self as unknown as Worker).postMessage(response);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const response: WorkerResponse = { kind: "err", message };
    (self as unknown as Worker).postMessage(response);
  }
};
