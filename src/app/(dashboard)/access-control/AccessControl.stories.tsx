import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import AccessControlPage from "@/app/(dashboard)/access-control/page";
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
  title: "Pages/Network/Access Control",
  afterEach: settleMotion,
  parameters: { nextjs: { navigation: { pathname: "/access-control" } } },
  render: () => (
    <DashboardLayout>
      <AccessControlPage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const ready = async () => {
  await findText("Developers to Servers");
};

const openPolicy = async (name: string) => {
  await clickText(name);
  await findDialog();
  await findText("Update Access Control Policy");
};

export const List: Story = { play: ready };

export const Empty: Story = {
  parameters: { api: { "GET /policies": [] } },
  play: async () => {
    await findText("Create New Policy");
  },
};

export const RowHover: Story = {
  tags: ["capture-hover"],
  play: async () => {
    await markRow("Database Access");
  },
};

export const RowActions: Story = {
  play: async () => {
    const row = await findRow("Database Access");
    await user.click(row.querySelector("[data-testid='policy-actions']")!);
    await waitForPopup("menu");
  },
};

export const FiltersOpen: Story = {
  play: async () => {
    await ready();
    await clickSelector("[data-testid='table-filters-button']");
    await waitForPopup();
  },
};

export const CreatePolicyModal: Story = {
  play: async () => {
    await ready();
    await clickSelector("[data-testid='open-add-policy']");
    await findText("Create New Access Control Policy");
  },
};

export const EditPolicyModal: Story = {
  play: async () => {
    await openPolicy("Developers to Servers");
  },
};

export const ProtocolSelectOpen: Story = {
  play: async () => {
    await openPolicy("Developers to Servers");
    await clickSelector("[data-testid='protocol-select-button']");
    await waitForPopup("listbox");
  },
};

export const SourcePickerOpen: Story = {
  play: async () => {
    await openPolicy("Database Access");
    await clickSelector("[data-testid='source-group-selector']");
    await findSelector("[data-testid='source-group-selector-search']");
  },
};

export const DestinationPickerOpen: Story = {
  play: async () => {
    await openPolicy("Developers to Servers");
    await clickSelector("[data-testid='destination-group-selector']");
    await findSelector("[data-testid='destination-group-selector-search']");
  },
};

export const PortSelectorOpen: Story = {
  play: async () => {
    await openPolicy("Developers to Servers");
    await clickSelector("[data-testid='port-selector']");
    await findSelector("[data-testid='port-input']");
  },
};

export const IcmpPolicy: Story = {
  play: async () => {
    await openPolicy("Ping Monitoring");
  },
};

export const DisabledPolicy: Story = {
  play: async () => {
    await openPolicy("Legacy OpenVPN Bridge");
  },
};

export const NetBirdSSHPolicy: Story = {
  play: async () => {
    await openPolicy("NetBird SSH for DevOps");
  },
};

export const ResourceDestinationPolicy: Story = {
  play: async () => {
    await openPolicy("Developers to Postgres");
  },
};

export const PostureChecksTab: Story = {
  play: async () => {
    await openPolicy("Database Access");
    await clickTab(/Posture Checks/);
    await findText("EDR agent running");
  },
};

export const BrowsePostureChecks: Story = {
  play: async () => {
    await openPolicy("Database Access");
    await clickTab(/Posture Checks/);
    await clickText("Browse Checks");
    await findText("Supported operating systems");
  },
};

export const NewPostureCheckFromPolicy: Story = {
  play: async () => {
    await openPolicy("Developers to Servers");
    await clickTab(/Posture Checks/);
    await clickText("New Posture Check");
    await findText("NetBird Client Version");
  },
};

export const NameAndDescriptionTab: Story = {
  play: async () => {
    await openPolicy("Developers to Servers");
    await clickTab(/Name & Description/);
    await findText("Name of the Rule");
  },
};
