import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PlanIcon } from "@/modules/billing/PlanIcon";
import { padded, Row, Stack } from "@/storybook/components";

const meta: Meta<typeof PlanIcon> = {
  title: "Components/PlanIcon",
  component: PlanIcon,
  decorators: [padded],
};
export default meta;

export const Tiers: StoryObj = {
  render: () => (
    <Stack>
      {["Free", "Team", "Business", "Trial"].map((name) => (
        <Row key={name} label={name}>
          <PlanIcon name={name} />
          <PlanIcon name={name} size={33} />
        </Row>
      ))}
    </Stack>
  ),
};
