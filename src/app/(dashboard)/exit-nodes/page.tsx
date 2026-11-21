"use client";

import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import { ExternalLinkIcon } from "lucide-react";
import React, { Suspense } from "react";
import PageContainer from "@/layouts/PageContainer";
import { EXIT_NODES_DOCS_URL } from "@/modules/exit-nodes/exitNodeHelpers";
import ExitNodesProvider from "@/modules/exit-nodes/ExitNodesProvider";
import ExitNodesTable from "@/modules/exit-nodes/table/ExitNodesTable";
import { useExitNodePermissions } from "@/modules/exit-nodes/useExitNodePermissions";

export default function ExitNodes() {
  const permission = useExitNodePermissions();
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <h1 ref={headingRef}>Exit Nodes</h1>
        <Paragraph>
          Route internet traffic through peers in your network. Add more than
          one peer for high availability and use access control policies to
          decide who can use each exit node.{" "}
          <InlineLink
            href={EXIT_NODES_DOCS_URL}
            target={"_blank"}
            aria-label={"Learn more about exit nodes"}
          >
            Learn more
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
      </div>

      <RestrictedAccess hasAccess={!!permission?.read}>
        <ExitNodesProvider>
          <Suspense fallback={<SkeletonTable />}>
            <ExitNodesTable headingTarget={portalTarget} />
          </Suspense>
        </ExitNodesProvider>
      </RestrictedAccess>
    </PageContainer>
  );
}
