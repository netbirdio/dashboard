import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import DashboardLayout from "@/layouts/DashboardLayout";
import { AgentNetworkOnboarding } from "@/modules/onboarding/agent-network/AgentNetworkOnboarding";
import {
  AGENT_STEP,
  type AgentStep,
} from "@/modules/onboarding/agent-network/agentNetworkSteps";
import { settle, waitForSelector } from "@/storybook/platform";

type Args = { step: AgentStep; gatewayStep: boolean };

/* The onboarding is a full-screen modal the OnboardingProvider opens on first login;
   rendering it directly per step shows every step without walking the flow. */
const meta: Meta<Args> = {
  title: "Pages/Platform/Agent Network/Onboarding",
  parameters: { nextjs: { navigation: { pathname: "/peers" } } },
  args: { gatewayStep: false },
  render: ({ step, gatewayStep }) => (
    <DashboardLayout>
      <AgentNetworkOnboarding
        initialStep={step}
        onStepChange={() => undefined}
        gatewayStep={gatewayStep}
        existingAccount={true}
        signupPending={step === AGENT_STEP.SIGNUP}
        onSignupSubmit={() => undefined}
        onSkip={() => undefined}
        onFinish={() => undefined}
      />
    </DashboardLayout>
  ),
  play: async () => {
    await waitForSelector("[data-testid=agent-network-onboarding]");
    await settle(800);
  },
};
export default meta;
type Story = StoryObj<Args>;

/* An account that has not set Agent Network up yet, which is when the flow runs. */
const fresh = {
  "GET /agent-network/settings": {
    endpoint: "",
    proxy_address: "",
    dedicated: false,
    enable_log_collection: false,
    enable_prompt_collection: false,
    redact_pii: false,
  },
  "GET /agent-network/providers": [],
  "GET /agent-network/policies": [],
};

export const Signup: Story = { args: { step: AGENT_STEP.SIGNUP } };
export const Device: Story = { args: { step: AGENT_STEP.DEVICE } };
export const DeviceWaiting: Story = {
  args: { step: AGENT_STEP.DEVICE },
  parameters: { api: { "GET /peers": [] } },
};

export const GatewayChoice: Story = {
  args: { step: AGENT_STEP.GATEWAY, gatewayStep: true },
  parameters: { api: fresh },
};

export const GatewayManagedProvisioning: Story = {
  args: { step: AGENT_STEP.GATEWAY, gatewayStep: true },
  parameters: {
    api: {
      ...fresh,
      "GET /integrations/agent-network/managed-proxy": {
        id: "mp-1",
        state: "provisioning",
        endpoint: "acme.ai.eu.proxy.netbird.io",
        region: "eu-central-1",
      },
    },
  },
};

export const GatewayManagedFailed: Story = {
  args: { step: AGENT_STEP.GATEWAY, gatewayStep: true },
  parameters: {
    api: {
      ...fresh,
      "GET /integrations/agent-network/managed-proxy": {
        id: "mp-1",
        state: "failed",
        endpoint: "acme.ai.eu.proxy.netbird.io",
        region: "eu-central-1",
        message: "Quota exceeded for load balancers in eu-central-1.",
      },
    },
  },
};

export const Provider: Story = {
  args: { step: AGENT_STEP.PROVIDER },
  parameters: { api: fresh },
};
export const ProviderConfigured: Story = {
  args: { step: AGENT_STEP.PROVIDER },
};
export const Policy: Story = { args: { step: AGENT_STEP.POLICY } };
export const Configure: Story = { args: { step: AGENT_STEP.CONFIGURE } };
export const End: Story = { args: { step: AGENT_STEP.END } };
