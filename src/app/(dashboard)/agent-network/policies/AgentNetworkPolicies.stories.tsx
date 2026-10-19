import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import PoliciesPage from "@/app/(dashboard)/agent-network/policies/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  click,
  clickRole,
  dialog,
  dialogCount,
  findText,
  settle,
  waitForSelector,
} from "@/storybook/platform";

const meta: Meta = {
  title: "Pages/Platform/Agent Network/Policies",
  parameters: {
    nextjs: { navigation: { pathname: "/agent-network/policies" } },
  },
  render: () => (
    <DashboardLayout>
      <PoliciesPage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const loaded = async () => {
  await findText("Engineering → Claude & OpenAI");
  await settle();
};

export const List: Story = {
  tags: ["capture-hover"],
  play: async () => {
    await loaded();
    (await findText("Contractors → Gateway"))
      .closest("tr")
      ?.setAttribute("data-capture", "");
  },
};

export const Empty: Story = {
  parameters: { api: { "GET /agent-network/policies": [] } },
  play: async () => {
    await findText("Create your first policy");
    await settle();
  },
};

async function openRowMenu() {
  await loaded();
  const buttons = (await findText("Contractors → Gateway"))
    .closest("tr")
    ?.querySelectorAll("button");
  await click(buttons?.[buttons.length - 1]);
  await waitForSelector("[role=menu]");
}

const createStory = (tab?: "Limits" | "Guardrails"): Story => ({
  play: async () => {
    await loaded();
    await clickRole("button", /Add Policy/);
    await dialog();
    if (tab) await clickRole("tab", tab);
    await settle();
  },
});
export const Create = createStory();
export const CreateLimits = createStory("Limits");
export const CreateGuardrails = createStory("Guardrails");

const editStory = (tab?: "Limits" | "Guardrails"): Story => ({
  play: async () => {
    await openRowMenu();
    await click(await findText(/^Edit/));
    await findText("Update Agent Policy");
    if (tab) await clickRole("tab", tab);
    await settle();
  },
});
export const Edit = editStory();
export const EditLimits = editStory("Limits");
export const EditGuardrails = editStory("Guardrails");

export const EditEngineeringLimits: Story = {
  play: async () => {
    await loaded();
    const buttons = (await findText("Engineering → Claude & OpenAI"))
      .closest("tr")
      ?.querySelectorAll("button");
    await click(buttons?.[buttons.length - 1]);
    await waitForSelector("[role=menu]");
    await click(await findText(/^Edit/));
    await findText("Update Agent Policy");
    await clickRole("tab", "Limits");
    await settle();
  },
};

export const TokenLimitModal: Story = {
  play: async () => {
    await CreateLimits.play!({} as never);
    await clickRole("button", /Add Token Limit/);
    await dialogCount(2);
    await settle();
  },
};

export const BudgetLimitModal: Story = {
  play: async () => {
    await CreateLimits.play!({} as never);
    await clickRole("button", /Add Budget Limit/);
    await dialogCount(2);
    await settle();
  },
};

export const BrowseGuardrails: Story = {
  play: async () => {
    await EditGuardrails.play!({} as never);
    await clickRole("button", /Browse Guardrails/);
    await findText("Browse Guardrails");
    await dialogCount(2);
    await settle();
  },
};

export const CreateGuardrail: Story = {
  play: async () => {
    await EditGuardrails.play!({} as never);
    const buttons = (await dialog()).querySelectorAll("button");
    const add = Array.from(buttons).find((b) =>
      /Create Guardrail|Add Guardrail|New Guardrail/.test(b.textContent ?? ""),
    );
    await click(add);
    await findText("Create Guardrail");
    await settle();
  },
};
