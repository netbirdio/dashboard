"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import { Callout } from "@components/Callout";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { ArrowUpRightIcon, ExternalLinkIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import PeersProvider from "@/contexts/PeersProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import RoutesProvider from "@/contexts/RoutesProvider";
import { Route } from "@/interfaces/Route";
import PageContainer from "@/layouts/PageContainer";
import useGroupedRoutes from "@/modules/route-group/useGroupedRoutes";

const NetworkRoutesTable = lazy(
  () => import("@/modules/route-group/NetworkRoutesTable"),
);

export default function NetworkRoutes() {
  const { permission } = usePermissions();
  const { data: routes, isLoading } = useFetchApi<Route[]>("/routes");
  const groupedRoutes = useGroupedRoutes({ routes });

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

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
            <h1 ref={headingRef}>Network Routes</h1>
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

            <Callout className={"max-w-xl mt-3"} variant={"warning"}>
              <span>
                We recommend using the new Networks concept to easier visualise
                and manage access to your resources.{" "}
                <InlineLink href={"/networks"}>
                  Go to Networks
                  <ArrowUpRightIcon size={14} />
                </InlineLink>
              </span>
            </Callout>
          </div>

          <RestrictedAccess hasAccess={permission.routes.read}>
            <Suspense fallback={<SkeletonTable />}>
              <NetworkRoutesTable
                isLoading={isLoading}
                groupedRoutes={groupedRoutes}
                routes={routes}
                headingTarget={portalTarget}
              />
            </Suspense>
          </RestrictedAccess>
        </PeersProvider>
      </RoutesProvider>
    </PageContainer>
  );
}
