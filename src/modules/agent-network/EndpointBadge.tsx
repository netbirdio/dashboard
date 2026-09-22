"use client";

import FeatureCard from "@components/FeatureCard";
import { HelpTooltip } from "@components/HelpTooltip";
import useCopyToClipboard from "@hooks/useCopyToClipboard";
import { CheckIcon, CopyIcon, GlobeIcon } from "lucide-react";
import React from "react";

// The tooltip is shared with the providers page's empty state, which shows the
// same card before an endpoint exists.
export const ENDPOINT_HELP_TEXT = (
  <>
    Use this URL as the base URL when configuring your AI agents or LLM SDK
    clients (e.g. OpenAI&apos;s
    <code className={"font-mono"}> base_url</code>, Anthropic&apos;s{" "}
    <code className={"font-mono"}>baseURL</code>, or any HTTP client). Calls hit
    NetBird first, get authorised by your policies, and only then reach the
    upstream provider.
  </>
);

// EndpointBadge is the "API Base URL" card — the one presentation of the
// endpoint everywhere it appears (providers page, Connect Agent). It shows the
// URL and copies it; the per-tool config that goes with it lives inline on the
// Connect Agent page, which is the only place it belongs.
export default function EndpointBadge({
  endpoint,
  variant = "default",
}: {
  // Bare endpoint host, e.g. "sailcloth.eu.proxy.netbird.io".
  endpoint: string;
  // "plain" drops the icon and shrinks the label, so the URL leads — the
  // shape the Connect Agent page wants, where the URL is the whole point.
  variant?: "default" | "plain";
}) {
  const [, copy, copied] = useCopyToClipboard(`https://${endpoint}`);

  return (
    <FeatureCard
      variant={variant}
      icon={<GlobeIcon size={16} />}
      title={
        <>
          API Base URL
          <HelpTooltip iconSize={11} content={ENDPOINT_HELP_TEXT} />
        </>
      }
      trailing={
        <button
          type={"button"}
          className={
            "inline-flex items-center gap-1.5 rounded-md border border-nb-gray-700 bg-nb-gray-800/60 px-2.5 py-1.5 text-[11px] font-medium text-nb-gray-200 hover:bg-nb-gray-800 hover:text-white transition-colors shrink-0"
          }
          onClick={() => copy("Endpoint copied to clipboard")}
          aria-label={"Copy endpoint"}
        >
          {copied ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
          Copy
        </button>
      }
      description={
        <code className={"font-mono !text-nb-gray-100 whitespace-nowrap"}>
          https://{endpoint}
        </code>
      }
    />
  );
}
