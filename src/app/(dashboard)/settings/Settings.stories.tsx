import type { Meta } from "@storybook/nextjs-vite";
import { screen } from "storybook/test";
import SettingsPage from "@/app/(dashboard)/settings/page";
import {
  click,
  clickRole,
  dialog,
  inLayout,
  nav,
  openRowMenu,
  resetStorage,
  role,
  type Story,
  text,
} from "@/storybook/core";
import { account } from "@/storybook/fixtures";

const meta: Meta = {
  title: "Pages/Core/Settings",
  parameters: nav("/settings"),
  beforeEach: resetStorage,
  render: inLayout(SettingsPage),
};
export default meta;

const tab = (value: string) => nav("/settings", { tab: value });

/* The Identity Providers tab only exists with the embedded IdP. */
const embedded = {
  ...account,
  settings: { ...account.settings, embedded_idp_enabled: true },
};
const embeddedApi = {
  "GET /accounts": [embedded],
  "GET /accounts/:id": embedded,
};

const shows = (
  value: string,
  heading: string | RegExp,
  tags?: string[],
): Story => ({
  tags,
  parameters: tab(value),
  play: async () => void (await text(heading)),
});

export const Authentication = shows("authentication", "Authentication");
export const SetupKeys = shows("setup-keys", "Server provisioning");
export const Groups = shows("groups", "User Groups");
export const Permissions = shows("permissions", "Permissions");
export const Networks = shows("networks", "Networks");
export const Clients = shows("clients", "Clients");
export const Metrics = shows("metrics", "Metrics");
export const DangerZone = shows("danger-zone", "Delete NetBird account");

export const IdentityProviders: Story = {
  parameters: { ...tab("identity-providers"), api: embeddedApi },
  play: async () => void (await text("Google Workspace")),
};

export const IdentityProvidersEmpty: Story = {
  parameters: {
    ...tab("identity-providers"),
    api: { ...embeddedApi, "GET /identity-providers": [] },
  },
  play: async () => void (await role("button", /Add Identity Provider/)),
};

export const IdentityProviderModal: Story = {
  parameters: { ...tab("identity-providers"), api: embeddedApi },
  play: async () => {
    await text("Google Workspace");
    await clickRole("button", /Add Identity Provider/);
    await dialog();
  },
};

/* Flips the named switches, which reveals dependent settings and enables
   the Save button. Only switches backed by local state are used: some
   (lazy connections, metrics, routing peer DNS) save on change. */
const toggle = (value: string, heading: string, labels: string[]): Story => ({
  parameters: tab(value),
  play: async () => {
    await text(heading);
    for (const label of labels) {
      const name = await text(label);
      await click(name.closest("[role=switch]")!);
    }
  },
});

export const AuthenticationToggled = toggle(
  "authentication",
  "Authentication",
  ["User Approval Required", "Require login after disconnect"],
);
export const GroupsToggled = toggle("groups", "User Groups", [
  "Enable JWT group sync",
]);
export const PermissionsToggled = toggle("permissions", "Permissions", [
  "Restrict dashboard for regular users",
]);
export const ClientsToggled = toggle("clients", "Clients", [
  "Enable Peer Expose",
]);

export const SetupKeysCreateModal: Story = {
  parameters: tab("setup-keys"),
  play: async () => {
    await text("Server provisioning");
    await click((await screen.findAllByTestId("open-create-setup-key"))[0]);
    await dialog();
  },
};

export const SetupKeysRowActionMenu: Story = {
  parameters: tab("setup-keys"),
  play: async () => {
    await text("Server provisioning");
    await openRowMenu(
      (await screen.findAllByTestId("setup-key-actions"))[0].closest("tr")!,
    );
  },
};

export const SetupKeysRevokeConfirm: Story = {
  parameters: tab("setup-keys"),
  play: async () => {
    await text("Server provisioning");
    await openRowMenu(
      (await screen.findAllByTestId("setup-key-actions"))[0].closest("tr")!,
    );
    await click(screen.findByTestId("revoke-setup-key"));
    await dialog();
  },
};

export const SetupKeysFiltersOpen: Story = {
  parameters: tab("setup-keys"),
  play: async () => {
    await text("Server provisioning");
    await click(screen.findByTestId("table-filters-button"));
    await role("dialog");
  },
};

export const SetupKeysEmpty: Story = {
  parameters: { ...tab("setup-keys"), api: { "GET /setup-keys": [] } },
  play: async () => void (await text("Setup Keys")),
};

export const DangerZoneConfirm: Story = {
  parameters: tab("danger-zone"),
  play: async () => {
    await clickRole("button", "Delete Account");
    await dialog();
  },
};

export const Notifications = shows("notifications", "Notifications");
export const CloudAuthentication = shows("authentication", "Authentication", [
  "cloud",
]);
export const CloudNotifications = shows("notifications", "Notifications", [
  "cloud",
]);
