import "@/utils/translationGuard";
import { describe, expect, it } from "vitest";

function wrapInFont(node: Node) {
  const font = document.createElement("font");
  node.parentNode!.replaceChild(font, node);
  font.appendChild(node);
  return font;
}

describe("translationGuard", () => {
  it("removes a node that was moved into a wrapper", () => {
    const parent = document.createElement("div");
    const text = document.createTextNode("Peers");
    parent.appendChild(text);
    const font = wrapInFont(text);

    expect(() => parent.removeChild(text)).not.toThrow();
    expect(font.childNodes).toHaveLength(0);
  });

  it("ignores a node that was already detached", () => {
    const parent = document.createElement("div");
    const text = document.createTextNode("Peers");

    expect(() => parent.removeChild(text)).not.toThrow();
  });

  it("inserts before the wrapper holding the reference node", () => {
    const parent = document.createElement("div");
    const reference = document.createTextNode("Peers");
    parent.appendChild(reference);
    const font = wrapInFont(reference);
    const inserted = document.createElement("span");

    parent.insertBefore(inserted, reference);

    expect(Array.from(parent.childNodes)).toEqual([inserted, font]);
  });

  it("appends when the reference node is gone", () => {
    const parent = document.createElement("div");
    parent.appendChild(document.createElement("b"));
    const inserted = document.createElement("span");

    parent.insertBefore(inserted, document.createTextNode("gone"));

    expect(parent.lastChild).toBe(inserted);
  });

  it("keeps normal DOM behavior", () => {
    const parent = document.createElement("div");
    const a = document.createElement("a");
    const b = document.createElement("b");
    parent.appendChild(b);
    parent.insertBefore(a, b);
    parent.removeChild(b);

    expect(Array.from(parent.childNodes)).toEqual([a]);
  });
});
