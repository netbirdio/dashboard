// Steps of the Agent Network onboarding, in order. The flow is saved by step
// name rather than position, so adding a step never moves an operator who is
// mid-onboarding onto a different one.
export const AGENT_STEP = {
  SIGNUP: "signup",
  DEVICE: "device",
  GATEWAY: "gateway",
  PROVIDER: "provider",
  POLICY: "policy",
  CONFIGURE: "configure",
  END: "end",
} as const;

export type AgentStep = (typeof AGENT_STEP)[keyof typeof AGENT_STEP];

const ALL_STEPS = Object.values(AGENT_STEP) as AgentStep[];

// Steps the flow no longer runs, by saved name, and the step that took over.
const RETIRED_STEPS = new Map<string, AgentStep>([
  ["welcome", AGENT_STEP.DEVICE],
]);

// The flow as it was saved before steps had names, by 1-based position.
// Position 2 was the welcome step.
const LEGACY_STEPS: AgentStep[] = [
  AGENT_STEP.SIGNUP,
  AGENT_STEP.DEVICE,
  AGENT_STEP.DEVICE,
  AGENT_STEP.PROVIDER,
  AGENT_STEP.POLICY,
  AGENT_STEP.CONFIGURE,
  AGENT_STEP.END,
];

// agentSteps lists the steps the flow runs. The gateway step only runs where
// the account can get a NetBird-managed gateway, and the policy step only
// where the provider step does not create the policy; see OnboardingProvider.
export function agentSteps(
  withGateway: boolean,
  withPolicy = true,
): AgentStep[] {
  return ALL_STEPS.filter(
    (s) =>
      (withGateway || s !== AGENT_STEP.GATEWAY) &&
      (withPolicy || s !== AGENT_STEP.POLICY),
  );
}

export function isAgentStep(value: unknown): value is AgentStep {
  return typeof value === "string" && (ALL_STEPS as string[]).includes(value);
}

// stepAfterSignup is where the flow continues once the signup form is done,
// and the earliest step going back can reach.
export function stepAfterSignup(steps: AgentStep[]): AgentStep {
  return steps[steps.indexOf(AGENT_STEP.SIGNUP) + 1] ?? AGENT_STEP.END;
}

// storedAgentStep reads the saved step: its name when there is one, otherwise
// the position saved by earlier versions, mapped to the step that sat there.
// withLegacyPosition is false when that position is the regular onboarding's,
// as for an existing account, and the flow then starts from the beginning.
export function storedAgentStep(
  saved: {
    agent_network_step?: string;
    step?: number;
  },
  withLegacyPosition = true,
): AgentStep {
  if (isAgentStep(saved.agent_network_step)) return saved.agent_network_step;
  const retired = RETIRED_STEPS.get(saved.agent_network_step ?? "");
  if (retired) return retired;
  if (!withLegacyPosition) return AGENT_STEP.SIGNUP;
  const position = Number.isFinite(saved.step) ? Math.trunc(saved.step!) : 1;
  const index = Math.min(Math.max(position, 1), LEGACY_STEPS.length) - 1;
  return LEGACY_STEPS[index];
}

// initialAgentStep picks the step the flow opens on: the signup form while it
// is pending, and never again after it; otherwise the saved step, or the one
// after it when this flow does not run the saved step.
export function initialAgentStep(
  saved: AgentStep,
  steps: AgentStep[],
  signupPending: boolean,
): AgentStep {
  if (signupPending) return AGENT_STEP.SIGNUP;
  if (saved === AGENT_STEP.SIGNUP) return stepAfterSignup(steps);
  if (steps.includes(saved)) return saved;
  const later = ALL_STEPS.slice(ALL_STEPS.indexOf(saved) + 1);
  return later.find((s) => steps.includes(s)) ?? AGENT_STEP.END;
}
