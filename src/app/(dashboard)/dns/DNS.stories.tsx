import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import NameserversPage from "@/app/(dashboard)/dns/nameservers/page";
import DNSSettingsPage from "@/app/(dashboard)/dns/settings/page";
import DNSZonesPage from "@/app/(dashboard)/dns/zones/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  clickSelector,
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

/* All DNS pages in one file; `/dns` itself only redirects to the nameservers. */
const meta: Meta = { title: "Pages/Network/DNS", afterEach: settleMotion };
export default meta;
type Story = StoryObj;

const nameservers: Story = {
  parameters: { nextjs: { navigation: { pathname: "/dns/nameservers" } } },
  render: () => (
    <DashboardLayout>
      <NameserversPage />
    </DashboardLayout>
  ),
};

const zones: Story = {
  parameters: { nextjs: { navigation: { pathname: "/dns/zones" } } },
  render: () => (
    <DashboardLayout>
      <DNSZonesPage />
    </DashboardLayout>
  ),
};

const settings: Story = {
  parameters: { nextjs: { navigation: { pathname: "/dns/settings" } } },
  render: () => (
    <DashboardLayout>
      <DNSSettingsPage />
    </DashboardLayout>
  ),
};

const nameserversReady = async () => {
  await findText("Internal Resolver");
};
const zonesReady = async () => {
  await findText("internal.example.com");
};

const openPreset = async (testId: string) => {
  await nameserversReady();
  await clickSelector("[data-testid='open-add-nameserver']");
  await user.click(await findSelector(`[data-testid='${testId}']`));
  await findText("Use a nameserver to resolve domains in your network");
};

const openNameserver = async (name: string) => {
  await clickText(name);
  await findDialog();
};

const expandZone = async (domain: string) => {
  await clickText(domain);
  await findSelector("[data-testid='edit-dns-record']");
};

export const Nameservers: Story = { ...nameservers, play: nameserversReady };

export const NameserversEmpty: Story = {
  ...nameservers,
  parameters: {
    ...nameservers.parameters,
    api: { "GET /dns/nameservers": [] },
  },
  play: async () => {
    await findText(/Add Nameserver/);
  },
};

export const NameserverRowHover: Story = {
  ...nameservers,
  tags: ["capture-hover"],
  play: async () => {
    await markRow("Internal Resolver");
  },
};

export const NameserverRowActions: Story = {
  ...nameservers,
  play: async () => {
    const row = await findRow("Internal Resolver");
    await user.click(row.querySelector("[data-testid='nameserver-actions']")!);
    await waitForPopup("menu");
  },
};

export const NameserverPresets: Story = {
  ...nameservers,
  play: async () => {
    await nameserversReady();
    await clickSelector("[data-testid='open-add-nameserver']");
    await findSelector("[data-testid='nameserver-preset-quad9']");
  },
};

export const NameserverGooglePreset: Story = {
  ...nameservers,
  play: async () => {
    await openPreset("nameserver-preset-google");
  },
};

export const NameserverCustom: Story = {
  ...nameservers,
  play: async () => {
    await openPreset("nameserver-preset-custom");
  },
};

export const NameserverEdit: Story = {
  ...nameservers,
  play: async () => {
    await openNameserver("Quad9 on a custom port");
  },
};

export const NameserverDomainsTab: Story = {
  ...nameservers,
  play: async () => {
    await openNameserver("Internal Resolver");
    await clickSelector("[data-testid='nameserver-tab-domains']");
    await findSelector(
      "[data-testid='nameserver-tab-domains'][data-state='active']",
    );
  },
};

export const NameserverNameTab: Story = {
  ...nameservers,
  play: async () => {
    await openNameserver("Internal Resolver");
    await clickSelector("[data-testid='nameserver-tab-general']");
  },
};

export const Zones: Story = { ...zones, play: zonesReady };

export const ZonesEmpty: Story = {
  ...zones,
  parameters: { ...zones.parameters, api: { "GET /dns/zones": [] } },
  play: async () => {
    await findText(/Add Zone/);
  },
};

export const ZoneRowHover: Story = {
  ...zones,
  tags: ["capture-hover"],
  play: async () => {
    await markRow("berlin.office.lan");
  },
};

export const ZoneRecordsExpanded: Story = {
  ...zones,
  play: async () => {
    await expandZone("internal.example.com");
  },
};

export const ZoneRowActions: Story = {
  ...zones,
  play: async () => {
    const row = await findRow("internal.example.com");
    await user.click(row.querySelector("[data-testid='dns-zone-actions']")!);
    await waitForPopup("menu");
  },
};

export const AddZoneModal: Story = {
  ...zones,
  play: async () => {
    await zonesReady();
    await clickSelector("[data-testid='add-dns-zone']");
    await findText("Add DNS Zone");
  },
};

export const EditZoneModal: Story = {
  ...zones,
  play: async () => {
    const row = await findRow("internal.example.com");
    await user.click(row.querySelector("[data-testid='dns-zone-actions']")!);
    await clickSelector("[data-testid='edit-dns-zone']");
    await findText("Update DNS Zone");
  },
};

export const AddRecordModal: Story = {
  ...zones,
  play: async () => {
    const row = await findRow("internal.example.com");
    await user.click(row.querySelector("[data-testid='add-dns-record']")!);
    await findText("Add DNS Record");
  },
};

export const EditRecordModal: Story = {
  ...zones,
  play: async () => {
    await expandZone("internal.example.com");
    await clickSelector("[data-testid='edit-dns-record']");
    await findText("Update DNS Record");
  },
};

export const Settings: Story = {
  ...settings,
  play: async () => {
    await findText("Disable DNS management for these groups");
  },
};

export const SettingsGroupPickerOpen: Story = {
  ...settings,
  play: async () => {
    await clickSelector("[data-testid='dns-groups-selector']");
    await findSelector("[data-testid='dns-groups-selector-search']");
  },
};
