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
