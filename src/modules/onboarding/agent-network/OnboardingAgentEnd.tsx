import Button from "@components/Button";
import { Callout } from "@components/Callout";
import InlineLink, { InlineButtonLink } from "@components/InlineLink";
import useFetchApi from "@utils/api";
import {
  ChartColumnIcon,
  CheckCircle2Icon,
  CheckIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  GaugeIcon,
  KeyRoundIcon,
  ListChecksIcon,
  LucideIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  SquareTerminalIcon,
  XCircleIcon,
} from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";
import type {
  APIAgentNetworkAccessLog,
  APIAgentNetworkAccessLogsResponse,
} from "@/modules/agent-network/agentAccessLogApi";
import { formatDenyReason } from "@/modules/agent-network/data/mockData";
import {
  TEST_REQUEST_LOOKBACK_MS,
  TEST_REQUEST_POLL_MS,
  testRequestLogUrl,
  TestRequestOutcome,
  testRequestOutcome,
} from "@/modules/onboarding/agent-network/testRequest";
import { WaitingForDevice } from "@/modules/onboarding/OnboardingDevices";

const QUICKSTART_DOCS = "https://docs.netbird.io/agent-network/quickstart";

type Props = {
  // deviceName names the operator's device, where the test request has to
  // come from: only a peer in the policy reaches the endpoint.
  deviceName?: string;
  // userId is the operator's: only their own request counts as the test, not
  // another user's traffic on the account.
  userId?: string;
  onBack: () => void;
  onFinish: () => void;
};

// OnboardingAgentEnd asks for a test request and watches the access log for
// it, as the network onboarding asks for a ping. The operator can skip it.
export const OnboardingAgentEnd = ({
  deviceName,
  userId,
  onBack,
  onFinish,
}: Props) => {
  const outcome = useTestRequest(userId);

  if (outcome.kind === "passed") {
    return <AllSet entry={outcome.entry} onBack={onBack} onFinish={onFinish} />;
  }

  return (
    <div className={"relative flex flex-col h-full gap-4"}>
      <div>
        <h1 className={"text-xl text-center max-w-sm mx-auto"}>
          Send a test request
        </h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
          }
        >
          Run your agent, or the cURL command from the previous step, on{" "}
          <span className={"text-nb-gray-100 whitespace-nowrap"}>
            {deviceName || "your device"}
          </span>
          . The request shows up here once NetBird logs it.
        </div>
      </div>

      <TestRequestStatus outcome={outcome} onOpenLogs={onFinish} />

      <div className={"flex items-center justify-center mt-4 gap-3"}>
        <Button variant={"secondary"} onClick={onBack}>
          Go Back
        </Button>
        <Button variant={"secondaryLighter"} onClick={onFinish}>
          Skip
        </Button>
      </div>
    </div>
  );
};

// The dashboard's Agent Network sections, one line each.
const SECTIONS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: KeyRoundIcon,
    title: "Providers",
    description: "Connect providers and pick models.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Policies",
    description: "Choose who can use each provider.",
  },
  {
    icon: ListChecksIcon,
    title: "Guardrails",
    description: "Limit models and capture prompts.",
  },
  {
    icon: GaugeIcon,
    title: "Budgets and limits",
    description: "Cap token use and spend.",
  },
  {
    icon: ChartColumnIcon,
    title: "Usage",
    description: "Track tokens and spend over time.",
  },
  {
    icon: ScrollTextIcon,
    title: "Access Logs",
    description: "See every request and who sent it.",
  },
  {
    icon: DatabaseIcon,
    title: "Log collection",
    description: "Choose how long logs are kept.",
  },
  {
    icon: SquareTerminalIcon,
    title: "Connect Agent",
    description: "Set up Claude Code and Codex.",
  },
];

// AllSet is where a passed test request ends the onboarding: it confirms the
// request and lists what the dashboard offers from here.
const AllSet = ({
  entry,
  onBack,
  onFinish,
}: {
  entry: APIAgentNetworkAccessLog;
  onBack: () => void;
  onFinish: () => void;
}) => (
  <div className={"relative flex flex-col h-full gap-4"}>
    <div>
      <h1 className={"text-xl text-center max-w-sm mx-auto"}>
        You&apos;re all set!
      </h1>
      <div
        className={
          "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
        }
      >
        Your first request went through NetBird. Shape the rest from the
        dashboard.
      </div>
    </div>

    <Callout
      variant={"success"}
      icon={<CheckCircle2Icon size={16} className={"shrink-0 mt-0.5"} />}
      data-testid={"agent-network-test-passed"}
    >
      Your request{entry.model ? `, for ${entry.model},` : ""} came back with
      status {entry.status_code}
      {entry.total_tokens > 0 &&
        ` and used ${entry.total_tokens.toLocaleString()} tokens`}
      .
    </Callout>

    <ul
      className={"grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mt-2"}
      data-testid={"agent-network-sections"}
    >
      {SECTIONS.map(({ icon: Icon, title, description }) => (
        <li key={title} className={"flex items-start gap-3"}>
          <Icon size={16} className={"text-netbird shrink-0 mt-0.5"} />
          <div>
            <div className={"text-sm text-nb-gray-100"}>{title}</div>
            <div className={"text-sm text-nb-gray-400 font-light mt-0.5"}>
              {description}
            </div>
          </div>
        </li>
      ))}
    </ul>

    <div className={"flex items-center justify-center mt-4 gap-3"}>
      <Button variant={"secondary"} onClick={onBack}>
        Go Back
      </Button>
      <Button variant={"primary"} onClick={onFinish}>
        Finish
        <CheckIcon size={16} />
      </Button>
    </div>
  </div>
);

// TestRequestStatus shows what became of the latest request. onOpenLogs leaves
// the onboarding for the Access Logs, as the onboarding covers every page
// while it is open.
const TestRequestStatus = ({
  outcome,
  onOpenLogs,
}: {
  outcome: Exclude<TestRequestOutcome, { kind: "passed" }>;
  onOpenLogs: () => void;
}) => {
  if (outcome.kind === "waiting") {
    return <WaitingForDevice text={"Waiting for your first request"} />;
  }

  const { entry } = outcome;
  const forModel = entry.model ? `, for ${entry.model},` : "";

  return (
    <div className={"flex flex-col"}>
      <Callout
        variant={outcome.kind === "denied" ? "error" : "warning"}
        icon={<XCircleIcon size={16} className={"shrink-0 mt-0.5"} />}
        data-testid={`agent-network-test-${outcome.kind}`}
      >
        <p>
          {outcome.kind === "denied"
            ? `Your last request${forModel} was denied: ${
                formatDenyReason(entry.deny_reason) || "no reason given"
              }.`
            : `Your last request${forModel} reached the provider and came back with status ${entry.status_code}.`}
        </p>
        <p className={"mt-1"}>
          Learn more in the{" "}
          <InlineButtonLink variant={"dashed"} onClick={onOpenLogs}>
            Access Logs
          </InlineButtonLink>{" "}
          or the{" "}
          <InlineLink
            variant={"dashed"}
            href={QUICKSTART_DOCS}
            target={"_blank"}
          >
            docs
            <ExternalLinkIcon size={12} />
          </InlineLink>
          .
        </p>
      </Callout>
      <WaitingForDevice text={"Waiting for your next request"} />
    </div>
  );
};

// windowStart opens the window the test request is looked for in.
const windowStart = () => new Date(Date.now() - TEST_REQUEST_LOOKBACK_MS);

// useTestRequest reads the operator's newest request since shortly before the
// step opened, until one passes. It reads nothing until it knows the operator.
// A timer drives the reads, not SWR's focus revalidation, so a passed request
// stays on screen.
function useTestRequest(userId?: string): TestRequestOutcome {
  const [since] = useState(windowStart);
  const { data, mutate } = useFetchApi<APIAgentNetworkAccessLogsResponse>(
    testRequestLogUrl(since, userId ?? ""),
    true,
    false,
    !!userId,
    { shouldRetryOnError: false },
  );
  const outcome = testRequestOutcome(data?.data?.[0]);
  const watching = !!userId && outcome.kind !== "passed";

  useEffect(() => {
    if (!watching) return;
    const timer = setInterval(() => mutate(), TEST_REQUEST_POLL_MS);
    return () => clearInterval(timer);
  }, [watching, mutate]);

  return outcome;
}
