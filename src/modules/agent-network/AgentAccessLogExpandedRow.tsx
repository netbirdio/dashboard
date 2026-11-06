"use client";

import Badge from "@components/Badge";
import Code from "@components/Code";
import FullTooltip from "@components/FullTooltip";
import { HelpTooltip } from "@components/HelpTooltip";
import { cn } from "@utils/helpers";
import { GaugeIcon, ShieldXIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import {
  AIAccessLogEntry,
  BlockedByTarget,
  ERROR_SOURCE_INFO,
  formatDenyReason,
  resolveBlockedBy,
} from "@/modules/agent-network/data/mockData";

type Props = {
  entry: AIAccessLogEntry;
  // The caller only sees their own requests and can't open the Policies or
  // Global Limits pages, so "Blocked by" is plain text instead of a link.
  selfScoped?: boolean;
};

/**
 * Expanded row for the Agent Network access log. Mirrors the layout of
 * the Proxy Events expanded row: stacked sections with copyable Code
 * blocks. Surfaces the prompt and completion when captured, the deny
 * reason for blocked requests, who failed a failed request, and the
 * per-request metadata.
 */
export default function AgentAccessLogExpandedRow({
  entry,
  selfScoped = false,
}: Readonly<Props>) {
  const { policies, budgetRules } = useAIProviders();
  const isDeny = entry.decision === "deny";
  const hasSession = Boolean(entry.sessionId);
  const hasPrompt = Boolean(entry.prompt);
  const hasCompletion = Boolean(entry.completion);
  const hasBody = hasPrompt || hasCompletion;
  const denyReason = formatDenyReason(entry.denyReason);
  const isFailed = entry.status >= 400;
  const errorSource = isFailed ? entry.errorSource : undefined;
  const errorDetail = isFailed ? entry.errorDetail : undefined;
  const blocked = isFailed
    ? resolveBlockedBy(entry, policies, budgetRules)
    : undefined;

  const cacheRead = entry.cachedInputTokens ?? 0;
  const cacheWrite = entry.cacheCreationTokens ?? 0;
  const metadata: Record<string, string> = {
    // The vendor label the proxy actually stamped, not the dashboard's
    // normalised catalog id — this block mirrors the wire metadata, and a
    // request rejected before it was parsed as an LLM call carries no vendor.
    "plg.llm.provider": entry.providerVendor ?? entry.providerId,
    "plg.llm.model": entry.model,
    "plg.llm.input_tokens": String(entry.inputTokens),
    "plg.llm.output_tokens": String(entry.outputTokens),
    "plg.llm.total_tokens": String(
      entry.inputTokens + entry.outputTokens + cacheRead + cacheWrite,
    ),
    "plg.llm.cost_usd": entry.costUsd.toFixed(6),
    "plg.llm.stream": entry.stream ? "true" : "false",
    "plg.agentnetwork.policy_name": entry.policyName,
    "plg.agentnetwork.user_groups": (entry.userGroups ?? []).join(", "),
  };
  if (cacheRead > 0 || cacheWrite > 0) {
    metadata["plg.llm.cached_input_tokens"] = String(cacheRead);
    metadata["plg.llm.cache_creation_tokens"] = String(cacheWrite);
    metadata["plg.cost.usd_cache"] = (entry.cacheCostUsd ?? 0).toFixed(6);
  }
  // Per-bucket cost keys mirror the proxy's cost.usd_* metadata. Emitted only
  // when the server sent the breakdown, so a row from an older management
  // server shows no misleading zeros.
  if (entry.inputCostUsd !== undefined || entry.outputCostUsd !== undefined) {
    metadata["plg.cost.usd_input"] = (entry.inputCostUsd ?? 0).toFixed(6);
    metadata["plg.cost.usd_cached_input"] = (
      entry.cachedInputCostUsd ?? 0
    ).toFixed(6);
    metadata["plg.cost.usd_cache_creation"] = (
      entry.cacheCreationCostUsd ?? 0
    ).toFixed(6);
    metadata["plg.cost.usd_output"] = (entry.outputCostUsd ?? 0).toFixed(6);
  }
  if (isDeny) {
    metadata["plg.llm_policy.decision"] = "deny";
    metadata["plg.llm_policy.reason"] = entry.denyReason ?? "unknown";
  }
  const metadataJSON = JSON.stringify(metadata, null, 2);
  const requestLine = [entry.method, entry.path].filter(Boolean).join(" ");

  return (
    <div className={"px-4 py-4 space-y-3 bg-nb-gray-940/30"}>
      {requestLine && (
        <Section heading={"Request"}>
          <Code dark small codeToCopy={requestLine}>
            <Code.Line>{requestLine}</Code.Line>
          </Code>
        </Section>
      )}

      {hasSession && (
        <Section
          heading={"Session ID"}
          tooltip={
            "The provider-side session this request belongs to. A single user " +
            "can make several separate calls that the provider groups under the " +
            "same session id."
          }
        >
          <Code dark small codeToCopy={entry.sessionId}>
            <Code.Line>{entry.sessionId}</Code.Line>
          </Code>
        </Section>
      )}

      {isDeny && (
        <Section heading={"Reason"}>
          <div
            className={
              "rounded-md border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300"
            }
          >
            {denyReason
              ? `Request denied: ${denyReason}`
              : "Request denied by policy."}
          </div>
        </Section>
      )}

      {errorSource && (
        <Section heading={"Error source"}>
          <div className={"flex items-center gap-2 text-xs text-nb-gray-300"}>
            <Badge variant={"red"} size={"xs"} className={"shrink-0"}>
              {ERROR_SOURCE_INFO[errorSource].label}
            </Badge>
            {ERROR_SOURCE_INFO[errorSource].description}
          </div>
        </Section>
      )}

      {blocked && (
        <Section heading={"Blocked by"}>
          <BlockedByLink target={blocked} plain={selfScoped} />
        </Section>
      )}

      {errorDetail && (
        <Section heading={"Error detail"}>
          <Code dark small codeToCopy={errorDetail}>
            <pre className={"whitespace-pre-wrap break-all text-xs"}>
              {errorDetail}
            </pre>
          </Code>
        </Section>
      )}

      {hasPrompt && (
        <Section heading={"Prompt"}>
          <Code dark small codeToCopy={entry.prompt}>
            <pre className={"whitespace-pre-wrap text-xs"}>{entry.prompt}</pre>
          </Code>
        </Section>
      )}

      {!isDeny && hasBody && (
        <Section heading={"Completion"}>
          {hasCompletion ? (
            <Code dark small codeToCopy={entry.completion}>
              <pre className={"whitespace-pre-wrap text-xs"}>
                {entry.completion}
              </pre>
            </Code>
          ) : (
            <Muted>No response captured.</Muted>
          )}
        </Section>
      )}

      {!isDeny && !hasBody && (
        <Section heading={"Prompt & Response"}>
          <Muted>
            No prompt or response captured for this request — only metadata is
            recorded for non-completion calls (e.g. listing models) or when
            prompt collection is off.
          </Muted>
        </Section>
      )}

      <Section heading={"Metadata"}>
        <Code dark small codeToCopy={metadataJSON}>
          <Code.Line>{metadataJSON}</Code.Line>
        </Code>
      </Section>
    </div>
  );
}

// BlockedByLink points at the policy or global limit that blocked a request,
// styled like ReasonCell's authorising-policy link.
export function BlockedByLink({
  target,
  plain = false,
}: {
  target: BlockedByTarget;
  // Render the name without a link, for callers who can't open the target page.
  plain?: boolean;
}) {
  const Icon = target.kind === "policy" ? ShieldXIcon : GaugeIcon;
  const className =
    "group/policy inline-flex items-center gap-1.5 text-[0.82rem] text-nb-gray-300 whitespace-nowrap";
  const content = (
    <>
      <Icon
        size={13}
        className={cn(
          "shrink-0 text-nb-gray-500",
          !plain && "group-hover/policy:text-nb-gray-300",
        )}
      />
      <span className={cn(!plain && "group-hover/policy:underline")}>
        {target.name}
      </span>
    </>
  );
  return (
    <FullTooltip
      content={
        target.kind === "policy"
          ? "This policy blocked the request"
          : "This global limit blocked the request"
      }
    >
      {plain ? (
        <span className={className}>{content}</span>
      ) : (
        <Link
          href={target.href}
          onClick={(e) => e.stopPropagation()}
          className={cn(className, "hover:text-nb-gray-100 transition-colors")}
        >
          {content}
        </Link>
      )}
    </FullTooltip>
  );
}

function Section({
  heading,
  tooltip,
  children,
}: {
  heading: string;
  tooltip?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={"space-y-1.5"}>
      <div
        className={
          "flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-nb-gray-400"
        }
      >
        {heading}
        {tooltip && <HelpTooltip content={tooltip} />}
      </div>
      {children}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={
        "rounded-md border border-nb-gray-800 bg-nb-gray-900/30 p-3 text-xs text-nb-gray-400"
      }
    >
      {children}
    </div>
  );
}
