"use client";

import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import { ExternalLinkIcon } from "lucide-react";
import React, { Suspense } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { useAgentNetworkText } from "@/modules/agent-network/agentNetworkText";
import PageContainer from "@/layouts/PageContainer";
import AgentPoliciesTable from "@/modules/agent-network/AgentPoliciesTable";
import AIProvidersProvider from "@/modules/agent-network/AIProvidersProvider";

export default function AgentNetworkPoliciesPage() {
  const translate = useTranslations();
  const { tr } = useAgentNetworkText();
  const { permission } = usePermissions();
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        {/* "Agent Policies", next to Networking's Access Control › Policies. */}
        <h1 ref={headingRef}>{translate("common.agentPolicies")}</h1>
        <Paragraph>{tr("agentNetwork.policiesIntro")}</Paragraph>
      </div>

      <RestrictedAccess
        page={translate("common.agentPolicies")}
        hasAccess={permission?.["agent_network.policies"]?.read}
      >
        <AIProvidersProvider>
          <Suspense fallback={<SkeletonTable />}>
            <AgentPoliciesTable headingTarget={portalTarget} />
          </Suspense>
        </AIProvidersProvider>
      </RestrictedAccess>
    </PageContainer>
  );
}
