import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The guard used to be installed by patching `window.next.router`, which the App
// Router never defines — so it silently guarded nothing. These tests pin the
// replacement: the guard is consulted by the router the caller actually uses.
const push = vi.fn();
const replace = vi.fn();
const back = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    replace,
    back,
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const { useGuardedRouter, useSetNavigationGuard } = await import(
  "@utils/navigation-guard"
);

// Vitest runs without `globals`, so RTL's auto-cleanup is not wired up.
afterEach(cleanup);
beforeEach(() => {
  push.mockClear();
  replace.mockClear();
  back.mockClear();
});

// One component so the guard and the router share a commit, as they do in
// DraftLeaveGuard.
const Subject = ({
  guard,
  onReady,
}: {
  guard: ((proceed: () => void) => void) | null;
  onReady: (r: Router) => void;
}) => {
  useSetNavigationGuard(guard);
  const router = useGuardedRouter();
  onReady(router);
  return null;
};

type Router = {
  push: (h: string) => void;
  replace: (h: string) => void;
  back: () => void;
};

// A guard with no router of its own, for stacking on top of a Subject.
const GuardOnly = ({ guard }: { guard: (proceed: () => void) => void }) => {
  useSetNavigationGuard(guard);
  return null;
};

const mount = (guard: ((proceed: () => void) => void) | null) => {
  let router!: Router;
  const view = render(<Subject guard={guard} onReady={(r) => (router = r)} />);
  return { router, view };
};

describe("useGuardedRouter", () => {
  it("passes straight through when no guard is installed", () => {
    const { router } = mount(null);
    router.push("/peers");
    expect(push).toHaveBeenCalledWith("/peers");
  });

  it("withholds the navigation until the guard proceeds", () => {
    let proceed: (() => void) | undefined;
    const { router } = mount((p) => {
      proceed = p;
    });

    router.push("/peers");
    expect(push).not.toHaveBeenCalled();

    proceed?.();
    expect(push).toHaveBeenCalledWith("/peers");
  });

  it("drops the navigation when the guard never proceeds", () => {
    const { router } = mount(() => {});
    router.push("/peers");
    router.replace("/settings");
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("guards replace as well as push", () => {
    let proceed: (() => void) | undefined;
    const { router } = mount((p) => {
      proceed = p;
    });
    router.replace("/settings");
    expect(replace).not.toHaveBeenCalled();
    proceed?.();
    expect(replace).toHaveBeenCalledWith("/settings");
  });

  it("stops guarding once the guard unmounts", () => {
    const { router, view } = mount(() => {});
    view.unmount();
    router.push("/peers");
    expect(push).toHaveBeenCalledWith("/peers");
  });

  it("guards back like push", () => {
    let proceed: (() => void) | undefined;
    const { router } = mount((p) => {
      proceed = p;
    });
    router.back();
    expect(back).not.toHaveBeenCalled();
    proceed?.();
    expect(back).toHaveBeenCalled();
  });

  it("keeps the older guard armed after the newer one unmounts", () => {
    const older = vi.fn();
    const newer = vi.fn();
    const { router } = mount(older);
    const stacked = render(<GuardOnly guard={newer} />);

    router.push("/peers");
    expect(newer).toHaveBeenCalledTimes(1);
    expect(older).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();

    // Unmounting the newer guard must hand control back, not disarm everything.
    stacked.unmount();
    router.push("/settings");
    expect(older).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });
});
