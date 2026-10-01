import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Peer } from "@/interfaces/Peer";
import {
  ReverseProxy,
  ReverseProxyTarget,
  ReverseProxyTargetProtocol,
  ReverseProxyTargetType,
  ServiceMode,
  TargetAccessAction,
} from "@/interfaces/ReverseProxy";
import ReverseProxyTargetModal from "@/modules/reverse-proxy/targets/ReverseProxyTargetModal";

vi.mock("@/contexts/ReverseProxiesProvider", () => ({
  defaultPortForProtocol: (protocol: ReverseProxyTargetProtocol) =>
    protocol === ReverseProxyTargetProtocol.HTTPS ? 443 : 80,
  isResourceTargetType: (type: ReverseProxyTargetType) =>
    type === ReverseProxyTargetType.HOST ||
    type === ReverseProxyTargetType.DOMAIN ||
    type === ReverseProxyTargetType.SUBNET,
  useReverseProxies: () => ({ resources: [] }),
}));

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

const peer = { id: "peer-1", ip: "100.64.0.1" } as Peer;

function renderTargetModal(accessAction?: string) {
  const target = {
    target_type: ReverseProxyTargetType.PEER,
    target_id: peer.id,
    protocol: ReverseProxyTargetProtocol.HTTP,
    port: 80,
    path: "/api",
    enabled: true,
    access_action: accessAction,
  } as ReverseProxyTarget;
  const reverseProxy: ReverseProxy = {
    id: "service-1",
    name: "app.example.com",
    domain: "app.example.com",
    mode: ServiceMode.HTTP,
    targets: [target],
    enabled: true,
  };
  const onSave = vi.fn();

  render(
    <ReverseProxyTargetModal
      open={true}
      onOpenChange={vi.fn()}
      onSave={onSave}
      currentTarget={target}
      reverseProxy={reverseProxy}
      initialPeer={peer}
    />,
  );

  return onSave;
}

describe("ReverseProxyTargetModal access action", () => {
  it("saves an explicit inherit action by default", () => {
    const onSave = renderTargetModal();

    fireEvent.click(screen.getByTestId("submit-target"));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ access_action: TargetAccessAction.INHERIT }),
    );
  });

  it("saves the action selected in Optional Settings", async () => {
    const onSave = renderTargetModal();
    fireEvent.click(screen.getByTestId("target-optional-settings"));
    fireEvent.click(await screen.findByTestId("target-access-action"));
    fireEvent.click(
      await screen.findByRole("option", { name: "Bypass authentication" }),
    );

    fireEvent.click(screen.getByTestId("submit-target"));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ access_action: TargetAccessAction.BYPASS }),
    );
  });

  it("preserves an unknown action when other target settings are saved", () => {
    const onSave = renderTargetModal("future-action");

    fireEvent.click(screen.getByTestId("submit-target"));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ access_action: "future-action" }),
    );
  });
});
