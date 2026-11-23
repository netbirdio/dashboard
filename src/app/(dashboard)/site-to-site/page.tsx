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
import { SiteToSiteConnection } from "@/interfaces/SiteToSite";
import PageContainer from "@/layouts/PageContainer";
import { SiteToSiteProvider } from "@/modules/site-to-site/SiteToSiteProvider";
import SiteToSiteTable from "@/modules/site-to-site/SiteToSiteTable";

export default function SiteToSite() {
  const { permission } = usePermissions();
  const { data: connections, isLoading } = useFetchApi<SiteToSiteConnection[]>(
    "/networks/site-to-site",
    false,
    true,
    !!permission.networks.read,
  );
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            label={"Network Routing"}
            icon={<NetworkRoutesIcon size={13} />}
          />
          <Breadcrumbs.Item href={"/site-to-site"} label={"Site-to-Site"} />
        </Breadcrumbs>
        <h1 ref={headingRef}>Site-to-Site</h1>
        <Paragraph>
          Connect networks so resources in one can reach resources in another,
          through a routing peer on each side.{" "}
          <InlineLink
            href={"https://docs.netbird.io/manage/networks"}
            target={"_blank"}
          >
            Learn more
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
      </div>

      <RestrictedAccess
        hasAccess={!!permission.networks.read && !!permission.policies.read}
      >
        <SiteToSiteProvider>
          <Suspense fallback={<SkeletonTable />}>
            <SiteToSiteTable
              data={connections}
              isLoading={isLoading}
              headingTarget={portalTarget}
            />
          </Suspense>
        </SiteToSiteProvider>
      </RestrictedAccess>
    </PageContainer>
  );
}
