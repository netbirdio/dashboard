import Button from "@components/Button";
import { Callout } from "@components/Callout";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import AIProviderModal from "@/modules/agent-network/AIProviderModal";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import {
  AgentPolicy,
  EMPTY_POLICY_LIMITS,
} from "@/modules/agent-network/data/mockData";
import { OnboardingPolicy } from "@/modules/onboarding/OnboardingPolicy";

type Props = {
  // createsPolicy is set when the flow has no policy step: this step then
  // creates the first policy itself and lets the operator turn it off.
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
          OpenAI, Anthropic, or an AI gateway. NetBird stores the API key
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

      {createsPolicy && connected && <StarterPolicy />}

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

// StarterPolicy explains the policy a new account starts with, the way the
// network onboarding explains the one it creates, with a switch to turn it off.
const StarterPolicy = () => {
  const { togglePolicy } = useAIProviders();
  const { policy, failed, retry } = useStarterPolicy();

  if (!policy && failed) {
    return (
      <Callout
        variant={"warning"}
        className={"mt-2"}
        data-testid={"agent-network-starter-policy-failed"}
      >
        Agent Network denies every request by default, and the policy that lets
        your devices use this provider could not be created.
        <div className={"mt-3"}>
          <Button variant={"secondary"} size={"xs"} onClick={retry}>
            <RefreshCwIcon size={14} />
            Try again
          </Button>
        </div>
      </Callout>
    );
  }

  return (
    <div className={"mt-2"} data-testid={"agent-network-starter-policy"}>
      <div
        className={"text-sm text-nb-gray-300 font-light text-center sm:px-4"}
      >
        {`Agent Network denies every request by default. We've created a policy
        so your devices can use this provider; turn it off to see requests get
        denied.`}
      </div>
      {policy ? (
        <OnboardingPolicy
          policy={policy}
          onToggle={(p) => togglePolicy(p.id)}
        />
      ) : (
        <div
          className={
            "mt-3 flex items-center justify-center gap-2 text-sm text-nb-gray-300"
          }
        >
          <Loader2Icon size={16} className={"animate-spin"} />
          Creating a policy…
        </div>
      )}
    </div>
  );
};

// useStarterPolicy creates the first policy of an account that has none: the
// Users group, which the onboarding puts the operator in, may reach the first
// connected provider. It returns the policy to explain, or that creating it
// failed, which only a retry tries again.
function useStarterPolicy(): {
  policy?: AgentPolicy;
  failed: boolean;
  retry: () => void;
} {
  const { providers, policies, policiesLoaded, addPolicy } = useAIProviders();
  const { groups } = useGroups();
  const source =
    groups?.find((g) => g.name === "Users") ??
    groups?.find((g) => g.name === "All");
  const provider = providers[0];
  const needed = policiesLoaded && policies.length === 0;
  // Once the groups are read, an account with neither group has nothing to
  // start the policy from.
  const noSource = !!groups && !source?.id;

  // The provider hands out a new callback on every render; the POST has to
  // follow what it creates, not the renders.
  const add = useRef(addPolicy);
  useEffect(() => {
    add.current = addPolicy;
  });
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!needed || failed || started.current || !provider || !source?.id) {
      return;
    }
    started.current = true;
    add
      .current({
        name: `${source.name} to ${provider.name}`,
        description: `Lets the ${source.name} group reach ${provider.name}`,
        enabled: true,
        sourceGroups: [source.id],
        destinationProviderIds: [provider.id],
        guardrailIds: [],
        limits: EMPTY_POLICY_LIMITS,
      })
      .then((created) => {
        if (created) return;
        started.current = false;
        setFailed(true);
      });
  }, [needed, failed, provider, source?.id, source?.name]);

  return {
    policy: policies[0],
    failed: failed || (needed && noSource),
    retry: () => setFailed(false),
  };
}
