import { act, cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ai = {
  settings: { endpoint: "calm-heron.proxy.company.com" } as unknown,
  providers: [] as { id: string; name: string; enabled: boolean }[],
  policies: [] as { id: string }[],
  policiesLoaded: true,
  addPolicy: vi.fn(),
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
  ai.addPolicy = vi.fn(async () => ({ id: "pol1" }));
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
  return { rerender, unmount: view.unmount };
};

describe("OnboardingAgentProvider", () => {
  it("creates one policy from the Users group to the first provider, without a word", async () => {
    const { rerender } = await renderStep();
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
      { quiet: true },
    );
    expect(
      screen.queryByText(/polic/i),
      "the step never mentions the policy it creates",
    ).toBeNull();
  });

  it("falls back to the All group", async () => {
    groups = [{ id: "g-all", name: "All" }];
    await renderStep();
    expect(ai.addPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "All to OpenAI",
        sourceGroups: ["g-all"],
      }),
      { quiet: true },
    );
  });

  it("tries once per mount when the create is refused", async () => {
    ai.addPolicy = vi.fn(async () => undefined);
    const { rerender, unmount } = await renderStep();
    await rerender();
    expect(ai.addPolicy, "no retry on the same mount").toHaveBeenCalledTimes(1);

    // Coming back to the step tries again.
    unmount();
    await renderStep();
    expect(ai.addPolicy).toHaveBeenCalledTimes(2);
  });

  it("waits for a connected provider", async () => {
    ai.providers = [];
    await renderStep();
    expect(ai.addPolicy).not.toHaveBeenCalled();
  });

  it("waits for the policy list before creating a policy", async () => {
    ai.policiesLoaded = false;
    await renderStep();
    expect(
      ai.addPolicy,
      "an unread list could hold the account's policies",
    ).not.toHaveBeenCalled();
  });

  it("creates nothing when the account has a policy", async () => {
    ai.policies = [{ id: "pol1" }];
    await renderStep();
    expect(ai.addPolicy).not.toHaveBeenCalled();
  });

  it("creates nothing without a Users or All group", async () => {
    groups = [{ id: "g-dev", name: "Developers" }];
    await renderStep();
    expect(ai.addPolicy).not.toHaveBeenCalled();
  });

  it("leaves the policy to the policy step where the flow has one", async () => {
    await renderStep(false);
    expect(ai.addPolicy).not.toHaveBeenCalled();
  });
});
