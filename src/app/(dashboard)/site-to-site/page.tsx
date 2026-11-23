"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon } from "lucide-react";
import React, { Suspense } from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import PoliciesProvider from "@/contexts/PoliciesProvider";
import { SiteToSiteConnection } from "@/interfaces/SiteToSite";
import PageContainer from "@/layouts/PageContainer";
import { SITE_TO_SITE_DOCS_LINK } from "@/modules/site-to-site/siteToSite";
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
  const count = connections?.length ?? 0;
  const title =
    count > 0
      ? `${count} Site-to-Site Connection${count === 1 ? "" : "s"}`
      : "Site-to-Site Connections";

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
        <h1>{title}</h1>
        <Paragraph>
          Let hosts in one network reach resources in another, through each
          network&apos;s routing peers. Each connection comes from the access
          control policies between the two networks.{" "}
          <InlineLink href={SITE_TO_SITE_DOCS_LINK} target={"_blank"}>
            Learn more
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
      </div>

      <RestrictedAccess
        hasAccess={!!permission.networks.read && !!permission.policies.read}
      >
        <PoliciesProvider>
          <SiteToSiteProvider>
            <Suspense fallback={<SkeletonTable />}>
              <SiteToSiteTable data={connections} isLoading={isLoading} />
            </Suspense>
          </SiteToSiteProvider>
        </PoliciesProvider>
      </RestrictedAccess>
    </PageContainer>
  );
}
