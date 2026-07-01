"use client";

import Code from "@components/Code";
import { HelpTooltip } from "@components/HelpTooltip";
import * as React from "react";
import {
  AIAccessLogEntry,
  formatDenyReason,
} from "@/modules/agent-network/data/mockData";

type Props = {
  entry: AIAccessLogEntry;
};

/**
 * Expanded row for the Agent Network access log. Mirrors the layout of
 * the Proxy Events expanded row: stacked sections with copyable Code
 * blocks. Surfaces the prompt and completion when captured, the deny
 * reason for blocked requests, and the per-request metadata.
 */
export default function AgentAccessLogExpandedRow({ entry }: Readonly<Props>) {
  const isDeny = entry.decision === "deny";
  const hasSession = Boolean(entry.sessionId);
  const hasPrompt = Boolean(entry.prompt);
  const hasCompletion = Boolean(entry.completion);
  const hasBody = hasPrompt || hasCompletion;
  const denyReason = formatDenyReason(entry.denyReason);

  const metadata: Record<string, string> = {
    "plg.llm.provider": entry.providerId,
    "plg.llm.model": entry.model,
    "plg.llm.input_tokens": String(entry.inputTokens),
    "plg.llm.output_tokens": String(entry.outputTokens),
    "plg.llm.total_tokens": String(entry.inputTokens + entry.outputTokens),
    "plg.llm.cost_usd": entry.costUsd.toFixed(6),
    "plg.llm.stream": entry.stream ? "true" : "false",
    "plg.agentnetwork.policy_name": entry.policyName,
    "plg.agentnetwork.user_groups": (entry.userGroups ?? []).join(", "),
  };
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
