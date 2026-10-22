import type { Meta } from "@storybook/nextjs-vite";
import { screen } from "storybook/test";
import GroupPage from "@/app/(dashboard)/group/page";
import GroupsPage from "@/app/(dashboard)/groups/page";
import {
  click,
  clickRole,
  dialog,
  inLayout,
  markCapture,
  nav,
  openRowMenu,
  resetStorage,
  role,
  type Story,
  text,
  until,
} from "@/storybook/core";

const meta: Meta = {
  title: "Pages/Core/Groups",
  parameters: nav("/groups"),
  beforeEach: resetStorage,
  render: inLayout(GroupsPage),
};
export default meta;

const loaded = () => text("Office Berlin");

export const List: Story = {
  tags: ["capture-hover"],
  play: async () => {
    markCapture((await text("Contractors")).parentElement);
  },
};

export const Empty: Story = {
  parameters: { api: { "GET /groups": [] } },
};

export const FiltersOpen: Story = {
  play: async () => {
    await loaded();
    await click(screen.findByTestId("table-filters-button"));
    await role("dialog");
  },
};

export const RowActionMenu: Story = {
  play: async () => {
    await loaded();
    // The first row is the "All" group, whose actions are hidden.
    await openRowMenu(
      (await screen.findAllByTestId("group-actions"))[1].closest("tr")!,
    );
  },
};

export const BulkSelection: Story = {
  play: async () => {
    await loaded();
    // Only groups that are not in use can be selected for bulk deletion.
    await click(role("checkbox", "Select Unused Group"));
  },
};

export const CreateGroupModal: Story = {
  play: async () => {
    await loaded();
    await click(screen.findByTestId("open-create-group"));
    await dialog();
  },
};

const group = (id: string, tab?: string) =>
  nav("/group", tab ? { id, tab } : { id });
const groupLoaded = () => role("tab", /Policies/);

export const DetailUsers: Story = {
  name: "Detail / Users",
  render: inLayout(GroupPage),
  parameters: group("grp-developers"),
  play: async () => {
    await groupLoaded();
    await text("Dana Developer");
  },
};

const tab = (name: string, value: string, id = "grp-servers"): Story => ({
  name: `Detail / ${name}`,
  render: inLayout(GroupPage),
  parameters: group(id, value),
  play: async () => void (await groupLoaded()),
});

export const DetailPeers = tab("Peers", "peers", "grp-developers");
export const DetailPolicies = tab("Policies", "policies");
export const DetailResources = tab("Resources", "resources", "grp-databases");
export const DetailNetworkRoutes = tab(
  "Network Routes",
  "network-routes",
  "grp-routing-peers",
);
export const DetailNameservers = tab("Nameservers", "nameservers");
export const DetailZones = tab("Zones", "zones");
export const DetailSetupKeys = tab("Setup Keys", "setup-keys");
export const DetailAllGroup = tab("All group", "policies", "grp-all");
export const DetailEmptyGroup = tab("Empty group", "users", "grp-empty");
export const DetailIntegrationGroup = tab(
  "IdP-issued group",
  "users",
  "grp-contractors",
);

export const DetailAssignPeersModal: Story = {
  name: "Detail / Assign peers modal",
  render: inLayout(GroupPage),
  parameters: group("grp-developers", "peers"),
  play: async () => {
    await groupLoaded();
    await clickRole("button", /Assign Peers/);
    await dialog();
  },
};

export const DetailAssignUsersModal: Story = {
  name: "Detail / Assign users modal",
  render: inLayout(GroupPage),
  parameters: group("grp-developers", "users"),
  play: async () => {
    await groupLoaded();
    await clickRole("button", /Assign Users/);
    await dialog();
  },
};

export const DetailRenameModal: Story = {
  name: "Detail / Rename modal",
  render: inLayout(GroupPage),
  parameters: group("grp-servers"),
  play: async () => {
    await groupLoaded();
    const pencil = await until(() => {
      const icon = document.querySelector(
        ".lucide-pencil, .lucide-pencil-line, .lucide-square-pen",
      );
      if (!icon) throw new Error("no rename button");
      return icon.closest("div")!;
    });
    await click(pencil);
    await dialog();
  },
};
