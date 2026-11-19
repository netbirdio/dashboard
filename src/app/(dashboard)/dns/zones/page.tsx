"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import DNSIcon from "@/assets/icons/DNSIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { DNS_ZONE_DOCS_LINK, DNSZone } from "@/interfaces/DNS";
import PageContainer from "@/layouts/PageContainer";
import { DNSZonesProvider } from "@/modules/dns/zones/DNSZonesProvider";
import DNSZoneIcon from "@/assets/icons/DNSZoneIcon";

const DNSZonesTable = lazy(
  () => import("@/modules/dns/zones/table/DNSZonesTable"),
);

export default function DNSZonePage() {
  const t = useTranslations();
  const { permission } = usePermissions();

  const { data: zones, isLoading } = useFetchApi<DNSZone[]>("/dns/zones");

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item label={"DNS"} icon={<DNSIcon size={13} />} />
          <Breadcrumbs.Item
            href={"/dns/zones"}
            label={t("common.zones")}
            active
            icon={<DNSZoneIcon size={16} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>{t("common.zones")}</h1>
        <Paragraph>
          Manage DNS zones to control domain name resolution for your network.{" "}
          <InlineLink href={DNS_ZONE_DOCS_LINK} target={"_blank"}>
            {t("common.learnMore")}
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
      </div>

      <RestrictedAccess page={t("dns.dnsZones")} hasAccess={permission?.dns?.read}>
        <Suspense fallback={<SkeletonTable />}>
          <DNSZonesProvider>
            <DNSZonesTable
              isLoading={isLoading}
              headingTarget={portalTarget}
              data={zones}
            />
          </DNSZonesProvider>
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
