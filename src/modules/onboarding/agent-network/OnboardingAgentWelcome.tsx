import Button from "@components/Button";
import SquareIcon from "@components/SquareIcon";
import {
  ArrowRightIcon,
  BotIcon,
  KeyRoundIcon,
  ServerIcon,
  ShieldCheckIcon,
} from "lucide-react";
import * as React from "react";

type Props = {
  onNext: () => void;
};

// OnboardingAgentWelcome is the first step of the Agent Network onboarding.
// It frames what Agent Network does before the operator starts wiring up a
// device, provider, and policy. Mirrors the intro of the quickstart guide.
export const OnboardingAgentWelcome = ({ onNext }: Props) => {
  return (
    <div className={"relative flex flex-col h-full gap-4"}>
      <div>
        <h1 className={"text-xl text-center"}>Welcome to Agent Network</h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
          }
        >
          {`Agent Network is the access-control layer for AI agents. Route LLM
          requests through one keyless endpoint and give agents scoped access to
          internal resources, all enforced by your policies.`}
        </div>
      </div>

      <div className={"mt-4 flex flex-col gap-4"}>
        <Highlight
          icon={<KeyRoundIcon size={16} />}
          title={"Keyless for your agents"}
          description={
            "Provider API keys live on the server. Agents authenticate over an encrypted WireGuard tunnel — no secrets on the client."
          }
        />
        <Highlight
          icon={<ShieldCheckIcon size={16} />}
          title={"Policy-controlled access"}
          description={
            "Every request is authorized against your policies before it reaches a provider, with optional token and budget limits and guardrails."
          }
        />
        <Highlight
          icon={<ServerIcon size={16} />}
          title={"Access to internal resources"}
          description={
            "Agents reach internal databases, APIs, and self-hosted models directly over an encrypted peer-to-peer tunnel."
          }
        />
        <Highlight
          icon={<BotIcon size={16} />}
          title={"Per-identity usage & logs"}
          description={
            "See who called which model, how many tokens it cost, and whether it was allowed — all attributed to the real caller."
          }
        />
      </div>

      <div className={"flex items-center justify-center mt-6"}>
        <Button variant={"primary"} onClick={onNext}>
          Get Started
          <ArrowRightIcon size={16} />
        </Button>
      </div>
    </div>
  );
};

const Highlight = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => {
  return (
    <div className={"flex gap-3 items-start"}>
      <SquareIcon color={"netbird"} margin={""} icon={icon} />
      <div>
        <div className={"text-sm"}>{title}</div>
        <div className={"text-[0.8rem] text-nb-gray-300 font-light mt-1 block"}>
          {description}
        </div>
      </div>
    </div>
  );
};
