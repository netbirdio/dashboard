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
import { T, useTranslation } from "@/i18n/useTranslation";
import { NameserverGroup } from "@/interfaces/Nameserver";
import PageContainer from "@/layouts/PageContainer";

const NameserverGroupTable = lazy(
  () => import("@/modules/dns/nameservers/table/NameserverGroupTable"),
);

export default function NameServers() {
  const { t } = useTranslation();
  const { permission } = usePermissions();

  const { data: nameserverGroups, isLoading } =
    useFetchApi<NameserverGroup[]>("/dns/nameservers");

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/dns/nameservers"}
            label={t("DNS")}
            icon={<DNSIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/dns/nameservers"}
            label={t("Nameservers")}
            active
            icon={<DNSIcon size={13} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>
          <T>{"Nameservers"}</T>
        </h1>
        <Paragraph>
          <T>
            {
              "Add nameservers for domain name resolution in your NetBird network."
            }
          </T>{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/manage-dns-in-your-network"}
            target={"_blank"}
          >
            <T>{"Learn more"}</T>
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
      </div>

      <RestrictedAccess
        page={t("Nameservers")}
        hasAccess={permission.nameservers.read}
      >
        <Suspense fallback={<SkeletonTable />}>
          <NameserverGroupTable
            nameserverGroups={nameserverGroups}
            isLoading={isLoading}
            headingTarget={portalTarget}
          />
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
