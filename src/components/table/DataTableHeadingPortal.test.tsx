import "@/utils/translationGuard";
import { DataTableHeadingPortal } from "@components/table/DataTableHeadingPortal";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function createHeading() {
  const heading = document.createElement("h1");
  heading.textContent = "Peers";
  document.body.appendChild(heading);
  return heading;
}

function renderPortal(heading: HTMLHeadingElement, totalRecords = 12) {
  return (
    <DataTableHeadingPortal
      table={null}
      headingTarget={heading}
      manualPagination
      totalRecords={totalRecords}
    />
  );
}

// Mimics Google Translate, which swaps text nodes for <font> wrappers.
function translate(root: Element) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    const font = document.createElement("font");
    font.textContent = node.nodeValue;
    node.parentNode!.replaceChild(font, node);
  }
}

describe("DataTableHeadingPortal", () => {
  it("keeps a single count container across re-renders", () => {
    const heading = createHeading();
    const { rerender } = render(renderPortal(heading));
    for (let i = 0; i < 5; i++) rerender(renderPortal(heading, 12 + i));

    expect(heading.querySelectorAll("span")).toHaveLength(1);
    expect(heading.textContent).toBe("16 Peers");
  });

  it("removes its container on unmount", () => {
    const heading = createHeading();
    const { unmount } = render(renderPortal(heading));
    unmount();

    expect(heading.innerHTML).toBe("Peers");
  });

  it("survives updates and unmount after the heading was translated", () => {
    const heading = createHeading();
    const { rerender, unmount } = render(renderPortal(heading));
    translate(heading);

    expect(() => act(() => rerender(renderPortal(heading, 13)))).not.toThrow();
    expect(() => unmount()).not.toThrow();
  });
});
