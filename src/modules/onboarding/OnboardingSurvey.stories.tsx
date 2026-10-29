import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import DashboardLayout from "@/layouts/DashboardLayout";
import { OnboardingSurvey } from "@/modules/onboarding/OnboardingSurvey";
import { clickRole, settle } from "@/storybook/platform";

const meta: Meta = {
  title: "Pages/Platform/Onboarding/Survey",
  tags: ["cloud"],
  render: () => (
    <DashboardLayout>
      <div className="fixed inset-0 z-50 bg-nb-gray flex items-center justify-center p-8">
        <div className="w-full max-w-md flex flex-col gap-8">
          <OnboardingSurvey domainCategory="private" />
        </div>
      </div>
    </DashboardLayout>
  ),
};
export default meta;

export const Business: StoryObj = {};

export const Personal: StoryObj = {
  play: async () => {
    await clickRole("tab", "Personal");
    await settle();
  },
};
