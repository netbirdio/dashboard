"use client";

import { HelpTooltip } from "@components/HelpTooltip";
import useCopyToClipboard from "@hooks/useCopyToClipboard";
import { Copy } from "lucide-react";
import React from "react";

// EndpointBadge is the "API Base URL" card — the one presentation of the
// endpoint everywhere it appears (providers page, Connect Agent). It shows the
// URL and copies it; the per-tool config that goes with it lives inline on the
// Connect Agent page, which is the only place it belongs.
export default function EndpointBadge({
  endpoint,
}: {
  // Bare endpoint host, e.g. "sailcloth.eu.proxy.netbird.io".
  endpoint: string;
}) {
  const [, copy] = useCopyToClipboard(`https://${endpoint}`);
  return (
    <div
      className={
        "inline-flex items-center gap-3 rounded-lg border border-nb-gray-800 bg-nb-gray-900/40 p-3 min-w-[300px]"
      }
    >
      <div className={"flex flex-col"}>
        <div
          className={
            "text-[10px] text-nb-gray-400 uppercase tracking-wider font-medium inline-flex items-center gap-1.5"
          }
        >
          API Base URL
          <HelpTooltip
            iconSize={11}
            content={
              <>
                Use this URL as the base URL when configuring your AI agents or
                LLM SDK clients (e.g. OpenAI&apos;s
                <code className={"font-mono"}> base_url</code>, Anthropic&apos;s{" "}
                <code className={"font-mono"}>baseURL</code>, or any HTTP
                client). Calls hit NetBird first, get authorised by your
                policies, and only then reach the upstream provider.
              </>
            }
          />
        </div>
        <code
          className={
            "font-mono text-xs text-nb-gray-100 leading-tight mt-0.5 whitespace-nowrap"
          }
        >
          https://{endpoint}
        </code>
      </div>
      <button
        type={"button"}
        className={
          "inline-flex items-center gap-1.5 rounded-md border border-nb-gray-700 bg-nb-gray-800/60 px-2.5 py-1.5 text-[11px] font-medium text-nb-gray-200 hover:bg-nb-gray-800 hover:text-white transition-colors shrink-0"
        }
        onClick={() => copy("Endpoint copied to clipboard")}
        aria-label={"Copy endpoint"}
      >
        <Copy size={12} />
        Copy
      </button>
    </div>
  );
}
