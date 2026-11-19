import Button from "@components/Button";
import { ArrowRightIcon, CheckCircle2Icon, PlusIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
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
  const t = useTranslations();
  const { policies } = useAIProviders();
  const [open, setOpen] = useState(false);
  const hasPolicy = policies.length > 0;

  return (
    <div className={"relative flex flex-col h-full gap-4"}>
      <div>
        <h1 className={"text-xl text-center"}>
          {t("onboarding.createAPolicy")}
        </h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
          }
        >
          {t(
            "onboarding.byDefaultAgentNetworkDeniesEveryRequestPoliciesConnectSource",
          )}
        </div>
      </div>

      {hasPolicy ? (
        <div className={"mt-4 flex items-center justify-center gap-2 text-sm"}>
          <CheckCircle2Icon size={16} className={"text-green-500"} />
          <span>
            {t.rich("onboarding.authorizedAgentsCanNowReachTheProvider", {
              part0: () =>
                policies.length > 1
                  ? `${policies.length} policies created.`
                  : "Policy created.",
            })}
          </span>
        </div>
      ) : (
        <div className={"mt-4 flex items-center justify-center"}>
          <Button variant={"primary"} onClick={() => setOpen(true)}>
            <PlusIcon size={16} />
            {t("common.addPolicy")}
          </Button>
        </div>
      )}

      <div className={"flex items-center justify-center mt-4 gap-3"}>
        <Button variant={"secondary"} onClick={onBack}>
          {t("onboarding.goBack")}
        </Button>
        <Button variant={"primary"} disabled={!hasPolicy} onClick={onNext}>
          {t("common.continue")}
          <ArrowRightIcon size={16} />
        </Button>
      </div>

      <AgentPolicyModal open={open} onOpenChange={setOpen} />
    </div>
  );
};
