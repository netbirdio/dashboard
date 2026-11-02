import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ProvidersPage from "@/app/(dashboard)/agent-network/providers/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  click,
  clickRole,
  clickTestId,
  dialog,
  findText,
  settle,
  type,
  waitForSelector,
} from "@/storybook/platform";

const meta: Meta = {
  title: "Pages/Platform/Agent Network/Providers",
  parameters: {
    nextjs: { navigation: { pathname: "/agent-network/providers" } },
  },
  render: () => (
    <DashboardLayout>
      <ProvidersPage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const loaded = async () => {
  await findText("OpenAI Production");
  await settle();
};

export const List: Story = {
  tags: ["capture-hover"],
  play: async () => {
    await loaded();
    (await findText("Azure OpenAI (EU West)"))
      .closest("tr")
      ?.setAttribute("data-capture", "");
  },
};

export const RowMenu: Story = {
  play: async () => {
    await loaded();
    const buttons = (await findText("Azure OpenAI (EU West)"))
      .closest("tr")
      ?.querySelectorAll("button");
    await click(buttons?.[buttons.length - 1]);
    await waitForSelector("[role=menu]");
    await settle();
  },
};

/* Before the first provider the endpoint is not bootstrapped, so the header offers to set it up. */
export const Empty: Story = {
  parameters: {
    api: {
      "GET /agent-network/providers": [],
      "GET /agent-network/settings": {
        endpoint: "",
        proxy_address: "",
        dedicated: false,
        enable_log_collection: false,
        enable_prompt_collection: false,
        redact_pii: false,
      },
    },
  },
  play: async () => {
    await findText("Connect a provider");
    await settle();
  },
};

async function openConnect() {
  await loaded();
  await clickTestId("connect-agent-network-provider");
  return dialog();
}

export const ConnectModal: Story = {
  play: async () => {
    await openConnect();
    await settle();
  },
};

export const ConnectModalProviderDropdown: Story = {
  play: async () => {
    await openConnect();
    await clickTestId("agent-network-provider-type");
    await findText(/Search providers/).catch(() => undefined);
    await settle();
  },
};

async function connectLiteLLM() {
  await ConnectModalProviderDropdown.play!({} as never);
  await clickTestId("agent-network-provider-option-litellm_proxy");
  await settle();
  const modal = await dialog();
  await type(
    modal.querySelector(
      "[data-testid=agent-network-provider-api-key] input, input[data-testid=agent-network-provider-api-key]",
    ),
    "sk-regression-test-key",
  );
  await settle();
}

export const ConnectModalFilled: Story = { play: connectLiteLLM };

export const ConnectModalModelsTab: Story = {
  play: async () => {
    await connectLiteLLM();
    await clickTestId("agent-network-provider-models-tab");
    await settle();
  },
};

export const ConnectModalMappingsTab: Story = {
  play: async () => {
    await connectLiteLLM();
    await clickTestId("agent-network-provider-mappings-tab");
    await settle();
  },
};

const editStory = (name: string, tab?: "Models" | "Mappings"): Story => ({
  play: async () => {
    await loaded();
    await click(await findText(name));
    await findText("Edit Provider");
    if (tab) await clickRole("tab", tab);
    await settle();
  },
});

export const EditOpenAI = editStory("OpenAI Production");
export const EditOpenAIModels = editStory("OpenAI Production", "Models");
export const EditAnthropicModels = editStory("Anthropic Claude", "Models");
export const EditBedrock = editStory("AWS Bedrock");
export const EditBedrockMappings = editStory("AWS Bedrock", "Mappings");
export const EditLiteLLMMappings = editStory("LiteLLM Gateway", "Mappings");
export const EditBifrostMappings = editStory("Bifrost", "Mappings");
export const EditVLLM = editStory(
  "Self-hosted vLLM cluster in the Frankfurt datacenter (GPU rack 4)",
);
