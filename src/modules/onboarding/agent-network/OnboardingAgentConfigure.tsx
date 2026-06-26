import Button from "@components/Button";
import { ArrowRightIcon } from "lucide-react";
import * as React from "react";
import { AgentConnectTabs } from "@/modules/agent-network/AgentConnectModal";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";

type Props = {
  onBack: () => void;
  onNext: () => void;
};

// OnboardingAgentConfigure covers the quickstart's "Configure Your Agent"
// step. The per-tool snippets (Claude Code, Codex, OpenAI SDK, cURL) are shown
// inline via AgentConnectTabs, with the endpoint pre-filled.
export const OnboardingAgentConfigure = ({ onBack, onNext }: Props) => {
  const { settings, providers } = useAIProviders();

  // Open the tab that matches the connected provider: Anthropic speaks the
  // Claude Code config, everything else is OpenAI-shaped so default to cURL.
  const defaultTab = providers.some((p) => p.providerId === "anthropic_api")
    ? "claude-code"
    : "curl";

  return (
    <div className={"relative flex flex-col h-full gap-4"}>
      <div>
        <h1 className={"text-xl text-center"}>Configure your agent</h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
          }
        >
          {`Point your agent to the NetBird base URL. No client API key is needed,
          NetBird authorizes each request and injects the upstream key server
          side.`}
        </div>
      </div>

      {settings ? (
        <AgentConnectTabs
          endpoint={settings.endpoint}
          listClassName={"px-0"}
          contentClassName={"px-0 py-2"}
          defaultTab={defaultTab}
        />
      ) : (
        <div
          className={
            "mt-2 text-center text-sm text-nb-gray-400 font-light sm:px-4"
          }
        >
          Connect a provider to generate your endpoint, then your agent config
          appears here.
        </div>
      )}

      <div className={"flex items-center justify-center mt-4 gap-3"}>
        <Button variant={"secondary"} onClick={onBack}>
          Go Back
        </Button>
        <Button variant={"primary"} onClick={onNext}>
          Continue
          <ArrowRightIcon size={16} />
        </Button>
      </div>
    </div>
  );
};
