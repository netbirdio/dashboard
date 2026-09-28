import { describe, expect, it } from "vitest";
import {
  AGENT_STEP,
  agentSteps,
  initialAgentStep,
  storedAgentStep,
} from "@/modules/onboarding/agent-network/agentNetworkSteps";

describe("agentSteps", () => {
  it("puts the gateway step right before the provider step", () => {
    expect(agentSteps(true)).toEqual([
      "signup",
      "welcome",
      "device",
      "gateway",
      "provider",
      "policy",
      "configure",
      "end",
    ]);
  });

  it("leaves the flow as it was without the gateway step", () => {
    expect(agentSteps(false)).toEqual([
      "signup",
      "welcome",
      "device",
      "provider",
      "policy",
      "configure",
      "end",
    ]);
  });
});

describe("storedAgentStep", () => {
  it("prefers the saved step name", () => {
    expect(storedAgentStep({ agent_network_step: "gateway", step: 4 })).toBe(
      AGENT_STEP.GATEWAY,
    );
  });

  it("maps the positions saved before steps had names", () => {
    // Positions 1-3 are unchanged; 4 and above were provider onwards, and must
    // not shift onto the gateway step that now sits at 4.
    const mapped = [1, 2, 3, 4, 5, 6, 7].map((step) =>
      storedAgentStep({ step }),
    );
    expect(mapped).toEqual([
      "signup",
      "welcome",
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

  it("falls back to the position when the saved name is not a step", () => {
    expect(storedAgentStep({ agent_network_step: "billing", step: 3 })).toBe(
      AGENT_STEP.DEVICE,
    );
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
      AGENT_STEP.WELCOME,
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
  });
});
