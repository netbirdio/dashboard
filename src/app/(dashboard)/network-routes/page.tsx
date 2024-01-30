"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import PeersProvider from "@/contexts/PeersProvider";
import RoutesProvider from "@/contexts/RoutesProvider";
import { Route } from "@/interfaces/Route";
import PageContainer from "@/layouts/PageContainer";
import useGroupedRoutes from "@/modules/route-group/useGroupedRoutes";

const NetworkRoutesTable = lazy(
  () => import("@/modules/route-group/NetworkRoutesTable"),
);

export default function NetworkRoutes() {
  const { data: routes, isLoading } = useFetchApi<Route[]>("/routes");
  const groupedRoutes = useGroupedRoutes({ routes });

  return (
    <PageContainer>
      <RoutesProvider>
        <PeersProvider>
          <div className={"p-default py-6"}>
            <Breadcrumbs>
              <Breadcrumbs.Item
                href={"/network-routes"}
                label={"Network Routes"}
                icon={<NetworkRoutesIcon size={13} />}
              />
            </Breadcrumbs>
            <h1>
              {groupedRoutes && groupedRoutes.length > 1
                ? `${groupedRoutes.length} Network Routes`
                : "Network Routes"}
            </h1>
            <Paragraph>
              Network routes allow you to access other networks like LANs and
              VPCs without installing NetBird on every resource.
            </Paragraph>
            <Paragraph>
              Learn more about
              <InlineLink
                href={
                  "https://docs.netbird.io/how-to/routing-traffic-to-private-networks"
                }
                target={"_blank"}
              >
                Network Routes
                <ExternalLinkIcon size={12} />
              </InlineLink>
              in our documentation.
            </Paragraph>
          </div>

          <RestrictedAccess>
            <Suspense fallback={<SkeletonTable />}>
              <NetworkRoutesTable
                isLoading={isLoading}
                groupedRoutes={groupedRoutes}
                routes={routes}
              />
            </Suspense>
          </RestrictedAccess>
        </PeersProvider>
      </RoutesProvider>
    </PageContainer>
  );
}
