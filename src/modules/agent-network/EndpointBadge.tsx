"use client";

import FeatureCard from "@components/FeatureCard";
import { HelpTooltip } from "@components/HelpTooltip";
import useCopyToClipboard from "@hooks/useCopyToClipboard";
import { CheckIcon, CopyIcon, GlobeIcon } from "lucide-react";
import React from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { useAgentNetworkText } from "@/modules/agent-network/agentNetworkText";

// The tooltip is shared with the providers page's empty state, which shows the
// same card before an endpoint exists.
export function EndpointHelpText() {
  const { rich } = useAgentNetworkText();
  return rich("agentNetwork.endpointHelp", {
    baseUrl: () => <code className={"font-mono"}>base_url</code>,
    baseURL: () => <code className={"font-mono"}>baseURL</code>,
  });
}



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
  const t = useTranslations();
  const { tr } = useAgentNetworkText();
  const [, copy, copied] = useCopyToClipboard(`https://${endpoint}`);

  return (
    <FeatureCard
      variant={variant}
      // The card widens with the URL instead of stopping at FeatureCard's
      // default cap, which let a long endpoint run under the copy button.
      className={"max-w-fit"}
      icon={<GlobeIcon size={16} />}
      title={
        <>
          {tr("agentNetwork.apiBaseUrl")}
          <HelpTooltip iconSize={11} content={<EndpointHelpText />} />
        </>
      }
      trailing={
        <button
          type={"button"}
          className={
            "inline-flex items-center gap-1.5 rounded-md border border-nb-gray-700 bg-nb-gray-800/60 px-2.5 py-1.5 text-[11px] font-medium text-nb-gray-200 hover:bg-nb-gray-800 hover:text-white transition-colors shrink-0"
          }
          onClick={() => copy(tr("agentNetwork.endpointCopied"))}
          aria-label={tr("agentNetwork.copyEndpoint")}
        >
          {copied ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
          {t("common.copy")}
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
