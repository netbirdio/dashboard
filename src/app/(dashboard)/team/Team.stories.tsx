import type { Meta } from "@storybook/nextjs-vite";
import { screen } from "storybook/test";
import ServiceUsersPage from "@/app/(dashboard)/team/service-users/page";
import UserPage from "@/app/(dashboard)/team/user/page";
import UsersPage from "@/app/(dashboard)/team/users/page";
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
} from "@/storybook/core";
import { account } from "@/storybook/fixtures";

const meta: Meta = {
  title: "Pages/Core/Team",
  parameters: nav("/team/users"),
  beforeEach: resetStorage,
  render: inLayout(UsersPage),
};
export default meta;

/* Self-hosted deployments with the embedded IdP manage users locally,
   which adds the "Add User" button, invites and IdP badges. */
const embedded = {
  ...account,
  settings: { ...account.settings, embedded_idp_enabled: true },
};
const embeddedApi = {
  api: { "GET /accounts": [embedded], "GET /accounts/:id": embedded },
};

const usersLoaded = () => text("Dana Developer");

const rowOf = async (name: string) => (await text(name)).closest("tr")!;

export const Users: Story = {
  tags: ["capture-hover"],
  play: async () => {
    await usersLoaded();
    markCapture(await rowOf("Dana Developer"));
  },
};

export const UsersEmbeddedIdP: Story = {
  parameters: embeddedApi,
  play: async () => void (await usersLoaded()),
};

export const UsersCloud: Story = {
  tags: ["cloud"],
  play: async () => void (await usersLoaded()),
};

export const UsersFiltersOpen: Story = {
  play: async () => {
    await usersLoaded();
    await click(screen.findByTestId("table-filters-button"));
    await role("dialog");
  },
};

export const UsersRowActionMenu: Story = {
  play: async () => {
    await openRowMenu(await rowOf("Dana Developer"));
  },
};

export const AddUserModal: Story = {
  parameters: embeddedApi,
  play: async () => {
    await usersLoaded();
    await clickRole("button", /Add User/);
    await dialog();
  },
};

export const InviteUserModalCloud: Story = {
  tags: ["cloud"],
  play: async () => {
    await usersLoaded();
    await clickRole("button", /Invite User/);
    await dialog();
  },
};

export const Invites: Story = {
  parameters: embeddedApi,
  play: async () => {
    await usersLoaded();
    await clickRole("button", /Show Invites/);
    await text("Nora New-Hire");
  },
};

export const ServiceUsers: Story = {
  render: inLayout(ServiceUsersPage),
  parameters: nav("/team/service-users"),
  play: async () => void (await text("CI/CD Pipeline")),
};

export const ServiceUsersEmpty: Story = {
  render: inLayout(ServiceUsersPage),
  parameters: { ...nav("/team/service-users"), api: { "GET /users": [] } },
};

export const CreateServiceUserModal: Story = {
  render: inLayout(ServiceUsersPage),
  parameters: nav("/team/service-users"),
  play: async () => {
    await text("CI/CD Pipeline");
    await click((await screen.findAllByTestId("open-service-user-modal"))[0]);
    await dialog();
  },
};

const user = (id: string, extra: Record<string, string> = {}) =>
  nav("/team/user", { id, ...extra });
const userLoaded = () => text("User Role");

export const UserDetail: Story = {
  render: inLayout(UserPage),
  parameters: user("user-developer"),
  play: async () => {
    await userLoaded();
    await text("dev-thinkpad");
  },
};

export const UserDetailOwner: Story = {
  render: inLayout(UserPage),
  parameters: user("user-owner"),
  play: async () => void (await userLoaded()),
};

export const UserDetailBlocked: Story = {
  render: inLayout(UserPage),
  parameters: user("user-blocked"),
  play: async () => void (await userLoaded()),
};

export const UserDetailPendingApproval: Story = {
  render: inLayout(UserPage),
  parameters: user("user-pending"),
  play: async () => void (await userLoaded()),
};

export const UserDetailAccessTokens: Story = {
  render: inLayout(UserPage),
  parameters: user("user-owner"),
  play: async () => {
    await userLoaded();
    await click(screen.findByTestId("user-tab-access-tokens"));
    await text("Terraform");
  },
};

export const UserDetailCreateTokenModal: Story = {
  render: inLayout(UserPage),
  parameters: user("user-owner"),
  play: async () => {
    await userLoaded();
    await click(screen.findByTestId("user-tab-access-tokens"));
    await click(screen.findByTestId("access-token-open-modal"));
    await dialog();
  },
};

export const UserDetailRoleSelectorOpen: Story = {
  render: inLayout(UserPage),
  parameters: user("user-developer"),
  play: async () => {
    await userLoaded();
    const label = (await text("User Role")).parentElement!;
    await click(label.querySelector("button")!);
    await screen.findAllByTestId(
      "user-role-selector-item",
      {},
      { timeout: 10_000 },
    );
  },
};

export const ServiceUserDetail: Story = {
  render: inLayout(UserPage),
  parameters: user("user-service-ci", { service_user: "true" }),
  play: async () => {
    await userLoaded();
    await text("Terraform");
  },
};
