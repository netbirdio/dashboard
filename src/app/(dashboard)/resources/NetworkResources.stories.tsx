import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import NetworkResourcesPage from "@/app/(dashboard)/resources/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  clickSelector,
  findDialog,
  findRow,
  findText,
  settleMotion,
  user,
  waitForPopup,
} from "@/storybook/network";

const meta: Meta = {
  title: "Pages/Network/Resources",
  afterEach: settleMotion,
  parameters: { nextjs: { navigation: { pathname: "/resources" } } },
  render: () => (
    <DashboardLayout>
      <NetworkResourcesPage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const ready = async () => {
  await findText("Office LAN");
};

export const List: Story = { play: ready };

export const Empty: Story = {
  parameters: { api: { "GET /networks/resources": [] } },
  play: async () => {
    await findText(/Add New Resource/);
  },
};

export const RowActions: Story = {
  play: async () => {
    const row = await findRow("Office LAN");
    await user.click(row.querySelector("[aria-label='Resource actions']")!);
    await waitForPopup("menu");
  },
};

/* Adding a resource opens the modal; the network is its first field. */
export const AddResourceModal: Story = {
  play: async () => {
    await ready();
    await clickSelector("[data-testid='add-resource']");
    await findDialog();
  },
};

export const AddResourceNetworkSelect: Story = {
  play: async () => {
    await ready();
    await clickSelector("[data-testid='add-resource']");
    await findDialog();
    await clickSelector("[data-testid='resource-network-select']");
    await findText("Staging");
  },
};

/* A new network can be created from the select without leaving the form. */
export const AddResourceCreateNetwork: Story = {
  play: async () => {
    await ready();
    await clickSelector("[data-testid='add-resource']");
    await findDialog();
    await clickSelector("[data-testid='resource-network-select']");
    await clickSelector("[data-testid='create-network-option']");
    await clickSelector("[data-testid='network-name-input']");
  },
};
