import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Policy = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
};

const ai = {
  settings: { endpoint: "calm-heron.proxy.company.com" } as unknown,
  providers: [] as { id: string; name: string; enabled: boolean }[],
  policies: [] as Policy[],
  policiesLoaded: true,
  addPolicy: vi.fn(),
  togglePolicy: vi.fn(),
  openWizard: vi.fn(),
  closeWizard: vi.fn(),
  isWizardOpen: false,
};
let groups: { id: string; name: string }[] = [];

vi.mock("@/modules/agent-network/AIProvidersProvider", () => ({
  useAIProviders: () => ai,
}));
vi.mock("@/contexts/GroupsProvider", () => ({
  useGroups: () => ({ groups }),
}));
vi.mock("@/modules/agent-network/AIProviderModal", () => ({
  default: () => null,
}));

const { OnboardingAgentProvider } = await import(
  "@/modules/onboarding/agent-network/OnboardingAgentProvider"
);

beforeEach(() => {
  ai.providers = [{ id: "p1", name: "OpenAI", enabled: true }];
  ai.policies = [];
  ai.policiesLoaded = true;
  ai.addPolicy = vi.fn(async () => undefined);
  groups = [
    { id: "g-all", name: "All" },
    { id: "g-users", name: "Users" },
  ];
});
afterEach(cleanup);

// renderStep renders the step and settles the policy create; the returned
// rerender renders it again, reading the context anew.
const renderStep = async (createsPolicy = true) => {
  const props = { createsPolicy, onBack: vi.fn(), onNext: vi.fn() };
  const view = render(<OnboardingAgentProvider {...props} />);
  const rerender = () =>
    act(async () => view.rerender(<OnboardingAgentProvider {...props} />));
  await rerender();
  return rerender;
};

describe("OnboardingAgentProvider", () => {
  it("creates one policy from the Users group to the first provider", async () => {
    ai.addPolicy = vi.fn(async () => ({ id: "pol1" }));
    const rerender = await renderStep();
    // The provider list is read again while the create is in flight.
    ai.providers = ai.providers.map((p) => ({ ...p }));
    await rerender();

    expect(ai.addPolicy).toHaveBeenCalledTimes(1);
    expect(ai.addPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Users to OpenAI",
        enabled: true,
        sourceGroups: ["g-users"],
        destinationProviderIds: ["p1"],
      }),
    );
    expect(screen.getByText("Creating a policy…")).toBeTruthy();
  });

  it("offers to try again when the policy cannot be created", async () => {
    await renderStep();
    expect(
      screen.getByTestId("agent-network-starter-policy-failed"),
    ).toBeTruthy();
    expect(
      ai.addPolicy,
      "a refused create waits for a retry",
    ).toHaveBeenCalledTimes(1);

    ai.addPolicy = vi.fn(async () => ({ id: "pol1" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    });
    expect(ai.addPolicy).toHaveBeenCalledTimes(1);
  });

  it("reports a failure when no group can start the policy", async () => {
    groups = [{ id: "g-dev", name: "Developers" }];
    await renderStep();
    expect(
      screen.getByTestId("agent-network-starter-policy-failed"),
    ).toBeTruthy();
    expect(ai.addPolicy).not.toHaveBeenCalled();
  });

  it("waits for the groups before reporting a missing one", async () => {
    groups = undefined as unknown as typeof groups;
    await renderStep();
    expect(screen.getByText("Creating a policy…")).toBeTruthy();
    expect(
      screen.queryByTestId("agent-network-starter-policy-failed"),
    ).toBeNull();
  });

  it("waits for the policy list before creating a policy", async () => {
    ai.policiesLoaded = false;
    await renderStep();
    expect(
      ai.addPolicy,
      "an unread list could hold the account's policies",
    ).not.toHaveBeenCalled();
  });

  it("shows the account's policy instead of creating another", async () => {
    ai.policies = [
      {
        id: "pol1",
        name: "Users to OpenAI",
        description: "Lets the Users group reach OpenAI",
        enabled: true,
      },
    ];
    await renderStep();
    expect(ai.addPolicy).not.toHaveBeenCalled();
    expect(screen.getByText("Lets the Users group reach OpenAI")).toBeTruthy();
  });

  it("leaves the policy to the policy step where the flow has one", async () => {
    await renderStep(false);
    expect(ai.addPolicy).not.toHaveBeenCalled();
    expect(screen.queryByTestId("agent-network-starter-policy")).toBeNull();
  });
});
