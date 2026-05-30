import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JsonView } from "@/components/ui/json-view";

describe("JsonView", () => {
  it("renders the JSON text verbatim", () => {
    render(<JsonView aria-label="json" value={{ id: 1, status: "active" }} />);
    const pre = screen.getByLabelText("json");
    // The full text content matches a JSON.stringify of the value, ignoring
    // the inner span structure that carries the colour classes.
    expect(pre.textContent).toBe(JSON.stringify({ id: 1, status: "active" }, null, 2));
  });

  it("tokens are wrapped in coloured spans", () => {
    render(<JsonView aria-label="json" value={{ x: 1, y: true, z: null, s: "hi" }} />);
    const pre = screen.getByLabelText("json");
    const html = pre.innerHTML;
    // string value
    expect(html).toContain("text-emerald");
    // number
    expect(html).toContain("text-sky");
    // boolean / null
    expect(html).toContain("text-violet");
  });

  it("honours a pre-stringified text prop", () => {
    const literal = '{ "foo": 1 }';
    render(<JsonView aria-label="json" value={undefined} text={literal} />);
    expect(screen.getByLabelText("json").textContent).toBe(literal);
  });

  it("falls back gracefully on non-JSON text", () => {
    render(<JsonView aria-label="json" value={undefined} text="Import data to see a schema." />);
    expect(screen.getByLabelText("json")).toHaveTextContent("Import data to see a schema.");
  });
});
