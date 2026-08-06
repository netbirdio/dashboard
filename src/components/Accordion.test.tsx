import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./Accordion";

// Animation isn't observable in jsdom, so these pin the functional contract:
// children render and the trigger toggles the item's open state.
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
