import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { screen, waitFor, within } from "storybook/test";
import SiteToSitePage from "@/app/(dashboard)/site-to-site/page";
import type { Policy } from "@/interfaces/Policy";
import type { SiteToSiteConnection } from "@/interfaces/SiteToSite";
import DashboardLayout from "@/layouts/DashboardLayout";
import { NETWORK, policies } from "@/storybook/fixtures";
import {
  clickSelector,
  clickText,
  findDialog,
  findRow,
  findText,
  markRow,
  settleMotion,
  user,
  waitForPopup,
} from "@/storybook/network";

const S2S_POLICY_ID = "pol-s2s-aws-office";

/* One site-to-site policy from the AWS VPC to the Berlin office LAN. */
const s2sPolicy: Policy = {
  id: S2S_POLICY_ID,
  name: "AWS Production to Berlin Office",
  description: "",
  enabled: true,
  source_posture_checks: [],
  rules: [
    {
      name: "AWS Production to Berlin Office",
      description: "",
      enabled: true,
      action: "accept",
      bidirectional: false,
      protocol: "tcp",
      ports: ["443"],
      sources: [],
      destinations: [],
      sourceResource: { id: "res-aws-vpc", type: "subnet" },
      destinationResource: { id: "res-office-lan", type: "subnet" },
    },
  ],
};

const connections: SiteToSiteConnection[] = [
  {
    network_ids: [NETWORK.aws, NETWORK.office],
    policy_ids: [S2S_POLICY_ID],
    enabled: true,
  },
];

const api = {
  "GET /networks/site-to-site": connections,
  "GET /policies": [...policies, s2sPolicy],
};

const meta: Meta = {
  title: "Pages/Network/Site-to-Site",
  afterEach: settleMotion,
  parameters: {
    nextjs: { navigation: { pathname: "/site-to-site" } },
    api,
  },
  render: () => (
    <DashboardLayout>
      <SiteToSitePage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const ready = async () => {
  await findRow("Berlin Office");
};

/* Opens a network select in the connection modal and picks an option from
   its list, not the same name in the table behind the dialog. */
const pickNetwork = async (testId: string, option: string) => {
  await clickSelector(`[data-testid='${testId}'] button`);
  // The previous select's list can still be closing; the new one is last.
  const lists = await waitForPopup("listbox");
  await user.click(await within(lists[lists.length - 1]).findByText(option));
  await waitFor(() => {
    if (screen.queryAllByRole("listbox").length > 0) throw new Error("open");
  });
};

export const List: Story = { play: ready };

export const Empty: Story = {
  parameters: { api: { "GET /networks/site-to-site": [] } },
  play: async () => {
    await findText("Connect Your Networks");
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
    await user.click(
      row.querySelector("[data-testid='site-to-site-actions']")!,
    );
    await waitForPopup("menu");
  },
};

export const AddConnectionModal: Story = {
  play: async () => {
    await ready();
    await clickSelector("[data-testid='add-site-to-site-connection']");
    await findDialog();
  },
};

export const AddConnectionNewNetwork: Story = {
  play: async () => {
    await ready();
    await clickSelector("[data-testid='add-site-to-site-connection']");
    await findDialog();
    await pickNetwork("source-network", "Berlin Office");
    await pickNetwork("destination-network", "New network");
    await user.type(
      await screen.findByPlaceholderText("e.g., Berlin Office"),
      "Lisbon Office",
    );
    await user.type(
      await screen.findByPlaceholderText("e.g., 10.10.0.0/16"),
      "10.30.0.0/24",
    );
  },
};

export const AddPolicy: Story = {
  play: async () => {
    const row = await findRow("Berlin Office");
    await user.click(row.querySelector("[aria-label='Add policy']")!);
    await findText("Create New Access Control Policy");
  },
};

export const AddPolicySourceResources: Story = {
  play: async () => {
    const row = await findRow("Berlin Office");
    await user.click(row.querySelector("[aria-label='Add policy']")!);
    await findText("Create New Access Control Policy");
    await clickSelector("[data-testid='source-group-selector']");
    await findText("Production VPC");
  },
};

export const DeployRoutingPeer: Story = {
  play: async () => {
    const row = await findRow("Berlin Office");
    await user.click(
      row.querySelector("[data-testid='site-to-site-actions']")!,
    );
    await clickText("Deploy Routing Peer");
    await findText("Deployment Method");
  },
};

export const DeployRoutingPeerCommand: Story = {
  parameters: {
    api: {
      ...api,
      "POST /setup-keys": { id: "key-1", key: "A1B2C3D4-SETUP-KEY" },
      "POST /groups": { id: "grp-new", name: "Routing Peers", peers: [] },
      "GET /groups/:id": { id: "grp-new", name: "Routing Peers", peers: [] },
    },
  },
  play: async () => {
    const row = await findRow("Berlin Office");
    await user.click(
      row.querySelector("[data-testid='site-to-site-actions']")!,
    );
    await clickText("Deploy Routing Peer");
    await findText("Deployment Method");
    await clickText("Continue");
    await findText(/A1B2C3D4-SETUP-KEY/);
  },
};
