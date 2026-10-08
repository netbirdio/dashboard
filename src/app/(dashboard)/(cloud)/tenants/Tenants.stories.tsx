import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import TenantsPage from "@/app/(dashboard)/(cloud)/tenants/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import { mspInfo, tenantSwitcher } from "@/storybook/fixtures";
import {
  click,
  clickRole,
  dialog,
  findText,
  popover,
  row,
  settle,
} from "@/storybook/platform";

const msp = {
  "GET /integrations/msp": mspInfo,
  "GET /integrations/msp/switcher": tenantSwitcher,
};

const meta: Meta = {
  title: "Pages/Platform/Cloud/Tenants",
  tags: ["cloud"],
  parameters: { nextjs: { navigation: { pathname: "/tenants" } }, api: msp },
  render: () => (
    <DashboardLayout>
      <TenantsPage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const loaded = async () => {
  await row("tenant-acme");
  await findText("Globex Industries International Holdings");
  await settle(600);
};

export const List: Story = {
  tags: ["capture-hover"],
  play: async () => {
    await loaded();
    (await row("tenant-globex")).setAttribute("data-capture", "");
  },
};

export const Empty: Story = {
  parameters: { api: { ...msp, "GET /integrations/msp/tenants": [] } },
  play: async () => {
    await findText("Add New Tenant");
    await settle();
  },
};

export const TenantSwitcher: Story = {
  play: async () => {
    await loaded();
    await click((await findText("NetBird Managed Services")).closest("button"));
    await popover();
    await settle();
  },
};

export const AddTenant: Story = {
  play: async () => {
    await loaded();
    await clickRole("button", /Add Tenant/);
    await dialog();
    await settle();
  },
};

const editButton = async (id: string) =>
  Array.from((await row(id)).querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === "Edit",
  );

export const EditTenant: Story = {
  play: async () => {
    await loaded();
    await click(await editButton("tenant-acme"));
    await findText("Update Tenant");
    await settle();
  },
};

export const EditTenantPermissions: Story = {
  play: async () => {
    await EditTenant.play!({} as never);
    await clickRole("tab", /Permissions/);
    await settle();
  },
};
