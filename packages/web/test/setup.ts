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

afterEach(() => {
  cleanup();
});
