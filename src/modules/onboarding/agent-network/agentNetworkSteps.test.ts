import { describe, expect, it } from "vitest";
import {
  AGENT_STEP,
  agentSteps,
  initialAgentStep,
  stepAfterSignup,
  storedAgentStep,
} from "@/modules/onboarding/agent-network/agentNetworkSteps";

describe("agentSteps", () => {
  it("puts the gateway step right before the provider step", () => {
    expect(agentSteps(true)).toEqual([
      "signup",
      "device",
      "gateway",
      "provider",
      "policy",
      "configure",
      "end",
    ]);
  });

  it("leaves the gateway step out where it doesn't run", () => {
    expect(agentSteps(false)).toEqual([
      "signup",
      "device",
      "provider",
      "policy",
      "configure",
      "end",
    ]);
  });

  it("leaves the policy step out where the provider step creates the policy", () => {
    expect(agentSteps(true, false)).toEqual([
      "signup",
      "device",
      "gateway",
      "provider",
      "configure",
      "end",
    ]);
  });
});

describe("stepAfterSignup", () => {
  it("continues on the device step", () => {
    expect(stepAfterSignup(agentSteps(true))).toBe(AGENT_STEP.DEVICE);
    expect(stepAfterSignup(agentSteps(false, false))).toBe(AGENT_STEP.DEVICE);
  });
});

describe("storedAgentStep", () => {
  it("prefers the saved step name", () => {
    expect(storedAgentStep({ agent_network_step: "gateway", step: 4 })).toBe(
      AGENT_STEP.GATEWAY,
    );
  });

  it("moves a saved welcome step on to the device step", () => {
    // The welcome step was removed; an operator who stopped on it resumes on
    // the step that followed it.
    expect(storedAgentStep({ agent_network_step: "welcome" })).toBe(
      AGENT_STEP.DEVICE,
    );
    expect(storedAgentStep({ agent_network_step: "welcome" }, false)).toBe(
      AGENT_STEP.DEVICE,
    );
  });

  it("maps the positions saved before steps had names", () => {
    // Positions 1-3 were signup, welcome and device; 4 and above were provider
    // onwards, and must not shift onto the gateway step.
    const mapped = [1, 2, 3, 4, 5, 6, 7].map((step) =>
      storedAgentStep({ step }),
    );
    expect(mapped).toEqual([
      "signup",
      "device",
      "device",
      "provider",
      "policy",
      "configure",
      "end",
    ]);
  });

  it("clamps out-of-range positions like the old flow did", () => {
    expect(storedAgentStep({ step: 0 })).toBe(AGENT_STEP.SIGNUP);
    expect(storedAgentStep({ step: 12 })).toBe(AGENT_STEP.END);
    expect(storedAgentStep({})).toBe(AGENT_STEP.SIGNUP);
  });

  it("ignores a position that belongs to the regular onboarding", () => {
    // An existing account's saved position is the regular flow's, so reading
    // it would open the Agent Network flow partway through.
    expect(storedAgentStep({ step: 5 }, false)).toBe(AGENT_STEP.SIGNUP);
    expect(
      storedAgentStep({ agent_network_step: "gateway", step: 5 }, false),
    ).toBe(AGENT_STEP.GATEWAY);
  });

  it("falls back to the position when the saved name is not a step", () => {
    expect(storedAgentStep({ agent_network_step: "billing", step: 3 })).toBe(
      AGENT_STEP.DEVICE,
    );
    expect(
      storedAgentStep({ agent_network_step: "constructor", step: 4 }),
      "an inherited property name is not a retired step",
    ).toBe(AGENT_STEP.PROVIDER);
  });
});

describe("initialAgentStep", () => {
  const withGateway = agentSteps(true);
  const withoutGateway = agentSteps(false);

  it("opens on the signup form while it is pending", () => {
    expect(initialAgentStep(AGENT_STEP.POLICY, withGateway, true)).toBe(
      AGENT_STEP.SIGNUP,
    );
  });

  it("never lands back on the signup form once it is done", () => {
    expect(initialAgentStep(AGENT_STEP.SIGNUP, withGateway, false)).toBe(
      AGENT_STEP.DEVICE,
    );
  });

  it("resumes on the saved step", () => {
    expect(initialAgentStep(AGENT_STEP.GATEWAY, withGateway, false)).toBe(
      AGENT_STEP.GATEWAY,
    );
  });

  it("resumes on the next step when the flow does not run the saved one", () => {
    expect(initialAgentStep(AGENT_STEP.GATEWAY, withoutGateway, false)).toBe(
      AGENT_STEP.PROVIDER,
    );
    expect(
      initialAgentStep(AGENT_STEP.POLICY, agentSteps(true, false), false),
    ).toBe(AGENT_STEP.CONFIGURE);
  });
});
