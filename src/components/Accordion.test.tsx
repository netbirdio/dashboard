import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./Accordion";

// Regression net for the app-wide Accordion. The PR reworked AccordionContent's
// open/close sync (useEffect → useLayoutEffect + a MutationObserver on
// data-state, first-mount-without-animation) and added an optional `animated`
// prop (default true = pre-PR). Animation itself isn't observable in jsdom, so
// these pin the functional contract that must survive: children render, and the
// trigger toggles the item's open state. Pre-PR API only → runs on both
// branches.
afterEach(cleanup);

const renderAccordion = () =>
  render(
    <Accordion type={"single"} collapsible defaultValue={"item-1"}>
      <AccordionItem value={"item-1"}>
        <AccordionTrigger>Header One</AccordionTrigger>
        <AccordionContent>Body One</AccordionContent>
      </AccordionItem>
    </Accordion>,
  );

describe("Accordion", () => {
  it("renders trigger and content without crashing (open by default)", () => {
    renderAccordion();
    expect(screen.getByText("Header One")).toBeTruthy();
    expect(screen.getByText("Body One")).toBeTruthy();
    // defaultValue opens item-1.
    expect(screen.getByText("Header One").getAttribute("aria-expanded")).toBe(
      "true",
    );
  });

  it("toggles the item's expanded state on trigger click", () => {
    renderAccordion();
    const trigger = screen.getByText("Header One");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });
});
