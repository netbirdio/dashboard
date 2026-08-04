import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SegmentedTabs } from "./SegmentedTabs";

// Regression net for the app-wide SegmentedTabs, which the PR extended
// (optional `activationMode`, disabled styling). These pin the consumer
// contract: clicking a tab reports its value, the active tab's content shows,
// disabled tabs don't fire. Pre-PR API only, so it runs on both branches.
afterEach(cleanup);

const renderTabs = (value: string) => {
  const onChange = vi.fn();
  render(
    <SegmentedTabs value={value} onChange={onChange}>
      <SegmentedTabs.List>
        <SegmentedTabs.Trigger value={"a"} data-testid={"tab-a"}>
          Tab A
        </SegmentedTabs.Trigger>
        <SegmentedTabs.Trigger value={"b"} data-testid={"tab-b"}>
          Tab B
        </SegmentedTabs.Trigger>
        <SegmentedTabs.Trigger value={"c"} data-testid={"tab-c"} disabled>
          Tab C
        </SegmentedTabs.Trigger>
      </SegmentedTabs.List>
      <SegmentedTabs.Content value={"a"}>Content A</SegmentedTabs.Content>
      <SegmentedTabs.Content value={"b"}>Content B</SegmentedTabs.Content>
    </SegmentedTabs>,
  );
  return onChange;
};

describe("SegmentedTabs", () => {
  it("reports the selected tab's value via onChange", () => {
    const onChange = renderTabs("a");
    const tabB = screen.getByTestId("tab-b");
    // Radix Tabs (automatic mode) activate on focus; a real click focuses the
    // trigger, which jsdom's fireEvent.click doesn't do on its own.
    tabB.focus();
    fireEvent.click(tabB);
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("renders only the active tab's content", () => {
    renderTabs("a");
    expect(screen.getByText("Content A")).toBeTruthy();
    expect(screen.queryByText("Content B")).toBeNull();
  });

  it("does not fire onChange for a disabled tab", () => {
    const onChange = renderTabs("a");
    fireEvent.click(screen.getByTestId("tab-c"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
