"use client";

import Breadcrumbs from "@components/Breadcrumbs";
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
import AgentPoliciesTable from "@/modules/agent-network/AgentPoliciesTable";
import AIProvidersProvider from "@/modules/agent-network/AIProvidersProvider";

export default function AgentNetworkPoliciesPage() {
  const { permission } = usePermissions();
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/agent-network/providers"}
            label={"Agent Network"}
            icon={<AgentNetworkIcon size={16} />}
          />
          <Breadcrumbs.Item
            href={"/agent-network/policies"}
            label={"Policies"}
            active={true}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Policies</h1>
        <Paragraph>
          Bind IdP groups to providers: Engineering gets Claude, Finance
          doesn&apos;t. Enforce token limits, budgets, and guardrails.
        </Paragraph>
      </div>

      <RestrictedAccess
        page={"Policies"}
        hasAccess={permission?.services?.read}
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
