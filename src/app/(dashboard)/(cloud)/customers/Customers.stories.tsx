import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import CustomersPage from "@/app/(dashboard)/(cloud)/customers/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import { distributorInfo } from "@/storybook/fixtures";
import {
  click,
  clickRole,
  dialog,
  findText,
  row,
  settle,
  waitForSelector,
} from "@/storybook/platform";

const distributor = { "GET /integrations/msp/reseller": distributorInfo };

const meta: Meta = {
  title: "Pages/Platform/Cloud/Customers",
  tags: ["cloud"],
  parameters: {
    nextjs: { navigation: { pathname: "/customers" } },
    api: distributor,
  },
  render: () => (
    <DashboardLayout>
      <CustomersPage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const loaded = async () => {
  await row("cust-wayne");
  await settle(600);
};

export const List: Story = {
  tags: ["capture-hover"],
  play: async () => {
    await loaded();
    (await row("cust-cyberdyne")).setAttribute("data-capture", "");
  },
};

export const Empty: Story = {
  parameters: {
    api: { ...distributor, "GET /integrations/msp/reseller/msps": [] },
  },
  play: async () => {
    await findText("Add New Customer");
    await settle();
  },
};

/* The row menu sits past the right edge of the 1280px viewport, so only the edit flow it leads to is captured. */
async function openRowMenu() {
  await loaded();
  const buttons = (await row("cust-wayne")).querySelectorAll("button");
  await click(buttons[buttons.length - 1]);
  await waitForSelector("[role=menu]");
}

export const AddCustomer: Story = {
  play: async () => {
    await loaded();
    await clickRole("button", /Add Customer/);
    await dialog();
    await settle();
  },
};

export const EditCustomerPlan: Story = {
  play: async () => {
    await openRowMenu();
    await click(await findText(/^Edit/));
    await findText("Edit Customer");
    await clickRole("tab", /Plan/);
    await settle();
  },
};
