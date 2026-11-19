import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { screen } from "storybook/test";
import ExitNodesPage from "@/app/(dashboard)/exit-nodes/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  clickSelector,
  clickTab,
  clickText,
  findDialog,
  findRow,
  findSelector,
  findText,
  markRow,
  settleMotion,
  user,
  waitForPopup,
} from "@/storybook/network";

const meta: Meta = {
  title: "Pages/Network/Exit Nodes",
  afterEach: settleMotion,
  parameters: { nextjs: { navigation: { pathname: "/exit-nodes" } } },
  render: () => (
    <DashboardLayout>
      <ExitNodesPage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const ready = async () => {
  await findText("EU Egress");
};

/* A row expands into its peers when it is clicked. */
const expand = async (name: string) => {
  await clickText(name);
  const actions = await screen.findAllByLabelText(
    /Actions for peer/,
    undefined,
    {
      timeout: 15000,
    },
  );
  actions[actions.length - 1].scrollIntoView({ block: "center" });
};

const openActions = async (name: string) => {
  const row = await findRow(name);
  await user.click(row.querySelector("[aria-label='Exit node actions']")!);
  await waitForPopup("menu");
};

const openEdit = async (name: string) => {
  await ready();
  await openActions(name);
  await clickText("Edit");
  await findDialog();
  await findText("Edit Exit Node");
};

const hover = async (selector: string, row: string) => {
  const element = (await findRow(row)).querySelector(selector);
  if (!element) throw new Error(`${selector} not found in ${row}`);
  await user.hover(element);
  await waitForPopup("tooltip");
};

export const List: Story = { play: ready };

export const Empty: Story = {
  parameters: { api: { "GET /exit-nodes": [] } },
  play: async () => {
    await findText("Create New Exit Node");
  },
};

export const NoResults: Story = {
  play: async () => {
    await ready();
    await user.type(
      await findSelector("[data-testid='table-search-input']"),
      "does-not-exist",
    );
    await findText(/Could not find any results/);
  },
};

export const RowHover: Story = {
  tags: ["capture-hover"],
  play: async () => {
    await markRow("US Egress");
  },
};

export const Expanded: Story = {
  play: async () => {
    await expand("EU Egress");
  },
};

export const LocationTooltip: Story = {
  play: async () => {
    await ready();
    await hover("[aria-label='Germany']", "EU Egress");
  },
};

export const HighAvailabilityTooltip: Story = {
  play: async () => {
    await ready();
    await hover("[data-testid='exit-node-high-availability']", "EU Egress");
  },
};

export const HighAvailabilityInactiveTooltip: Story = {
  play: async () => {
    await ready();
    await hover(
      "[data-testid='exit-node-high-availability']",
      "Contractors Egress",
    );
  },
};

export const PoliciesPopover: Story = {
  play: async () => {
    await ready();
    await hover("[data-testid='exit-node-policies']", "EU Egress");
  },
};

export const FiltersOpen: Story = {
  play: async () => {
    await ready();
    await clickSelector("[data-testid='table-filters-button']");
    await waitForPopup();
  },
};

export const RowActions: Story = {
  play: async () => {
    await ready();
    await openActions("EU Egress");
  },
};

export const PeerActions: Story = {
  play: async () => {
    await expand("EU Egress");
    await user.click(screen.getAllByLabelText(/Actions for peer/)[0]);
    await waitForPopup("menu");
  },
};

export const DeleteExitNode: Story = {
  play: async () => {
    await ready();
    await openActions("EU Egress");
    await clickText("Delete");
    await findText("Delete 'EU Egress'?");
  },
};

export const AddExitNodeModal: Story = {
  play: async () => {
    await ready();
    await clickSelector("[data-testid='add-exit-node']");
    await findDialog();
    await findText("Add Exit Node");
  },
};

export const AddExitNodePeerSelector: Story = {
  play: async () => {
    await ready();
    await clickSelector("[data-testid='add-exit-node']");
    await findDialog();
    await clickSelector("[data-testid='exit-node-add-peer']");
    await screen.findByPlaceholderText(
      "Search for peers by name or ip...",
      undefined,
      { timeout: 15000 },
    );
  },
};

/* The Add button of the High Availability column opens the peer selector. */
export const AddPeerFromTable: Story = {
  play: async () => {
    await ready();
    const row = await findRow("Contractors Egress");
    await user.click(row.querySelector("[aria-label='Add peer']")!);
    await findDialog();
    await screen.findByPlaceholderText(
      "Search for peers by name or ip...",
      undefined,
      { timeout: 15000 },
    );
  },
};

export const EditExitNodeModal: Story = {
  play: async () => {
    await openEdit("EU Egress");
  },
};

export const EditNameTab: Story = {
  play: async () => {
    await openEdit("EU Egress");
    await clickTab(/Name & Description/);
  },
};

export const EditSettingsTab: Story = {
  play: async () => {
    await openEdit("EU Egress");
    await clickTab(/Additional Settings/);
  },
};

export const EditAccessControlTab: Story = {
  play: async () => {
    await openEdit("EU Egress");
    await clickTab(/Access Control/);
    await findText("Sales EU Web");
  },
};

export const EditAccessControlTabEmpty: Story = {
  play: async () => {
    await openEdit("Contractors Egress");
    await clickTab(/Access Control/);
  },
};

/* The policy dialog opens with the exit node as its locked destination. */
export const AddPolicyForExitNode: Story = {
  play: async () => {
    await openEdit("Contractors Egress");
    await clickTab(/Access Control/);
    await clickSelector("[data-testid='exit-node-add-policy']");
    await findText("Create New Access Control Policy");
  },
};
