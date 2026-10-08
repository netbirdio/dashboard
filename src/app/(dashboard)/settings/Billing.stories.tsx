import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SettingsPage from "@/app/(dashboard)/settings/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import { freeSubscription, trialSubscription } from "@/storybook/fixtures";
import { dialog, findText, settle } from "@/storybook/platform";

const meta: Meta = {
  title: "Pages/Platform/Cloud/Billing",
  tags: ["cloud"],
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/settings",
        query: { tab: "plans-and-billing" },
      },
    },
  },
  render: () => (
    <DashboardLayout>
      <SettingsPage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const plans = async () => {
  await findText("Business");
  await settle(600);
};

export const PlansAndBilling: Story = { play: plans };

export const Trial: Story = {
  parameters: {
    api: { "GET /integrations/billing/subscription": trialSubscription },
  },
  play: plans,
};

export const FreePlan: Story = {
  parameters: {
    api: { "GET /integrations/billing/subscription": freeSubscription },
  },
  play: plans,
};

/* Stripe sends the user back with ?success=true after a checkout. */
export const CheckoutSuccess: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/settings",
        query: { tab: "plans-and-billing", success: "true" },
      },
    },
  },
  play: async () => {
    await dialog();
    await settle(600);
  },
};

export const Invoices: Story = {
  parameters: {
    nextjs: {
      navigation: { pathname: "/settings", query: { tab: "invoices" } },
    },
  },
  play: async () => {
    await findText(/Sep(tember)? .*2026|2026/);
    await settle(600);
  },
};

export const InvoicesEmpty: Story = {
  parameters: {
    nextjs: {
      navigation: { pathname: "/settings", query: { tab: "invoices" } },
    },
    api: { "GET /integrations/billing/invoices": [] },
  },
  play: async () => {
    await settle(1500);
  },
};
