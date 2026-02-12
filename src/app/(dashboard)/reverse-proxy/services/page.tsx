"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import { ExternalLinkIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import ReverseProxiesProvider from "@/contexts/ReverseProxiesProvider";
import { REVERSE_PROXY_DOCS_LINK } from "@/interfaces/ReverseProxy";
import PageContainer from "@/layouts/PageContainer";
import { Callout } from "@components/Callout";

const ReverseProxyTable = lazy(
  () => import("@/modules/reverse-proxy/table/ReverseProxyTable"),
);

export default function ReverseProxyServicesPage() {
  const { permission } = usePermissions();

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/reverse-proxy/services"}
            label={"Reverse Proxy"}
            icon={<ReverseProxyIcon size={16} />}
          />
          <Breadcrumbs.Item
            href={"/reverse-proxy/services"}
            label={"Services"}
            active={true}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Services</h1>
        <Paragraph>
          Expose services securely through NetBird&apos;s reverse proxy.
        </Paragraph>
        <Paragraph>
          Learn more about
          <InlineLink href={REVERSE_PROXY_DOCS_LINK} target={"_blank"}>
            Services
            <ExternalLinkIcon size={12} />
          </InlineLink>
          in our documentation.
        </Paragraph>

        <Callout className={"max-w-xl mt-5"} variant={"info"}>
          NetBird&apos;s Reverse Proxy is currently in beta and available at no
          cost during this period. Features, functionality, and pricing are
          subject to change upon release.
        </Callout>
      </div>

      <RestrictedAccess page={"Services"} hasAccess={permission?.services?.read}>
        <ReverseProxiesProvider>
          <Suspense fallback={<SkeletonTable />}>
            <ReverseProxyTable headingTarget={portalTarget} />
          </Suspense>
        </ReverseProxiesProvider>
      </RestrictedAccess>
    </PageContainer>
  );
}
