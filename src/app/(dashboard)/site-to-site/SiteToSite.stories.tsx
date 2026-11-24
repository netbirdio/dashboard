import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { screen, waitFor, within } from "storybook/test";
import SiteToSitePage from "@/app/(dashboard)/site-to-site/page";
import type { Policy } from "@/interfaces/Policy";
import type { SiteToSiteConnection } from "@/interfaces/SiteToSite";
import DashboardLayout from "@/layouts/DashboardLayout";
import { NETWORK, networks, policies } from "@/storybook/fixtures";
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

const s2sPolicy = (
  id: string,
  name: string,
  source: { id: string; type: "subnet" | "host" },
  destination: { id: string; type: "subnet" | "host" },
  protocol: "tcp" | "all",
  bidirectional: boolean,
): Policy => ({
  id,
  name,
  description: "",
  enabled: true,
  source_posture_checks: [],
  rules: [
    {
      name,
      description: "",
      enabled: true,
      action: "accept",
      bidirectional,
      protocol,
      ports: protocol === "tcp" ? ["443"] : [],
      sources: [],
      destinations: [],
      sourceResource: source,
      destinationResource: destination,
    },
  ],
});

/* The AWS VPC reaches the Berlin office LAN over HTTPS, and the office LAN
   and the production database reach each other both ways. */
const s2sPolicies = [
  s2sPolicy(
    "pol-s2s-vpc-office",
    "Production VPC to Office LAN",
    { id: "res-aws-vpc", type: "subnet" },
    { id: "res-office-lan", type: "subnet" },
    "tcp",
    false,
  ),
  s2sPolicy(
    "pol-s2s-office-postgres",
    "Office LAN to Production Postgres",
    { id: "res-office-lan", type: "subnet" },
    { id: "res-postgres", type: "host" },
    "all",
    true,
  ),
];

const connections: SiteToSiteConnection[] = [
  {
    network_ids: [NETWORK.aws, NETWORK.office],
    policy_ids: s2sPolicies.map((p) => p.id as string),
    enabled: true,
  },
];

const api = {
  "GET /networks/site-to-site": connections,
  "GET /policies": [...policies, ...s2sPolicies],
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

const openAddPolicy = async () => {
  const row = await findRow("Berlin Office");
  await user.click(row.querySelector("[data-testid='site-to-site-actions']")!);
  await clickText("Add Policy");
  await findText("Create New Access Control Policy");
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

export const NoRoutingPeerOnline: Story = {
  parameters: { api: { ...api, "GET /networks/routers": [] } },
  play: ready,
};

export const Expanded: Story = {
  play: async () => {
    await user.click(await findRow("Berlin Office"));
    await findText("Production Postgres");
  },
};

export const Empty: Story = {
  parameters: { api: { "GET /networks/site-to-site": [] } },
  play: async () => {
    await findText("Create New Site-to-Site Connection");
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
    await pickNetwork("first-network", "Berlin Office");
    await pickNetwork("second-network", "Add new network");
    await user.type(
      await screen.findByPlaceholderText("e.g., Lisbon Office"),
      "Lisbon Office",
    );
    await user.type(
      await screen.findByPlaceholderText("e.g., Lisbon LAN"),
      "Lisbon LAN",
    );
    await user.type(
      await screen.findByPlaceholderText("e.g., 10.30.0.0/24"),
      "10.30.0.0/24",
    );
  },
};

/* Two networks that already have IP ranges, so Continue creates nothing and
   opens the policy fields straight away. */
const openAccessStep = async () => {
  await ready();
  await clickSelector("[data-testid='add-site-to-site-connection']");
  await findDialog();
  await pickNetwork("first-network", "Berlin Office");
  await pickNetwork("second-network", "AWS Production VPC (eu-central-1)");
  await clickSelector("[data-testid='site-to-site-continue']");
  await findText("Name of the Rule");
};

export const AddConnectionAccess: Story = { play: openAccessStep };

/* AWS reports no routing peer, so saving the policy leads to its setup. */
export const AddConnectionRoutingPeers: Story = {
  parameters: {
    api: {
      ...api,
      "GET /networks": networks.map((n) =>
        n.id === NETWORK.aws ? { ...n, routing_peers_count: 0 } : n,
      ),
      "POST /setup-keys": { id: "key-1", key: "A1B2C3D4-SETUP-KEY" },
      "POST /groups": { id: "grp-aws-routing", name: "Routing Peers", peers: [] },
      "GET /groups/:id": { id: "grp-aws-routing", name: "Routing Peers", peers: [] },
      "POST /policies": s2sPolicy(
        "pol-new",
        "Office LAN (Berlin Office) to Production VPC (AWS Production VPC (eu-central-1))",
        { id: "res-office-lan", type: "subnet" },
        { id: "res-aws-vpc", type: "subnet" },
        "all",
        false,
      ),
    },
  },
  play: async () => {
    await openAccessStep();
    await clickSelector("[data-testid='submit-policy']");
    await findText("Deployment Method");
  },
};

export const AddPolicy: Story = {
  play: async () => {
    await openAddPolicy();
  },
};

export const AddPolicySourceResources: Story = {
  play: async () => {
    await openAddPolicy();
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
