import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor } from "storybook/test";
import PostureChecksPage from "@/app/(dashboard)/posture-checks/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  clickTab,
  clickText,
  findDialog,
  findText,
  markRow,
  settleMotion,
} from "@/storybook/network";

const meta: Meta = {
  title: "Pages/Network/Posture Checks",
  afterEach: settleMotion,
  parameters: { nextjs: { navigation: { pathname: "/posture-checks" } } },
  render: () => (
    <DashboardLayout>
      <PostureChecksPage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const ready = async () => {
  await findText("EU and US offices only");
};
const ALL_CHECKS = "Hardened workstation baseline with every check enabled";

const openAllChecks = async () => {
  await clickText(ALL_CHECKS);
  await findDialog();
  await findText("Process");
};

/* Each check card opens its own nested modal with the check's settings. */
const openCheck = (title: string) => async () => {
  await openAllChecks();
  await clickText(title);
  // The outer modal is aria-hidden while the nested one is open, so count DOM nodes.
  await waitFor(
    () => expect(document.querySelectorAll("[role='dialog']")).toHaveLength(2),
    { timeout: 15000 },
  );
};

export const List: Story = { play: ready };

export const Empty: Story = {
  parameters: { api: { "GET /posture-checks": [] } },
  play: async () => {
    await findText("Create Posture Check");
  },
};

export const RowHover: Story = {
  tags: ["capture-hover"],
  play: async () => {
    await markRow("Block home networks");
  },
};

export const CreateModal: Story = {
  play: async () => {
    await ready();
    await clickText("Add Posture Check");
    await findText("NetBird Client Version");
  },
};

export const EditModalAllChecks: Story = { play: openAllChecks };

export const EditModalNameTab: Story = {
  play: async () => {
    await openAllChecks();
    await clickTab(/Name & Description/);
    await findText("Name of the Posture Check");
  },
};

export const NetBirdVersionCheck: Story = {
  play: openCheck("NetBird Client Version"),
};

export const CountryRegionCheck: Story = {
  play: openCheck("Country & Region"),
};

export const PeerNetworkRangeCheck: Story = {
  play: openCheck("Peer Network Range"),
};

export const OperatingSystemCheck: Story = {
  play: openCheck("Operating System"),
};

export const ProcessCheck: Story = {
  play: openCheck("Process"),
};
