import Button from "@components/Button";
import { Callout } from "@components/Callout";
import InlineLink, { InlineButtonLink } from "@components/InlineLink";
import useFetchApi from "@utils/api";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  XCircleIcon,
} from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";
import type { APIAgentNetworkAccessLogsResponse } from "@/modules/agent-network/agentAccessLogApi";
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
  onBack: () => void;
  onFinish: () => void;
};

// OnboardingAgentEnd asks for a test request and watches the access log for
// it, as the network onboarding asks for a ping. The operator can skip it.
export const OnboardingAgentEnd = ({ deviceName, onBack, onFinish }: Props) => {
  const outcome = useTestRequest();
  const passed = outcome.kind === "passed";

  return (
    <div className={"relative flex flex-col h-full gap-4"}>
      <div>
        <h1 className={"text-xl text-center max-w-sm mx-auto"}>
          {passed ? "You're all set!" : "Send a test request"}
        </h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
          }
        >
          {passed ? (
            <>
              Your first request went through NetBird. Access Logs show who sent
              each request, the model, tokens, and cost.
            </>
          ) : (
            <>
              Run your agent, or the cURL command from the previous step, on{" "}
              <span className={"text-nb-gray-100 whitespace-nowrap"}>
                {deviceName || "your device"}
              </span>
              . The request shows up here once NetBird logs it.
            </>
          )}
        </div>
      </div>

      <TestRequestStatus outcome={outcome} onOpenLogs={onFinish} />

      <div className={"flex items-center justify-center mt-4 gap-3"}>
        <Button variant={"secondary"} onClick={onBack}>
          Go Back
        </Button>
        {passed ? (
          <Button variant={"primary"} onClick={onFinish}>
            Go to Access Logs
            <ArrowRightIcon size={16} />
          </Button>
        ) : (
          <Button variant={"secondaryLighter"} onClick={onFinish}>
            Skip
          </Button>
        )}
      </div>
    </div>
  );
};

// TestRequestStatus shows what became of the latest request. onOpenLogs leaves
// the onboarding for the Access Logs, as the onboarding covers every page
// while it is open.
const TestRequestStatus = ({
  outcome,
  onOpenLogs,
}: {
  outcome: TestRequestOutcome;
  onOpenLogs: () => void;
}) => {
  if (outcome.kind === "waiting") {
    return <WaitingForDevice text={"Waiting for your first request"} />;
  }

  const { entry } = outcome;
  const forModel = entry.model ? `, for ${entry.model},` : "";

  if (outcome.kind === "passed") {
    return (
      <Callout
        variant={"success"}
        icon={<CheckCircle2Icon size={16} className={"shrink-0 mt-0.5"} />}
        data-testid={"agent-network-test-passed"}
      >
        Your request{forModel} came back with status {entry.status_code}
        {entry.total_tokens > 0 &&
          ` and used ${entry.total_tokens.toLocaleString()} tokens`}
        .
      </Callout>
    );
  }

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

// useTestRequest reads the newest request logged since shortly before the step
// opened, until one passes. A timer drives the reads, not SWR's focus
// revalidation, so a passed request stays on screen.
function useTestRequest(): TestRequestOutcome {
  const [since] = useState(windowStart);
  const { data, mutate } = useFetchApi<APIAgentNetworkAccessLogsResponse>(
    testRequestLogUrl(since),
    true,
    false,
    true,
    { shouldRetryOnError: false },
  );
  const outcome = testRequestOutcome(data?.data?.[0]);
  const waiting = outcome.kind !== "passed";

  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => mutate(), TEST_REQUEST_POLL_MS);
    return () => clearInterval(timer);
  }, [waiting, mutate]);

  return outcome;
}
