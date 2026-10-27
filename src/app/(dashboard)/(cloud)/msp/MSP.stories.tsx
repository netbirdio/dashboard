import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import JoinMspPage from "@/app/(dashboard)/(cloud)/msp/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import { mspInfo, tenantSwitcher } from "@/storybook/fixtures";
import { dialog, settle } from "@/storybook/platform";

/* /msp?invite=… is where an account owner accepts an invitation to become an MSP. */
const meta: Meta = {
  title: "Pages/Platform/Cloud/MSP",
  tags: ["cloud"],
  parameters: {
    nextjs: {
      navigation: { pathname: "/msp", query: { invite: "msp-invite-7f3a9c" } },
    },
  },
  render: () => (
    <DashboardLayout>
      <JoinMspPage />
    </DashboardLayout>
  ),
  play: async () => {
    await dialog();
    await settle(600);
  },
};
export default meta;
type Story = StoryObj;

export const Invitation: Story = {};

/* An account that already is an MSP sees the invitation as done. */
export const AlreadyMSP: Story = {
  parameters: {
    api: {
      "GET /integrations/msp": mspInfo,
      "GET /integrations/msp/switcher": tenantSwitcher,
    },
  },
};
