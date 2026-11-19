import Button from "@components/Button";
import { Callout } from "@components/Callout";
import InlineLink, { InlineButtonLink } from "@components/InlineLink";
import useFetchApi from "@utils/api";
import {
  ChartColumnIcon,
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
import { useMatomoEvent } from "@/cloud/analytics/MatomoProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import type {
  APIAgentNetworkAccessLog,
  APIAgentNetworkAccessLogsResponse,
} from "@/modules/agent-network/agentAccessLogApi";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
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
  const t = useTranslations();
  const outcome = useTestRequest(userId);
  useMatomoEvent(outcome.kind !== "waiting" && "test_request", outcome.kind);

  if (outcome.kind === "passed") {
    return <AllSet entry={outcome.entry} onBack={onBack} onFinish={onFinish} />;
  }

  return (
    <div className={"relative flex flex-col h-full gap-4"}>
      <div>
        <h1 className={"text-xl text-center max-w-sm mx-auto"}>
          {t("onboarding.sendATestRequest")}
        </h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
          }
        >
          {t.rich("onboarding.runYourAgentOrTheCURLCommandFromThePrevious", {
            part0: (chunks) => (
              <span className={"text-nb-gray-100 whitespace-nowrap"}>
                {chunks}
              </span>
            ),
            part1: () => deviceName || t("onboarding.yourDevice"),
          })}
        </div>
      </div>

      <TestRequestStatus outcome={outcome} onOpenLogs={onFinish} />

      <div className={"flex items-center justify-center mt-4 gap-3"}>
        <Button variant={"secondary"} onClick={onBack}>
          {t("onboarding.goBack")}
        </Button>
        <Button variant={"secondaryLighter"} onClick={onFinish}>
          {t("onboarding.skip")}
        </Button>
      </div>
    </div>
  );
};

// The dashboard's Agent Network sections, one line each.

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
}) => {
  const t = useTranslations();

  const SECTIONS: { icon: LucideIcon; title: string; description: string }[] = [
    {
      icon: KeyRoundIcon,
      title: t("common.providers"),
      description: t("onboarding.connectProvidersAndPickModels"),
    },
    {
      icon: ShieldCheckIcon,
      title: t("common.policies"),
      description: t("onboarding.chooseWhoCanUseEachProvider"),
    },
    {
      icon: ListChecksIcon,
      title: t("onboarding.guardrails"),
      description: t("onboarding.limitModelsAndCapturePrompts"),
    },
    {
      icon: GaugeIcon,
      title: t("onboarding.budgetsAndLimits"),
      description: t("onboarding.capTokenUseAndSpend"),
    },
    {
      icon: ChartColumnIcon,
      title: t("agentNetwork.usage"),
      description: t("onboarding.trackTokensAndSpendOverTime"),
    },
    {
      icon: ScrollTextIcon,
      title: t("common.accessLogs"),
      description: t("onboarding.seeEveryRequestAndWhoSentIt"),
    },
    {
      icon: DatabaseIcon,
      title: t("onboarding.logRetention"),
      description: t("onboarding.chooseHowLongLogsAreKept"),
    },
    {
      icon: SquareTerminalIcon,
      title: t("onboarding.agentSetup"),
      description: t("onboarding.configureClaudeCodeAndCodex"),
    },
  ];
  return (
    <div className={"relative flex flex-col h-full gap-4"}>
      <div>
        <h1 className={"text-xl text-center max-w-sm mx-auto"}>
          {t("onboarding.youReAllSet")}
        </h1>
        <PassedRequest entry={entry} />
      </div>

      <ul
        className={
          "mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 text-sm"
        }
        data-testid={"agent-network-sections"}
      >
        {SECTIONS.map(({ icon: Icon, title, description }) => (
          <li key={title} className={"flex items-start gap-3"}>
            <Icon size={16} className={"text-nb-gray-400 shrink-0 mt-0.5"} />
            <div>
              <div className={"text-nb-gray-100"}>{title}</div>
              <div className={"text-nb-gray-400 font-light mt-0.5"}>
                {description}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className={"flex items-center justify-center mt-4 gap-3"}>
        <Button variant={"secondary"} onClick={onBack}>
          {t("components.goBack")}
        </Button>
        <Button variant={"primary"} onClick={onFinish}>
          {t("onboarding.finish")}
          <CheckIcon size={16} />
        </Button>
      </div>
    </div>
  );
};

// PassedRequest is the step's subtitle: it names the provider the test
// request was routed to when it is one of the account's.
const PassedRequest = ({ entry }: { entry: APIAgentNetworkAccessLog }) => {
  const t = useTranslations();
  const { providers } = useAIProviders();
  const provider = providers.find((p) => p.id === entry.resolved_provider_id);

  return (
    <div
      className={
        "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
      }
      data-testid={"agent-network-test-passed"}
    >
      {passedSentence(t, entry, provider?.name)}
    </div>
  );
};

// passedSentence reads e.g. "Your request reached Anthropic and used 1,234
// tokens.", naming the model when the provider is unknown.
const passedSentence = (
  t: ReturnType<typeof useTranslations>,
  entry: APIAgentNetworkAccessLog,
  providerName?: string,
) => {
  const target = providerName || entry.model;
  if (!target)
    return entry.total_tokens > 0
      ? t("onboarding.yourRequestWentThroughAndUsedCountNumberTokens", {
          count: entry.total_tokens,
        })
      : t("onboarding.yourRequestWentThrough");
  return entry.total_tokens > 0
    ? t("onboarding.yourRequestReachedTargetAndUsedCountNumberTokens", {
        target,
        count: entry.total_tokens,
      })
    : t("onboarding.yourRequestReachedTarget", { target });
};

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
  const t = useTranslations();
  if (outcome.kind === "waiting") {
    return (
      <WaitingForDevice text={t("onboarding.waitingForYourFirstRequest")} />
    );
  }

  const { entry } = outcome;
  const forModel = entry.model
    ? t("onboarding.forModel", { model: entry.model })
    : "";

  return (
    <div className={"flex flex-col"}>
      <Callout
        variant={outcome.kind === "denied" ? "error" : "warning"}
        icon={<XCircleIcon size={16} className={"shrink-0 mt-0.5"} />}
        data-testid={`agent-network-test-${outcome.kind}`}
      >
        <p>
          {outcome.kind === "denied"
            ? t("onboarding.yourLastRequestForModelWasDeniedValue", {
                forModel: forModel,
                value:
                  formatDenyReason(entry.deny_reason) ||
                  t("onboarding.noReasonGiven"),
              })
            : t(
                "onboarding.yourLastRequestForModelReachedTheProviderAndCameBack",
                { forModel: forModel, status_code: entry.status_code },
              )}
        </p>
        <p className={"mt-1"}>
          {t("onboarding.learnMoreInThe")}{" "}
          <InlineButtonLink variant={"dashed"} onClick={onOpenLogs}>
            {t("common.accessLogs")}
          </InlineButtonLink>{" "}
          {t("onboarding.orThe")}{" "}
          <InlineLink
            variant={"dashed"}
            href={QUICKSTART_DOCS}
            target={"_blank"}
          >
            {t("onboarding.docs")}
            <ExternalLinkIcon size={12} />
          </InlineLink>
          .
        </p>
      </Callout>
      <WaitingForDevice text={t("onboarding.waitingForYourNextRequest")} />
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
