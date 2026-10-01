import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { TargetAccessAction } from "@/interfaces/ReverseProxy";
import ReverseProxyTargetAccessActionBadge from "@/modules/reverse-proxy/targets/ReverseProxyTargetAccessActionBadge";
import ReverseProxyTargetAccessControl from "@/modules/reverse-proxy/targets/ReverseProxyTargetAccessControl";

beforeAll(() => {
  class IntersectionObserverMock {
    private readonly callback: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }

    observe(element: Element) {
      this.callback(
        [
          {
            isIntersecting: true,
            target: element,
          } as IntersectionObserverEntry,
        ],
        this as unknown as IntersectionObserver,
      );
    }

    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }

  vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
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

function renderControl({
  value,
  supported = true,
  privateService = false,
}: {
  value?: string;
  supported?: boolean;
  privateService?: boolean;
} = {}) {
  const onChange = vi.fn();
  render(
    <ReverseProxyTargetAccessControl
      value={value}
      onChange={onChange}
      supportsTargetAccessControl={supported}
      privateService={privateService}
    />,
  );
  return onChange;
}

async function openOptions() {
  fireEvent.click(screen.getByTestId("target-access-action"));
  return {
    inherit: await screen.findByRole("option", {
      name: "Use service authentication",
    }),
    bypass: await screen.findByRole("option", {
      name: "Bypass authentication",
    }),
    block: await screen.findByRole("option", { name: "Block access" }),
  };
}

describe("ReverseProxyTargetAccessControl", () => {
  it("defaults to service authentication and selects supported actions", async () => {
    const onChange = renderControl();
    expect(screen.getByTestId("target-access-action").textContent).toContain(
      "Use service authentication",
    );

    const { bypass } = await openOptions();
    fireEvent.click(bypass);

    expect(onChange).toHaveBeenCalledWith(TargetAccessAction.BYPASS);
  });

  it("disables bypass and block when the cluster lacks the capability", async () => {
    const onChange = renderControl({ supported: false });
    const { bypass, block } = await openOptions();

    expect(bypass.getAttribute("data-disabled")).toBe("true");
    expect(block.getAttribute("data-disabled")).toBe("true");
    fireEvent.click(bypass);
    fireEvent.click(block);

    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByTestId("target-access-control-unsupported-cluster"),
    ).toBeTruthy();
  });

  it("disables bypass for private services but still allows block", async () => {
    const onChange = renderControl({ privateService: true });
    const { bypass, block } = await openOptions();

    expect(bypass.getAttribute("data-disabled")).toBe("true");
    expect(block.getAttribute("data-disabled")).toBe("false");
    fireEvent.click(bypass);
    fireEvent.click(block);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(TargetAccessAction.BLOCK);
    expect(
      screen.getByTestId("target-access-control-private-service"),
    ).toBeTruthy();
  });

  it("surfaces and preserves an unsupported action", () => {
    const onChange = renderControl({ value: "future-action" });

    expect(screen.getByTestId("target-access-action").textContent).toContain(
      "Unsupported setting (future-action)",
    );
    expect(screen.getByTestId("target-access-action-unsupported")).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("ReverseProxyTargetAccessActionBadge", () => {
  it("shows badges for bypass, block, and unsupported actions", () => {
    const { rerender } = render(
      <ReverseProxyTargetAccessActionBadge
        action={TargetAccessAction.BYPASS}
      />,
    );
    expect(screen.getByText("Bypass Auth")).toBeTruthy();

    rerender(
      <ReverseProxyTargetAccessActionBadge action={TargetAccessAction.BLOCK} />,
    );
    expect(screen.getByText("Blocked")).toBeTruthy();

    rerender(<ReverseProxyTargetAccessActionBadge action={"future-action"} />);
    expect(screen.getByText("Custom Access")).toBeTruthy();
  });

  it("does not show a badge for inherited access", () => {
    const { container } = render(
      <ReverseProxyTargetAccessActionBadge
        action={TargetAccessAction.INHERIT}
      />,
    );
    expect(container.childElementCount).toBe(0);
  });
});
