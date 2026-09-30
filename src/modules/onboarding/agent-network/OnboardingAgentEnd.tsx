import Button from "@components/Button";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import { ArrowRightIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react";
import * as React from "react";
import type { Peer } from "@/interfaces/Peer";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import type { AgentStep } from "@/modules/onboarding/agent-network/agentNetworkSteps";
import {
  checklistFix,
  ChecklistItem,
  liveChecklist,
} from "@/modules/onboarding/agent-network/gatewayFlow";

type Props = {
  onFinish: () => void;
  // showLiveChecklist lists what has to hold, besides a ready gateway, before
  // an agent's requests go through. Only the flow with a gateway step shows it.
  showLiveChecklist?: boolean;
  // policyStep is whether the flow has a policy step to fix a missing policy.
  policyStep?: boolean;
  // onFix goes back to the step that fixes an unmet checklist item.
  onFix?: (step: AgentStep) => void;
};

// OnboardingAgentEnd wraps up the flow and points at Usage & Logs to confirm
// requests are being recorded, matching the quickstart's "Verify" step.
export const OnboardingAgentEnd = ({
  onFinish,
  showLiveChecklist = false,
  policyStep = true,
  onFix,
}: Props) => {
  return (
    <div className={"relative flex flex-col h-full gap-4"}>
      <div>
        <h1 className={"text-xl text-center max-w-sm mx-auto"}>
          You&apos;re all set! <br />
          Your agent network is ready.
        </h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
          }
        >
          {`Run your agent or send a test request with an allowed model. Open
          Usage & Logs to confirm caller identity, model, tokens, and cost.`}
        </div>
      </div>

      {showLiveChecklist && (
        <LiveChecklist policyStep={policyStep} onFix={onFix} />
      )}

      <div className={"mt-4 flex items-center justify-center"}>
        <Button variant={"secondaryLighter"} onClick={onFinish}>
          Go to Access Logs
          <ArrowRightIcon size={16} />
        </Button>
      </div>
    </div>
  );
};

// What each unmet item offers to do about it, by whether a device is
// connected at all.
const FIX_LABEL: Record<ChecklistItem, (deviceConnected: boolean) => string> = {
  provider: () => "Connect a provider",
  policy: () => "Set up a policy",
  peer: (deviceConnected) =>
    deviceConnected ? "Review the policy" : "Connect your device",
};

// LiveChecklist checks each item against live data: a ready gateway alone
// answers nobody until a provider, a policy and a peer in it exist.
const LiveChecklist = ({
  policyStep,
  onFix,
}: {
  policyStep: boolean;
  onFix?: (step: AgentStep) => void;
}) => {
  const { providers, policies } = useAIProviders();
  const { data: peers } = useFetchApi<Peer[]>("/peers");
  const checks = liveChecklist({ providers, policies, peers: peers ?? [] });
  const deviceConnected = (peers ?? []).some((p) => p.connected);

  const item = (name: ChecklistItem, children: React.ReactNode) => (
    <CheckItem
      done={checks[name]}
      fixLabel={FIX_LABEL[name](deviceConnected)}
      onFix={
        onFix &&
        (() => onFix(checklistFix(name, { policyStep, deviceConnected })))
      }
      data-testid={`agent-network-check-${name}`}
    >
      {children}
    </CheckItem>
  );

  return (
    <div
      className={
        "mt-2 flex flex-col gap-3 rounded-md border border-nb-gray-900 bg-nb-gray-920 py-4 px-5"
      }
      data-testid={"agent-network-live-checklist"}
    >
      <div className={"text-sm"}>Before your first request</div>
      <ul className={"flex flex-col gap-2"}>
        {item("provider", "At least one enabled provider")}
        {item("policy", "At least one enabled policy")}
        {item(
          "peer",
          <>
            The agent&apos;s machine is a connected NetBird peer in one of that
            policy&apos;s source groups
          </>,
        )}
      </ul>
      <div className={"text-xs text-nb-gray-400 font-light"}>
        Agent Network is mesh-only for now: a peer outside the policy gets no
        DNS answer for the endpoint. Traffic goes through relays, so expect a
        little extra latency.
      </div>
    </div>
  );
};

const CheckItem = ({
  done,
  fixLabel,
  onFix,
  children,
  "data-testid": dataTestId,
}: {
  done: boolean;
  fixLabel: string;
  onFix?: () => void;
  children: React.ReactNode;
  "data-testid"?: string;
}) => (
  <li
    className={cn(
      "flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3 text-sm font-light",
      done ? "text-nb-gray-100" : "text-nb-gray-300",
    )}
    data-done={done}
    data-testid={dataTestId}
  >
    <span className={"flex flex-1 items-start gap-2.5"}>
      {done ? (
        <CheckCircle2Icon
          size={16}
          className={"text-green-500 shrink-0 relative top-[2px]"}
        />
      ) : (
        <XCircleIcon
          size={16}
          className={"text-red-500 shrink-0 relative top-[2px]"}
        />
      )}
      <span>{children}</span>
    </span>
    {!done && onFix && (
      <Button
        variant={"secondary"}
        size={"xs"}
        // Lined up under the text on narrow screens, past the icon.
        className={"shrink-0 ml-[26px] sm:ml-0"}
        onClick={onFix}
      >
        {fixLabel}
      </Button>
    )}
  </li>
);
