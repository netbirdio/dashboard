import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import PlanCancelPage from "@/app/(dashboard)/(cloud)/plans/cancel/page";
import PlansPage from "@/app/(dashboard)/(cloud)/plans/page";
import PlanSuccessPage from "@/app/(dashboard)/(cloud)/plans/success/page";
import DashboardLayout from "@/layouts/DashboardLayout";

/* The /plans routes only forward to the billing settings tab (see Billing
   stories for the destination); these capture the loading state they show. */
const meta: Meta = {
  title: "Pages/Platform/Cloud/Plans",
  tags: ["cloud"],
};
export default meta;
type Story = StoryObj;

export const Plans: Story = {
  parameters: { nextjs: { navigation: { pathname: "/plans" } } },
  render: () => (
    <DashboardLayout>
      <PlansPage />
    </DashboardLayout>
  ),
};

export const Success: Story = {
  parameters: { nextjs: { navigation: { pathname: "/plans/success" } } },
  render: () => (
    <DashboardLayout>
      <PlanSuccessPage />
    </DashboardLayout>
  ),
};

export const Cancel: Story = {
  parameters: { nextjs: { navigation: { pathname: "/plans/cancel" } } },
  render: () => (
    <DashboardLayout>
      <PlanCancelPage />
    </DashboardLayout>
  ),
};
