import Button from "@components/Button";
import { ArrowRightIcon, CheckCircle2Icon, PlusIcon } from "lucide-react";
import * as React from "react";
import { useEffect, useRef } from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import AIProviderModal from "@/modules/agent-network/AIProviderModal";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import { EMPTY_POLICY_LIMITS } from "@/modules/agent-network/data/mockData";

type Props = {
  // createsPolicy is set when the flow has no policy step: this step then
  // creates the first policy itself, without asking.
  createsPolicy: boolean;
  onBack: () => void;
  onNext: () => void;
};

// OnboardingAgentProvider covers the quickstart's "Connect a Provider" step.
// "Done" needs the settings, which the gateway step creates, and a provider.
export const OnboardingAgentProvider = ({
  createsPolicy,
  onBack,
  onNext,
}: Props) => {
  const { settings, providers, openWizard, closeWizard, isWizardOpen } =
    useAIProviders();
  const connected = !!settings && providers.length > 0;
  useStarterPolicy(createsPolicy && connected);

  return (
    <div className={"relative flex flex-col h-full gap-4"}>
      <div>
        <h1 className={"text-xl text-center"}>Connect a provider</h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
          }
        >
          {`A provider is an upstream LLM service NetBird routes to, such as
          OpenAI, Anthropic, Vertex AI, Bedrock, an AI gateway, or a
          self-hosted model server like vLLM. NetBird stores the API key
          securely, so your agents never hold it.`}
        </div>
      </div>

      {connected ? (
        <div className={"mt-4 flex items-center justify-center gap-2 text-sm"}>
          <CheckCircle2Icon size={16} className={"text-green-500"} />
          <span>
            {providers.length > 1
              ? `${providers.length} providers connected.`
              : "Provider connected."}
          </span>
        </div>
      ) : (
        <div className={"mt-4 flex items-center justify-center"}>
          <Button variant={"primary"} onClick={openWizard}>
            <PlusIcon size={16} />
            Connect Provider
          </Button>
        </div>
      )}

      <div className={"flex items-center justify-center mt-4 gap-3"}>
        <Button variant={"secondary"} onClick={onBack}>
          Go Back
        </Button>
        <Button variant={"primary"} disabled={!connected} onClick={onNext}>
          Continue
          <ArrowRightIcon size={16} />
        </Button>
      </div>

      <AIProviderModal open={isWizardOpen} onOpenChange={closeWizard} />
    </div>
  );
};

// useStarterPolicy creates the first policy of an account that has none, as
// Agent Network denies every request without one: the Users group, which the
// onboarding puts the operator in, or else All, may reach the first connected
// provider. It tries once per mount, and addPolicy reports a failure.
function useStarterPolicy(enabled: boolean) {
  const { providers, policies, policiesLoaded, addPolicy } = useAIProviders();
  const { groups } = useGroups();
  const source =
    groups?.find((g) => g.name === "Users") ??
    groups?.find((g) => g.name === "All");
  const provider = providers[0];
  const needed = enabled && policiesLoaded && policies.length === 0;

  // The provider hands out a new callback on every render; the POST has to
  // follow what it creates, not the renders.
  const add = useRef(addPolicy);
  useEffect(() => {
    add.current = addPolicy;
  });
  const started = useRef(false);

  useEffect(() => {
    if (!needed || started.current || !provider || !source?.id) return;
    started.current = true;
    add.current(
      {
        name: `${source.name} to ${provider.name}`,
        description: `Lets the ${source.name} group reach ${provider.name}`,
        enabled: true,
        sourceGroups: [source.id],
        destinationProviderIds: [provider.id],
        guardrailIds: [],
        limits: EMPTY_POLICY_LIMITS,
      },
      { quiet: true },
    );
  }, [needed, provider, source?.id, source?.name]);
}
