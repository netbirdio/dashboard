import { cleanup, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A sidebar item is a <button>, so the draft leave guard's anchor interceptor cannot
// see it and the guarded router is the only thing between a nav click and an unsaved
// draft. The guard itself is exercised in utils/navigation-guard.test.tsx.
const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/control-center",
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/contexts/ApplicationProvider", () => ({
  useApplicationContext: () => ({
    mobileNavOpen: false,
    toggleMobileNav: vi.fn(),
    isNavigationCollapsed: false,
  }),
}));

// Not mocked: the real guard is the subject here.
const { useSetNavigationGuard } = await import("@utils/navigation-guard");
const SidebarItem = (await import("@/components/SidebarItem")).default;

const Subject = ({
  guard,
}: {
  guard: ((proceed: () => void) => void) | null;
}) => {
  useSetNavigationGuard(guard);
  return <SidebarItem href={"/peers"} label={"Peers"} visible={true} />;
};

const clickNavItem = async () => {
  await act(async () => {
    screen.getByTestId("left-navigation-item").click();
  });
};

afterEach(cleanup);
beforeEach(() => push.mockClear());

describe("SidebarItem navigation", () => {
  it("navigates straight through when no guard is installed", async () => {
    render(<Subject guard={null} />);
    await clickNavItem();
    expect(push).toHaveBeenCalledWith("/peers");
  });

  it("withholds the navigation while a guard is installed", async () => {
    let proceed: (() => void) | undefined;
    render(<Subject guard={(p) => (proceed = p)} />);

    await clickNavItem();

    expect(push).not.toHaveBeenCalled();
    expect(proceed).toBeTypeOf("function");
  });

  it("navigates once the guard proceeds", async () => {
    let proceed: (() => void) | undefined;
    render(<Subject guard={(p) => (proceed = p)} />);

    await clickNavItem();
    await act(async () => proceed?.());

    expect(push).toHaveBeenCalledWith("/peers");
  });
});

// Pages both products show link with their product, `?product=…`; the item
// still matches its route, whatever the current URL's query.
describe("SidebarItem with a query in its href", () => {
  const isActive = () =>
    document.querySelector("[data-active]")?.getAttribute("data-active");

  it("is active on its route", () => {
    render(
      <SidebarItem
        href={"/control-center?product=agent-network"}
        label={"Control Center"}
        visible={true}
      />,
    );
    expect(isActive()).toBe("true");
  });

  it("is not active on another route", () => {
    render(
      <SidebarItem
        href={"/peers?product=agent-network"}
        label={"Peers"}
        visible={true}
      />,
    );
    expect(isActive()).toBe("false");
  });

  it("navigates with the query", async () => {
    render(
      <SidebarItem
        href={"/peers?product=agent-network"}
        label={"Peers"}
        visible={true}
      />,
    );
    await clickNavItem();
    expect(push).toHaveBeenCalledWith("/peers?product=agent-network");
  });

  it("does not navigate to the page it is already on", async () => {
    render(
      <SidebarItem
        href={"/control-center?product=agent-network"}
        label={"Control Center"}
        visible={true}
      />,
    );
    await clickNavItem();
    expect(push).not.toHaveBeenCalled();
  });

  it("opens its group when a child's route is current", () => {
    render(
      <SidebarItem label={"Overview"} collapsible visible={true}>
        <SidebarItem
          href={"/control-center?product=networking"}
          label={"Control Center"}
          isChild
          visible={true}
        />
      </SidebarItem>,
    );
    expect(screen.getByText("Control Center")).toBeTruthy();
  });
});

// The distributor sidebar hides items with CSS keyed on data-nav-item, so it
// carries the route alone, whatever product the link names.
describe("SidebarItem data-nav-item", () => {
  it("is the route without the query", () => {
    render(
      <SidebarItem
        href={"/peers?product=agent-network"}
        label={"Peers"}
        visible={true}
      />,
    );
    expect(
      document.querySelector("[data-nav-item]")?.getAttribute("data-nav-item"),
    ).toBe("/peers");
  });
});
