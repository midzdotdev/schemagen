import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom's File doesn't implement .text(). Polyfill it so drag-drop and
// file-upload paths can be tested.
if (typeof File !== "undefined" && File.prototype.text === undefined) {
  Object.defineProperty(File.prototype, "text", {
    value: async function (this: File) {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(this);
      });
    },
    writable: true,
    configurable: true,
  });
}

// jsdom doesn't measure layout (everything is 0×0) and has no ResizeObserver,
// which makes @tanstack/react-virtual render zero rows. Mock both:
//   - getBoundingClientRect / clientHeight returns a generous viewport
//   - ResizeObserver is a no-op shim (the virtualizer only needs it to exist)
if (typeof Element !== "undefined") {
  Element.prototype.getBoundingClientRect = function () {
    return {
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
  };
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 600,
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => 800,
  });
}
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverShim {
    constructor(private readonly cb: ResizeObserverCallback) {}
    observe(target: Element): void {
      // Fire once synchronously with the mocked viewport so virtualizers
      // get an initial measurement.
      const rect = target.getBoundingClientRect();
      const entry = {
        target,
        contentRect: rect,
        borderBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }],
        contentBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }],
        devicePixelContentBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }],
      } as unknown as ResizeObserverEntry;
      this.cb([entry], this as unknown as ResizeObserver);
    }
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverShim as unknown as typeof ResizeObserver;
}

afterEach(() => {
  cleanup();
});
