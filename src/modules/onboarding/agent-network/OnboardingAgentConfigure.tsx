import Button from "@components/Button";
import { ArrowRightIcon, PlugIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import AgentConnectModal from "@/modules/agent-network/AgentConnectModal";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";

type Props = {
  onBack: () => void;
  onNext: () => void;
};

// OnboardingAgentConfigure covers the quickstart's "Configure Your Agent"
// step. It reuses AgentConnectModal, which renders the per-tool snippets
// (Claude Code, Codex, OpenAI SDK, cURL) with the endpoint pre-filled.
export const OnboardingAgentConfigure = ({ onBack, onNext }: Props) => {
  const { settings } = useAIProviders();
  const [open, setOpen] = useState(false);

  return (
    <div className={"relative flex flex-col h-full gap-4"}>
      <div>
        <h1 className={"text-xl text-center"}>Configure your agent</h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
          }
        >
          {`Point your agent at the NetBird endpoint as its base URL. No provider
          API key is needed on the client. NetBird authorizes each request
          against your policies and injects the upstream key server-side.`}
        </div>
      </div>

      <div className={"mt-4 flex items-center justify-center"}>
        <Button
          variant={"secondary"}
          disabled={!settings}
          onClick={() => setOpen(true)}
        >
          <PlugIcon size={16} />
          Show Agent Config
        </Button>
      </div>

      <div className={"flex items-center justify-center mt-4 gap-3"}>
        <Button variant={"secondary"} onClick={onBack}>
          Go Back
        </Button>
        <Button variant={"primary"} onClick={onNext}>
          Continue
          <ArrowRightIcon size={16} />
        </Button>
      </div>

      {settings && (
        <AgentConnectModal
          open={open}
          onOpenChange={setOpen}
          endpoint={settings.endpoint}
        />
      )}
    </div>
  );
};
