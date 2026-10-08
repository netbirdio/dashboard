import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { screen } from "storybook/test";
import NetworkDetailPage from "@/app/(dashboard)/network/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import { NETWORK } from "@/storybook/fixtures";
import {
  clickSelector,
  clickTab,
  clickText,
  findDialog,
  findRow,
  findText,
  markRow,
  settleMotion,
  user,
  waitForPopup,
} from "@/storybook/network";

const navigation = (id: string, tab?: string) => ({
  nextjs: {
    navigation: { pathname: "/network", query: tab ? { id, tab } : { id } },
  },
});

const meta: Meta = {
  title: "Pages/Network/Network Detail",
  afterEach: settleMotion,
  parameters: navigation(NETWORK.office),
  render: () => (
    <DashboardLayout>
      <NetworkDetailPage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const routingPeers = navigation(NETWORK.office, "routing-peers");
const resourcesReady = async () => {
  await findText("Office Printer");
};

export const Resources: Story = { play: resourcesReady };

export const ResourceRowHover: Story = {
  tags: ["capture-hover"],
  play: async () => {
    await markRow("Internal Wiki");
  },
};

export const ResourceRowActions: Story = {
  play: async () => {
    const row = await findRow("Internal Wiki");
    await user.click(row.querySelector("[aria-label='Resource actions']")!);
    await waitForPopup("menu");
  },
};

export const NetworkActions: Story = {
  play: async () => {
    await resourcesReady();
    await clickSelector("[data-testid='network-detail-actions']");
    await waitForPopup("menu");
  },
};

export const AddResourceModal: Story = {
  play: async () => {
    await resourcesReady();
    await clickSelector("[data-testid='add-resource']");
    await findText(/Add new resource to/);
  },
};

export const ResourceGroupsPickerOpen: Story = {
  play: async () => {
    await resourcesReady();
    await clickSelector("[data-testid='add-resource']");
    await findDialog();
    await clickText("Add or select resource group(s)...");
    await waitForPopup();
  },
};

/* The policy badge of a resource opens its modal on the access control tab. */
export const ResourcePolicies: Story = {
  play: async () => {
    const row = await findRow("Office Printer");
    await user.click(row.querySelector("[aria-label='Configure policies']")!);
    await findDialog();
    await findText("Office Resources");
  },
};

export const ResourceAddPolicy: Story = {
  play: async () => {
    const row = await findRow("Internal Wiki");
    await user.click(row.querySelector("[aria-label='Configure policies']")!);
    await findDialog();
    await clickSelector("[data-testid='add-policy']");
    await findText("Create New Access Control Policy");
  },
};

export const ResourceWithoutPolicy: Story = {
  play: async () => {
    const row = await findRow("Berlin Services");
    await user.click(row.querySelector("[aria-label='Configure policies']")!);
    await findDialog();
    await clickTab(/Resource/);
  },
};

export const RoutingPeers: Story = {
  parameters: routingPeers,
  play: async () => {
    await findText("router-berlin");
  },
};

export const RoutingPeerRowActions: Story = {
  parameters: routingPeers,
  play: async () => {
    const [trigger] = await screen.findAllByLabelText(
      "Routing peer actions",
      undefined,
      { timeout: 15000 },
    );
    await user.click(trigger);
    await waitForPopup("menu");
  },
};

export const AddRoutingPeerModal: Story = {
  parameters: routingPeers,
  play: async () => {
    await screen.findAllByLabelText("Routing peer actions", undefined, {
      timeout: 15000,
    });
    const [add] = await screen.findAllByRole("button", { name: /^Add$/ });
    await user.click(add);
    await findText("Add Routing Peer");
  },
};

export const AddRoutingPeerGroupTab: Story = {
  parameters: routingPeers,
  play: async () => {
    await screen.findAllByLabelText("Routing peer actions", undefined, {
      timeout: 15000,
    });
    const [add] = await screen.findAllByRole("button", { name: /^Add$/ });
    await user.click(add);
    await findDialog();
    await clickSelector("[data-testid='routing-peer-tab-group']");
  },
};

export const AddRoutingPeerAdvancedTab: Story = {
  parameters: routingPeers,
  play: async () => {
    await screen.findAllByLabelText("Routing peer actions", undefined, {
      timeout: 15000,
    });
    const [add] = await screen.findAllByRole("button", { name: /^Add$/ });
    await user.click(add);
    await findDialog();
    await clickTab(/Advanced Settings/);
    await findText(/Masquerade/);
  },
};

export const SingleRoutingPeerNetwork: Story = {
  parameters: navigation(NETWORK.aws),
  play: async () => {
    await findText("Production Postgres");
  },
};

export const EmptyNetwork: Story = {
  parameters: navigation(NETWORK.empty),
  play: async () => {
    await findText("Staging");
  },
};

export const EmptyNetworkRoutingPeers: Story = {
  parameters: navigation(NETWORK.empty, "routing-peers"),
  play: async () => {
    await findText("Staging");
  },
};
