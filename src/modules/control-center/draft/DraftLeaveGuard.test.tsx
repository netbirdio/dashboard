import { cleanup, render } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Driven against jsdom's real session history: the navigation guard cannot see
// browser Back, so the sentinel entry is what has to be proven.
let changeCount = 0;
let isDraft = true;
let discardAnswer = true;
let hasPendingArtifacts = false;
const discardAndExit = vi.fn(async () => discardAnswer);
const routerPush = vi.fn();

// The guarded router's own consultation of activeGuard is covered by
// navigation-guard.test.tsx; here it only has to record the push. The guard
// callback itself is captured so the tests can trigger it like a guarded push.
let navGuard: ((proceed: () => void) => void) | null = null;
vi.mock("@utils/navigation-guard", () => ({
  useSetNavigationGuard: (guard: ((proceed: () => void) => void) | null) => {
    navGuard = guard;
  },
  useGuardedRouter: () => ({ push: routerPush }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));
vi.mock("@/modules/control-center/draft/DraftModeContext", () => ({
  useDraftMode: () => ({ isDraft }),
}));
vi.mock("@/modules/control-center/draft/DraftChangesetContext", () => ({
  useDraftChangeset: () => ({ changeCount }),
}));
vi.mock("@/modules/control-center/draft/useDiscardDraft", () => ({
  useDiscardDraft: () => ({ discardAndExit }),
}));
vi.mock("@/modules/control-center/hooks/usePlaceholderArtifacts", () => ({
  usePendingArtifacts: () => hasPendingArtifacts,
}));

const { DraftLeaveGuard } = await import(
  "@/modules/control-center/draft/DraftLeaveGuard"
);

const GUARD_MARK = "ccDraftGuard";
const settle = () => act(async () => void (await Promise.resolve()));
// jsdom dispatches popstate asynchronously, like a browser.
const pressBack = async () => {
  await act(async () => {
    window.history.back();
    await new Promise((r) => setTimeout(r, 20));
  });
};
const ownsCurrentEntry = () =>
  !!(window.history.state as Record<string, unknown> | null)?.[GUARD_MARK];

// Vitest runs without `globals`, so RTL's auto-cleanup is not wired up: a left
// over mount would keep its own popstate listener and answer every Back too.
afterEach(cleanup);

beforeEach(async () => {
  discardAndExit.mockClear();
  routerPush.mockClear();
  navGuard = null;
  changeCount = 0;
  isDraft = true;
  discardAnswer = true;
  hasPendingArtifacts = false;
  // Back needs somewhere to go.
  window.history.replaceState({ page: "prev" }, "", "/prev");
  window.history.pushState({ page: "cc" }, "", "/control-center");
});

describe("the sentinel history entry", () => {
  it("is pushed once the draft has changes, and not before", async () => {
    const { rerender } = render(<DraftLeaveGuard />);
    expect(ownsCurrentEntry()).toBe(false);

    changeCount = 1;
    await act(async () => rerender(<DraftLeaveGuard />));
    expect(ownsCurrentEntry()).toBe(true);
  });

  it("is not stacked again when changes drop to zero and come back", async () => {
    changeCount = 1;
    const { rerender } = render(<DraftLeaveGuard />);
    const depth = window.history.length;

    for (let i = 0; i < 4; i++) {
      changeCount = 0;
      await act(async () => rerender(<DraftLeaveGuard />));
      changeCount = 1;
      await act(async () => rerender(<DraftLeaveGuard />));
    }
    expect(window.history.length).toBe(depth);
  });
});

describe("browser Back with pending changes", () => {
  it("asks instead of leaving silently", async () => {
    changeCount = 1;
    discardAnswer = false;
    render(<DraftLeaveGuard />);

    await pressBack();
    await settle();

    expect(discardAndExit).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/control-center");
    expect(ownsCurrentEntry()).toBe(true);
  });

  it("asks again after a cancel", async () => {
    changeCount = 1;
    discardAnswer = false;
    render(<DraftLeaveGuard />);

    await pressBack();
    await settle();
    await pressBack();
    await settle();

    expect(discardAndExit).toHaveBeenCalledTimes(2);
    expect(window.location.pathname).toBe("/control-center");
  });

  it("leaves once the discard is confirmed", async () => {
    changeCount = 1;
    discardAnswer = true;
    render(<DraftLeaveGuard />);

    await pressBack();
    await settle();
    // go(-2) clears the sentinel and the page entry both.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(discardAndExit).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/prev");
  });

  it("does nothing without pending changes", async () => {
    changeCount = 0;
    render(<DraftLeaveGuard />);

    await pressBack();
    await settle();

    expect(discardAndExit).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/prev");
  });
});

// discardAndExit is what sweeps leftover keys and groups, and changeCount alone
// does not tell you whether any exist.
describe("leftover placeholder artifacts keep the sweep reachable", () => {
  it("guards an empty changeset that still owns real API objects", async () => {
    changeCount = 0;
    hasPendingArtifacts = true;
    discardAnswer = false;
    render(<DraftLeaveGuard />);

    await pressBack();
    await settle();

    expect(discardAndExit).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/control-center");
  });

  it("intercepts an in-app link so the sweep runs before the route changes", async () => {
    changeCount = 0;
    hasPendingArtifacts = true;
    render(<DraftLeaveGuard />);

    const anchor = document.createElement("a");
    anchor.href = "/peers";
    document.body.appendChild(anchor);
    await act(async () => {
      anchor.click();
      await Promise.resolve();
    });
    anchor.remove();

    expect(routerPush).toHaveBeenCalledWith("/peers");
  });

  // A reload can't sweep, but the prompt is the user's only chance to cancel and
  // leave through discardAndExit, which is what deletes the setup key.
  it("prompts on reload when only the artifact registry is non-empty", async () => {
    changeCount = 0;
    hasPendingArtifacts = true;
    render(<DraftLeaveGuard />);

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("leaves reload unprompted once nothing is left to sweep", async () => {
    changeCount = 0;
    hasPendingArtifacts = false;
    render(<DraftLeaveGuard />);

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("stands down once nothing is left to sweep", async () => {
    changeCount = 0;
    hasPendingArtifacts = false;
    render(<DraftLeaveGuard />);

    await pressBack();
    await settle();

    expect(discardAndExit).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/prev");
  });
});

describe("a Back arriving while the dialog is still open", () => {
  // The sentinel is the whole protection: consuming it without renewing leaves
  // the next Back free to walk off the page unprompted.
  it("renews the sentinel instead of spending it", async () => {
    changeCount = 1;
    let release: (v: boolean) => void = () => {};
    discardAndExit.mockImplementationOnce(
      () => new Promise<boolean>((r) => (release = r)),
    );
    render(<DraftLeaveGuard />);

    await pressBack();
    expect(discardAndExit).toHaveBeenCalledTimes(1);

    await pressBack();
    expect(ownsCurrentEntry()).toBe(true);
    expect(window.location.pathname).toBe("/control-center");
    // One dialog at a time; the renewed sentinel does the blocking.
    expect(discardAndExit).toHaveBeenCalledTimes(1);

    // A third Back must still be answered, not walk off the page.
    await pressBack();
    expect(window.location.pathname).toBe("/control-center");

    await act(async () => {
      release(false);
      await Promise.resolve();
    });
    expect(window.location.pathname).toBe("/control-center");
  });

  it("asks again once an unresolved round is cancelled", async () => {
    changeCount = 1;
    let release: (v: boolean) => void = () => {};
    discardAndExit.mockImplementationOnce(
      () => new Promise<boolean>((r) => (release = r)),
    );
    render(<DraftLeaveGuard />);

    await pressBack();
    await pressBack();
    await act(async () => {
      release(false);
      await Promise.resolve();
    });

    discardAnswer = false;
    await pressBack();
    await settle();
    expect(discardAndExit).toHaveBeenCalledTimes(2);
    expect(window.location.pathname).toBe("/control-center");
  });
});

// DialogProvider holds a single resolver: a second confirm() while one dialog is
// open orphans the first dialog's promise, so both trigger paths share one latch.
describe("the guarded-push and popstate paths never stack dialogs", () => {
  it("ignores a guarded push while the popstate dialog is open", async () => {
    changeCount = 1;
    let release: (v: boolean) => void = () => {};
    discardAndExit.mockImplementationOnce(
      () => new Promise<boolean>((r) => (release = r)),
    );
    render(<DraftLeaveGuard />);

    await pressBack();
    expect(discardAndExit).toHaveBeenCalledTimes(1);

    const proceed = vi.fn();
    act(() => navGuard?.(proceed));
    expect(discardAndExit).toHaveBeenCalledTimes(1);

    await act(async () => {
      release(false);
      await Promise.resolve();
    });
    expect(proceed).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/control-center");
  });

  it("ignores a Back while the guarded-push dialog is open", async () => {
    changeCount = 1;
    let release: (v: boolean) => void = () => {};
    discardAndExit.mockImplementationOnce(
      () => new Promise<boolean>((r) => (release = r)),
    );
    render(<DraftLeaveGuard />);

    const proceed = vi.fn();
    act(() => navGuard?.(proceed));
    expect(discardAndExit).toHaveBeenCalledTimes(1);

    await pressBack();
    expect(discardAndExit).toHaveBeenCalledTimes(1);
    // The renewed sentinel keeps the page in place meanwhile.
    expect(window.location.pathname).toBe("/control-center");
    expect(ownsCurrentEntry()).toBe(true);

    await act(async () => {
      release(true);
      await Promise.resolve();
    });
    expect(proceed).toHaveBeenCalledTimes(1);
  });

  it("asks again through the guard once the round is answered", async () => {
    changeCount = 1;
    discardAnswer = false;
    render(<DraftLeaveGuard />);

    const proceed = vi.fn();
    await act(async () => {
      navGuard?.(proceed);
      await Promise.resolve();
    });
    expect(discardAndExit).toHaveBeenCalledTimes(1);
    expect(proceed).not.toHaveBeenCalled();

    discardAnswer = true;
    await act(async () => {
      navGuard?.(proceed);
      await Promise.resolve();
    });
    expect(discardAndExit).toHaveBeenCalledTimes(2);
    expect(proceed).toHaveBeenCalledTimes(1);
  });
});

describe("drill-down levels keep owning their own entries", () => {
  it("defers when Back lands on a drill-down entry", async () => {
    changeCount = 1;
    render(<DraftLeaveGuard />);
    window.history.pushState({ controlCenterDrill: "network" }, "");
    window.history.pushState({ controlCenterDrill: "resource" }, "");

    await pressBack();
    await settle();

    expect(discardAndExit).not.toHaveBeenCalled();
  });

  it("defers when Back lands back on the sentinel itself", async () => {
    changeCount = 1;
    render(<DraftLeaveGuard />);
    window.history.pushState({ controlCenterDrill: "network" }, "");

    await pressBack();
    await settle();

    expect(ownsCurrentEntry()).toBe(true);
    expect(discardAndExit).not.toHaveBeenCalled();
  });

  it("still guards the page once the drill entries are spent", async () => {
    changeCount = 1;
    discardAnswer = false;
    render(<DraftLeaveGuard />);
    window.history.pushState({ controlCenterDrill: "network" }, "");

    await pressBack();
    await settle();
    expect(discardAndExit).not.toHaveBeenCalled();

    await pressBack();
    await settle();
    expect(discardAndExit).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/control-center");
  });
});
