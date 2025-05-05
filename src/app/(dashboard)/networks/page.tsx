"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon } from "lucide-react";
import React, { Suspense } from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Network } from "@/interfaces/Network";
import PageContainer from "@/layouts/PageContainer";
import NetworksTable from "@/modules/networks/table/NetworksTable";

export default function Networks() {
  const { data: networks, isLoading } = useFetchApi<Network[]>("/networks");
  const { permission } = usePermissions();
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/networks"}
            label={"Networks"}
            icon={<NetworkRoutesIcon size={13} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Networks</h1>
        <Paragraph>
          Networks allow you to access internal resources in LANs and VPCs
          without installing NetBird on every machine.
        </Paragraph>
        <Paragraph>
          Learn more about
          <InlineLink
            href={"https://docs.netbird.io/how-to/networks"}
            target={"_blank"}
          >
            Networks
            <ExternalLinkIcon size={12} />
          </InlineLink>
          in our documentation.
        </Paragraph>
      </div>

      <RestrictedAccess hasAccess={permission.networks.read}>
        <Suspense fallback={<SkeletonTable />}>
          <NetworksTable
            data={networks}
            isLoading={isLoading}
            headingTarget={portalTarget}
          />
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
