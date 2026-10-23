import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import AIProviderLogo from "@/modules/agent-network/AIProviderLogo";
import type { AIProviderId } from "@/modules/agent-network/data/mockData";
import { PROVIDER_LOGOS } from "@/modules/agent-network/data/providerLogos";
import { padded } from "@/storybook/components";
import { settle } from "@/storybook/platform";

const meta: Meta = {
  title: "Components/AI Provider Logo",
  decorators: [padded],
};
export default meta;

export const AllProviders: StoryObj = {
  render: () => (
    <div className="grid grid-cols-4 gap-6 max-w-4xl">
      {[...(Object.keys(PROVIDER_LOGOS) as AIProviderId[]), undefined].map(
        (providerId) => (
          <div
            key={providerId ?? "unknown"}
            className="flex items-center gap-3"
          >
            <AIProviderLogo providerId={providerId} size={24} />
            <AIProviderLogo providerId={providerId} size={40} tile />
            <span className="text-xs">{providerId ?? "Unknown"}</span>
          </div>
        ),
      )}
    </div>
  ),
  play: async () => {
    await settle(600);
  },
};
