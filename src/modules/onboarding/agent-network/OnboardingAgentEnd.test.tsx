import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ai = {
  providers: [] as { enabled: boolean }[],
  policies: [] as { enabled: boolean; sourceGroups: string[] }[],
};
let peers: { connected: boolean; groups: { id: string }[] }[] = [];

vi.mock("@/modules/agent-network/AIProvidersProvider", () => ({
  useAIProviders: () => ai,
}));
vi.mock("@utils/api", () => ({ default: () => ({ data: peers }) }));

const { OnboardingAgentEnd } = await import(
  "@/modules/onboarding/agent-network/OnboardingAgentEnd"
);

beforeEach(() => {
  ai.providers = [];
  ai.policies = [];
  peers = [];
});
afterEach(cleanup);

const renderEnd = (onFix = vi.fn()) =>
  render(
    <OnboardingAgentEnd
      onFinish={vi.fn()}
      showLiveChecklist={true}
      policyStep={false}
      onFix={onFix}
    />,
  );

const item = (name: string) =>
  screen.getByTestId(`agent-network-check-${name}`);

describe("OnboardingAgentEnd", () => {
  it("offers the step that fixes each unmet item", () => {
    const onFix = vi.fn();
    renderEnd(onFix);

    fireEvent.click(screen.getByRole("button", { name: "Connect a provider" }));
    fireEvent.click(screen.getByRole("button", { name: "Set up a policy" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Connect your device" }),
    );

    // Without a policy step the provider step creates the policy.
    expect(onFix.mock.calls).toEqual([["provider"], ["provider"], ["device"]]);
    expect(item("provider").dataset.done).toBe("false");
  });

  it("offers nothing to fix once every item holds", () => {
    ai.providers = [{ enabled: true }];
    ai.policies = [{ enabled: true, sourceGroups: ["g-users"] }];
    peers = [{ connected: true, groups: [{ id: "g-users" }] }];
    renderEnd();

    for (const name of ["provider", "policy", "peer"]) {
      expect(item(name).dataset.done, `${name} holds`).toBe("true");
    }
    expect(
      screen.getAllByRole("button").map((b) => b.textContent),
      "only the way out is left",
    ).toEqual(["Go to Access Logs"]);
  });
});
