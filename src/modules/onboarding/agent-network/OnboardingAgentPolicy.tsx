import Button from "@components/Button";
import { ArrowRightIcon, CheckCircle2Icon, PlusIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import AgentPolicyModal from "@/modules/agent-network/AgentPolicyModal";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";

type Props = {
  onBack: () => void;
  onNext: () => void;
};

// OnboardingAgentPolicy covers the quickstart's "Create a Policy" step. By
// default Agent Network denies every request; nothing reaches a provider
// until a policy connects a source group to one or more providers.
export const OnboardingAgentPolicy = ({ onBack, onNext }: Props) => {
  const { policies } = useAIProviders();
  const [open, setOpen] = useState(false);
  const hasPolicy = policies.length > 0;

  return (
    <div className={"relative flex flex-col h-full gap-4"}>
      <div>
        <h1 className={"text-xl text-center"}>Create a policy</h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
          }
        >
          {`By default Agent Network denies every request. A policy connects a
          source group — your users or agent devices — to one or more
          providers, and is where you attach optional token and budget limits
          and guardrails.`}
        </div>
      </div>

      {hasPolicy ? (
        <div className={"mt-4 flex items-center justify-center gap-2 text-sm"}>
          <CheckCircle2Icon size={16} className={"text-green-500"} />
          <span>
            {policies.length > 1
              ? `${policies.length} policies created.`
              : "Policy created."}{" "}
            Authorized agents can now reach the provider.
          </span>
        </div>
      ) : (
        <div className={"mt-4 flex items-center justify-center"}>
          <Button variant={"primary"} onClick={() => setOpen(true)}>
            <PlusIcon size={16} />
            Add Policy
          </Button>
        </div>
      )}

      <div className={"flex items-center justify-center mt-4 gap-3"}>
        <Button variant={"secondary"} onClick={onBack}>
          Go Back
        </Button>
        <Button variant={"primary"} disabled={!hasPolicy} onClick={onNext}>
          Continue
          <ArrowRightIcon size={16} />
        </Button>
      </div>

      <AgentPolicyModal open={open} onOpenChange={setOpen} />
    </div>
  );
};
