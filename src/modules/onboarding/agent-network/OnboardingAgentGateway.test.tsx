import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Settings = { endpoint: string; proxyAddress: string };

const ai = {
  settings: undefined as Settings | undefined,
  settingsLoading: false,
  bootstrapAgentNetworkSettings: vi.fn(),
};
const managed = {
  proxy: undefined as
    | { id: string; state: string; endpoint: string }
    | undefined,
  isLoading: false,
  provision: vi.fn(),
};
let cluster: unknown;
const mutate = vi.fn();
const notify = vi.fn();

vi.mock("@/modules/agent-network/AIProvidersProvider", () => ({
  useAIProviders: () => ai,
}));
vi.mock("@/modules/agent-network/useManagedProxy", () => ({
  useManagedProxy: () => managed,
}));
vi.mock("@/contexts/UsersProvider", () => ({
  useLoggedInUser: () => ({ isOwner: true }),
}));
vi.mock("@/modules/reverse-proxy/clusters/useProxyCluster", () => ({
  useProxyCluster: (domain?: string) => (domain ? cluster : undefined),
}));
vi.mock("@utils/api", () => ({
  default: () => ({ data: [], isLoading: false }),
}));
vi.mock("swr", () => ({ useSWRConfig: () => ({ mutate }) }));
vi.mock("@components/Notification", () => ({
  notify: (props: unknown) => notify(props),
}));
// The clusters modal has its own page; here it only hands back the domain the
// operator finished the setup for.
vi.mock("@/modules/reverse-proxy/clusters/ClustersModal", () => ({
  ClustersModal: ({
    open,
    onFinish,
  }: {
    open: boolean;
    onFinish?: (domain: string) => void;
  }) =>
    open ? (
      <button onClick={() => onFinish?.("proxy.company.com")}>
        Finish Setup
      </button>
    ) : null,
}));

const { OnboardingAgentGateway } = await import(
  "@/modules/onboarding/agent-network/OnboardingAgentGateway"
);

const MANAGED_ENDPOINT = "brave-otter.gateway.netbird.io";

beforeEach(() => {
  ai.settings = undefined;
  ai.settingsLoading = false;
  ai.bootstrapAgentNetworkSettings = vi.fn(async () => true);
  managed.proxy = undefined;
  managed.isLoading = false;
  managed.provision = vi.fn(async () => ({
    kind: "deployment",
    proxy: { id: "m1", state: "provisioning", endpoint: MANAGED_ENDPOINT },
  }));
  cluster = undefined;
  mutate.mockReset();
  mutate.mockResolvedValue(undefined);
  notify.mockReset();
});
afterEach(cleanup);

const step = () => {
  const props = { onBack: vi.fn(), onNext: vi.fn(), onSkip: vi.fn() };
  const view = render(<OnboardingAgentGateway {...props} />);
  const rerender = () => view.rerender(<OnboardingAgentGateway {...props} />);
  return { ...props, rerender };
};

const readyToast = expect.objectContaining({ title: "Your gateway is ready" });

describe("OnboardingAgentGateway", () => {
  it("moves on with one toast once the managed gateway is ready", () => {
    managed.proxy = {
      id: "m1",
      state: "provisioning",
      endpoint: MANAGED_ENDPOINT,
    };
    const { onNext, rerender } = step();
    expect(screen.getByText("Setting up your managed gateway…")).toBeTruthy();

    // Ready is not enough on its own: the provider step needs the settings
    // row, so the step waits until the settings carry the endpoint.
    managed.proxy = { ...managed.proxy, state: "ready" };
    rerender();
    expect(mutate).toHaveBeenCalledWith("/agent-network/settings");
    expect(onNext, "still waiting for the settings").not.toHaveBeenCalled();

    ai.settings = {
      endpoint: MANAGED_ENDPOINT,
      proxyAddress: "gateway.netbird.io",
    };
    rerender();
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(readyToast);

    // A settings read that drops the endpoint and brings it back must not
    // move the flow on twice.
    ai.settings = undefined;
    rerender();
    ai.settings = {
      endpoint: MANAGED_ENDPOINT,
      proxyAddress: "gateway.netbird.io",
    };
    rerender();
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("skips a gateway that was ready before the step opened, without a toast", () => {
    managed.proxy = { id: "m1", state: "ready", endpoint: MANAGED_ENDPOINT };
    ai.settings = {
      endpoint: MANAGED_ENDPOINT,
      proxyAddress: "gateway.netbird.io",
    };
    const { onNext, onSkip } = step();
    expect(onSkip).toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("waits for the proxy set up in the clusters modal, then moves on", async () => {
    const { onNext, rerender } = step();
    fireEvent.click(screen.getByTestId("gateway-choice-own-proxy"));
    fireEvent.click(screen.getByTestId("gateway-choice-self-deploy"));
    fireEvent.click(screen.getByText("Finish Setup"));

    expect(screen.getByText("Connecting your proxy")).toBeTruthy();
    expect(
      screen.getByTestId("gateway-self-deploy-status").dataset.phase,
      "nothing registered for the domain yet",
    ).toBe("waiting");

    cluster = {
      id: "c1",
      address: "proxy.company.com",
      type: "account",
      online: true,
      connected_proxies: 1,
      private: true,
    };
    await act(async () => rerender());
    expect(ai.bootstrapAgentNetworkSettings).toHaveBeenCalledWith(
      "proxy.company.com",
    );
    expect(onNext, "the endpoint is not reserved yet").not.toHaveBeenCalled();

    ai.settings = {
      endpoint: "calm-heron.proxy.company.com",
      proxyAddress: "proxy.company.com",
    };
    rerender();
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(readyToast);
  });

  it("offers only a proxy of the account's own where managed gateways are not configured", async () => {
    managed.provision = vi.fn(async () => ({ kind: "not-configured" }));
    const { onNext } = step();
    await act(async () => {
      fireEvent.click(screen.getByTestId("gateway-choice-managed"));
    });

    expect(screen.getByTestId("gateway-managed-unavailable")).toBeTruthy();
    expect(screen.queryByTestId("gateway-choice-managed")).toBeNull();
    expect(
      screen.getByTestId("gateway-choice-self-deploy"),
      "the own-proxy options are open, as the only way on",
    ).toBeTruthy();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("moves on when the account turns out to have an endpoint already", async () => {
    managed.provision = vi.fn(async () => ({
      kind: "conflict",
      endpoint: "calm-heron.proxy.company.com",
    }));
    const { onNext } = step();
    await act(async () => {
      fireEvent.click(screen.getByTestId("gateway-choice-managed"));
    });

    expect(mutate).toHaveBeenCalledWith("/agent-network/settings");
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Your gateway is already set up" }),
    );
  });
});
