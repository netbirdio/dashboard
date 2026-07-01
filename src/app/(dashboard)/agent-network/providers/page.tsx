"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import { HelpTooltip } from "@components/HelpTooltip";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useCopyToClipboard from "@hooks/useCopyToClipboard";
import { Copy, ExternalLinkIcon, Globe, Plug } from "lucide-react";
import React, { Suspense, useState } from "react";
import AgentNetworkIcon from "@/assets/icons/AgentNetworkIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import PageContainer from "@/layouts/PageContainer";
import AgentConnectModal from "@/modules/agent-network/AgentConnectModal";
import AIProviderModal from "@/modules/agent-network/AIProviderModal";
import AIProvidersProvider, {
  useAIProviders,
} from "@/modules/agent-network/AIProvidersProvider";
import AgentProvidersTable from "@/modules/agent-network/table/AgentProvidersTable";
import InlineLink from "@components/InlineLink";

function EndpointBadge({ endpoint }: { endpoint: string }) {
  const [, copy] = useCopyToClipboard(`https://${endpoint}`);
  const [connectOpen, setConnectOpen] = useState(false);
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
      <button
        type={"button"}
        className={
          "inline-flex items-center gap-1.5 rounded-md border border-nb-gray-700 bg-nb-gray-800/60 px-2.5 py-1.5 text-[11px] font-medium text-nb-gray-200 hover:bg-nb-gray-800 hover:text-white transition-colors shrink-0"
        }
        onClick={() => setConnectOpen(true)}
        aria-label={"Agent config"}
      >
        <Plug size={12} />
        Agent Config
      </button>
      <AgentConnectModal
        open={connectOpen}
        onOpenChange={setConnectOpen}
        endpoint={endpoint}
      />
    </div>
  );
}

function EndpointHeader() {
  const { settings, settingsLoading, openWizard } = useAIProviders();
  if (settingsLoading) return null;
  if (!settings) {
    return (
      <button
        type={"button"}
        onClick={openWizard}
        className={
          "inline-flex items-center gap-3 rounded-lg border border-dashed border-nb-gray-800 bg-nb-gray-900/20 p-3 text-left hover:border-nb-gray-700 hover:bg-nb-gray-900/40 transition-colors cursor-pointer min-w-[300px]"
        }
      >
        <div
          className={
            "h-8 w-8 rounded-md bg-nb-gray-900 flex items-center justify-center shrink-0"
          }
        >
          <Globe size={14} className={"text-nb-gray-500"} />
        </div>
        <div className={"flex flex-col min-w-0"}>
          <div
            className={
              "text-[10px] text-nb-gray-500 uppercase tracking-wider font-medium inline-flex items-center gap-1.5"
            }
          >
            API Base URL
            <span onClick={(e) => e.stopPropagation()}>
              <HelpTooltip
                iconSize={11}
                content={
                  <>
                    Use this URL as the base URL when configuring your AI agents
                    or LLM SDK clients (e.g. OpenAI&apos;s
                    <code className={"font-mono"}> base_url</code>,
                    Anthropic&apos;s{" "}
                    <code className={"font-mono"}>baseURL</code>, or any HTTP
                    client). Calls hit NetBird first, get authorised by your
                    policies, and only then reach the upstream provider.
                  </>
                }
              />
            </span>
          </div>
          <span className={"text-xs text-nb-gray-400 leading-tight mt-0.5"}>
            Connect your first provider to set up your agent network endpoint.
          </span>
        </div>
      </button>
    );
  }
  return <EndpointBadge endpoint={settings.endpoint} />;
}

function PageBody({
  headingTarget,
}: {
  headingTarget: HTMLHeadingElement | null;
}) {
  const { isWizardOpen, closeWizard } = useAIProviders();

  return (
    <>
      <Suspense fallback={<SkeletonTable />}>
        <AgentProvidersTable headingTarget={headingTarget} />
      </Suspense>
      <AIProviderModal open={isWizardOpen} onOpenChange={closeWizard} />
    </>
  );
}

export default function AgentNetworkProvidersPage() {
  const { permission } = usePermissions();
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      {/* Gate the whole surface: AIProvidersProvider and EndpointHeader fetch
          agent-network state, so they must not mount for users without
          services.read. */}
      <RestrictedAccess
        page={"Providers"}
        hasAccess={permission?.services?.read}
      >
        <AIProvidersProvider>
          <div className={"p-default py-6"}>
            <Breadcrumbs>
              <Breadcrumbs.Item
                href={"/agent-network/providers"}
                label={"Agent Network"}
                icon={<AgentNetworkIcon size={16} />}
              />
              <Breadcrumbs.Item
                href={"/agent-network/providers"}
                label={"Providers"}
                active={true}
              />
            </Breadcrumbs>
            <h1 ref={headingRef}>Providers</h1>
            <Paragraph>
              Connect AI providers and gateways like LiteLLM, OpenAI, and
              Anthropic through one keyless endpoint, accessible only via
              NetBird’s tunnel.
              <InlineLink
                href={"https://docs.netbird.io/agent-network/providers"}
                target={"_blank"}
              >
                Learn more
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </Paragraph>
            <div className={"mt-4"}>
              <EndpointHeader />
            </div>
          </div>

          <PageBody headingTarget={portalTarget} />
        </AIProvidersProvider>
      </RestrictedAccess>
    </PageContainer>
  );
}
