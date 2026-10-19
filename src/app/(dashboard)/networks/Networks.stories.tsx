import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import NetworksPage from "@/app/(dashboard)/networks/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  clickSelector,
  findDialog,
  findRow,
  findText,
  markRow,
  settleMotion,
  user,
  waitForPopup,
} from "@/storybook/network";

const meta: Meta = {
  title: "Pages/Network/Networks",
  afterEach: settleMotion,
  parameters: { nextjs: { navigation: { pathname: "/networks" } } },
  render: () => (
    <DashboardLayout>
      <NetworksPage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const ready = async () => {
  await findText("Berlin Office");
};

export const List: Story = { play: ready };

export const Empty: Story = {
  parameters: { api: { "GET /networks": [] } },
  play: async () => {
    await findText(/Add Network/);
  },
};

export const RowHover: Story = {
  tags: ["capture-hover"],
  play: async () => {
    await markRow("Berlin Office");
  },
};

export const RowActions: Story = {
  play: async () => {
    const row = await findRow("Berlin Office");
    await user.click(row.querySelector("[data-testid='network-actions']")!);
    await waitForPopup("menu");
  },
};

export const AddNetworkModal: Story = {
  play: async () => {
    await ready();
    await clickSelector("[data-testid='add-network']");
    await findDialog();
  },
};

export const AddResourceModal: Story = {
  play: async () => {
    const row = await findRow("Staging");
    await user.click(row.querySelector("[data-testid='add-resource']")!);
    await findText(/Add new resource to/);
  },
};

/* Clicking the table search opens the global search (command palette). */
export const SearchPalette: Story = {
  play: async () => {
    await ready();
    await clickSelector("[data-testid='table-search-input']");
    await findDialog();
  },
};
