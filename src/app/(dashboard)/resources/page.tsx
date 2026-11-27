"use client";

import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon } from "lucide-react";
import React, { Suspense, useMemo } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import ReverseProxiesProvider from "@/contexts/ReverseProxiesProvider";
import { Network, NetworkResource } from "@/interfaces/Network";
import PageContainer from "@/layouts/PageContainer";
import { NetworkAccessControlProvider } from "@/modules/networks/NetworkAccessControlProvider";
import { NetworkProvider } from "@/modules/networks/NetworkProvider";
import AllResourcesTable from "@/modules/networks/resources/AllResourcesTable";
import { resourcesWithNetwork } from "@/modules/networks/resources/resourcesWithNetwork";

export default function NetworkResources() {
  const { permission } = usePermissions();
  const { data: resources, isLoading: isResourcesLoading } = useFetchApi<
    NetworkResource[]
  >("/networks/resources");
  const { data: networks, isLoading: isNetworksLoading } =
    useFetchApi<Network[]>("/networks");
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  const rows = useMemo(
    () => resourcesWithNetwork(resources, networks),
    [resources, networks],
  );

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <h1 ref={headingRef}>Resources</h1>
        <Paragraph>
          All resources across your networks: the hosts, subnets and domains
          your peers can reach.{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/networks#resources"}
            target={"_blank"}
          >
            Learn more
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
      </div>

      <RestrictedAccess hasAccess={permission.networks.read}>
        <Suspense fallback={<SkeletonTable />}>
          <ReverseProxiesProvider>
            <NetworkAccessControlProvider>
              <NetworkProvider>
                <AllResourcesTable
                  resources={rows}
                  networks={networks}
                  isLoading={isResourcesLoading || isNetworksLoading}
                  headingTarget={portalTarget}
                />
              </NetworkProvider>
            </NetworkAccessControlProvider>
          </ReverseProxiesProvider>
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
