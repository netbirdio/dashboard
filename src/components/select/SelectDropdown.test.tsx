import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { SelectDropdown, SelectOption } from "./SelectDropdown";

// Regression net for the app-wide SelectDropdown. This is the shared component
// the PR changed most invasively (its onChange now fires after the popover's
// close animation), so these tests pin the CONSUMER CONTRACT every dropdown in
// the app depends on, using only the pre-PR API so they run identically on
// main and on the branch:
//   • selecting an option eventually reports its value via onChange
//   • re-selecting the already-selected value does NOT fire onChange
//   • the trigger shows the selected option's label
// The contract is "eventually" (waitFor) precisely so it holds whether onChange
// is synchronous (main) or deferred (branch) — a red here means a real break.

// jsdom lacks the observers / layout APIs Radix Popover + cmdk + the option
// rows (useIsVisible → IntersectionObserver) rely on. Report intersection
// immediately so option rows mount, and stub the rest.
beforeAll(() => {
  class IO {
    private cb: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback) {
      this.cb = cb;
    }
    observe(el: Element) {
      this.cb(
        [{ isIntersecting: true, target: el } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", IO);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
});

afterEach(cleanup);

const OPTIONS: SelectOption[] = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
];

const setup = (value = "a") => {
  const onChange = vi.fn();
  render(
    <SelectDropdown
      value={value}
      onChange={onChange}
      options={OPTIONS}
      data-testid={"dd"}
    />,
  );
  return onChange;
};

describe("SelectDropdown", () => {
  it("shows the selected option's label on the trigger", () => {
    setup("a");
    expect(screen.getByTestId("dd").textContent).toContain("Alpha");
  });

  it("reports the picked option's value via onChange", async () => {
    const onChange = setup("a");
    fireEvent.click(screen.getByTestId("dd"));
    // Target the option row (role=option) — the selected label also appears on
    // the trigger, so a plain text query would be ambiguous.
    const beta = await screen.findByRole("option", { name: "Beta" });
    fireEvent.click(beta);
    // Contract holds whether onChange is synchronous (main) or deferred
    // (branch) — waitFor tolerates both.
    await waitFor(() => expect(onChange).toHaveBeenCalledWith("b"));
  });

  it("does not fire onChange when the already-selected value is picked", async () => {
    const onChange = setup("a");
    fireEvent.click(screen.getByTestId("dd"));
    const alpha = await screen.findByRole("option", { name: "Alpha" });
    fireEvent.click(alpha);
    // Give any deferred onChange time to (not) fire.
    await new Promise((r) => setTimeout(r, 250));
    expect(onChange).not.toHaveBeenCalled();
  });
});
