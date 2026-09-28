"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import FeatureCard from "@components/FeatureCard";
import { HelpTooltip } from "@components/HelpTooltip";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import { ExternalLinkIcon } from "lucide-react";
import React, { Suspense } from "react";
import AgentNetworkIcon from "@/assets/icons/AgentNetworkIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import PageContainer from "@/layouts/PageContainer";
import AIProviderModal from "@/modules/agent-network/AIProviderModal";
import AIProvidersProvider, {
  useAIProviders,
} from "@/modules/agent-network/AIProvidersProvider";
import EndpointBadge, {
  ENDPOINT_HELP_TEXT,
} from "@/modules/agent-network/EndpointBadge";
import AgentProvidersTable from "@/modules/agent-network/table/AgentProvidersTable";

function EndpointHeader() {
  const { settings, settingsLoading, openWizard } = useAIProviders();
  const { permission } = usePermissions();
  if (settingsLoading) return null;
  if (!settings) {
    // The bootstrap CTA opens the provider wizard, so only callers who can
    // actually connect a provider get it; read-only viewers (usage_viewer)
    // see nothing until an admin sets the endpoint up.
    if (!permission?.["agent_network.providers"]?.create) return null;
    return (
      <FeatureCard
        variant={"plain"}
        onClick={openWizard}
        className={
          "border-dashed bg-nb-gray-900/20 hover:border-nb-gray-700 hover:bg-nb-gray-900/40"
        }
        title={
          <>
            API Base URL
            <span onClick={(e) => e.stopPropagation()}>
              <HelpTooltip iconSize={11} content={ENDPOINT_HELP_TEXT} />
            </span>
          </>
        }
        description={
          "Connect your first provider to set up your agent network endpoint."
        }
      />
    );
  }
  return <EndpointBadge endpoint={settings.endpoint} variant={"plain"} />;
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
          read on the providers submodule. */}
      <RestrictedAccess
        page={"Providers"}
        hasAccess={permission?.["agent_network.providers"]?.read}
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
            {/* Same 24px step the users and activity pages put between their
                description and the card below it. */}
            <div className={"mt-6"}>
              <EndpointHeader />
            </div>
          </div>

          <PageBody headingTarget={portalTarget} />
        </AIProvidersProvider>
      </RestrictedAccess>
    </PageContainer>
  );
}
