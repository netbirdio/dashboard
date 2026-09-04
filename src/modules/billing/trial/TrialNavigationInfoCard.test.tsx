import { cleanup, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// NavigationUsageInfo swaps itself out for this card on a trial account, so this is
// the nav chrome there and it can fire over an open draft. Its trigger is a <button>,
// invisible to the leave guard's anchor interceptor. Sibling of SidebarItem.test.tsx.
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/cloud/cloud-hooks/useTrial", () => ({
  useTrial: () => ({ trialDaysRemaining: 7 }),
}));
vi.mock("@/contexts/UsersProvider", () => ({
  useLoggedInUser: () => ({ isOwnerOrAdmin: true }),
}));

// Not mocked: the real guard is the subject here.
const { useSetNavigationGuard } = await import("@utils/navigation-guard");
const { TrialNavigationInfoCard } = await import(
  "@/modules/billing/trial/TrialNavigationInfoCard"
);

const Subject = ({
  guard,
}: {
  guard: ((proceed: () => void) => void) | null;
}) => {
  useSetNavigationGuard(guard);
  return <TrialNavigationInfoCard />;
};

const clickUpgrade = async () => {
  await act(async () => {
    screen.getByRole("button", { name: /upgrade plan/i }).click();
  });
};

afterEach(cleanup);
beforeEach(() => push.mockClear());

describe("TrialNavigationInfoCard navigation", () => {
  it("navigates straight through when no guard is installed", async () => {
    render(<Subject guard={null} />);
    await clickUpgrade();
    expect(push).toHaveBeenCalledWith("/settings?tab=plans-and-billing");
  });

  it("withholds the navigation while a guard is installed", async () => {
    let proceed: (() => void) | undefined;
    render(<Subject guard={(p) => (proceed = p)} />);

    await clickUpgrade();

    expect(push).not.toHaveBeenCalled();
    expect(proceed).toBeTypeOf("function");
  });

  it("navigates once the guard proceeds", async () => {
    let proceed: (() => void) | undefined;
    render(<Subject guard={(p) => (proceed = p)} />);

    await clickUpgrade();
    await act(async () => proceed?.());

    expect(push).toHaveBeenCalledWith("/settings?tab=plans-and-billing");
  });
});
